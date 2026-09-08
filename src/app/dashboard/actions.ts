'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, adminEmails } from '@/lib/auth/admin';
import { getServerSupabase } from '@/lib/supabase/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { retryFulfillment,simulateShipped,markManualReview,processFulfillmentJobs } from '@/lib/services/fulfillment';
import { processEmailJobs } from '@/lib/services/email';
import { getResend,isEmailConfigured } from '@/lib/resend/client';
import { renderWaitlistLaunchEmail } from '@/lib/resend/templates';
import { siteUrl } from '@/lib/env';
import { isLocale } from '@/i18n/locales';
export async function login(form:FormData) {
  const parsed=z.object({email:z.email(),password:z.string().min(1).max(512)}).safeParse(Object.fromEntries(form));
  if(!parsed.success)redirect('/dashboard/login?status=error');
  if(!adminEmails().includes(parsed.data.email.toLowerCase()))redirect('/dashboard/login?status=error');
  let success=false;
  try{const auth=await getServerSupabase();const {data,error}=await auth.auth.signInWithPassword(parsed.data);success=!error&&Boolean(data.user?.email_confirmed_at);}catch{}
  if(!success)redirect('/dashboard/login?status=error');redirect('/dashboard');
}
export async function logout(){const auth=await getServerSupabase();await auth.auth.signOut();redirect('/dashboard/login');}
export async function requestPasswordReset(form:FormData){
  const parsed=z.object({email:z.email()}).safeParse(Object.fromEntries(form));
  if(!parsed.success)redirect('/dashboard/forgot-password?status=error');
  try{const auth=await getServerSupabase();await auth.auth.resetPasswordForEmail(parsed.data.email,{redirectTo:`${siteUrl()}/dashboard/auth/callback?next=/dashboard/reset-password`});}catch{}
  redirect('/dashboard/forgot-password?status=sent');
}
export async function updatePassword(form:FormData){
  const parsed=z.object({password:z.string().min(8).max(128)}).safeParse(Object.fromEntries(form));
  if(!parsed.success)redirect('/dashboard/reset-password?status=error');
  const auth=await getServerSupabase();
  const {data:{user}}=await auth.auth.getUser();
  if(!user||!adminEmails().includes(user.email?.toLowerCase()??''))redirect('/dashboard/login?status=error');
  const {error}=await auth.auth.updateUser({password:parsed.data.password});
  if(error)redirect('/dashboard/reset-password?status=error');
  redirect('/dashboard?status=saved');
}
async function audit(userId:string,action:string,entityId:string){
  const {error}=await getAdminSupabase().from('admin_logs').insert({admin_user_id:userId,action,entity_type:'admin',entity_id:entityId,details:{}});if(error)throw error;
}
export async function orderAction(form:FormData){
  const user=await requireAdmin();
  const parsed=z.object({id:z.uuid(),action:z.enum(['retry','review','ship'])}).safeParse(Object.fromEntries(form));
  if(!parsed.success)redirect('/dashboard/orders?status=error');
  const {id,action}=parsed.data;let success=false;
  try{
    await audit(user.id,`order.${action}.requested`,id);
    if(action==='retry'){await retryFulfillment(id);await processFulfillmentJobs();}
    if(action==='review')await markManualReview(id);
    if(action==='ship')await simulateShipped(id);
    await processEmailJobs();success=true;
  }catch{}
  revalidatePath('/dashboard');revalidatePath(`/dashboard/orders/${id}`);redirect(`/dashboard/orders/${id}?status=${success?'saved':'error'}`);
}
export async function saveProduct(form:FormData){
  const user=await requireAdmin();
  const parsed=z.object({id:z.uuid(),variant_id:z.uuid(),name:z.string().min(1).max(120),description:z.string().max(5000),short_description:z.string().max(300),sku:z.string().min(1).max(120),supplier_sku:z.string().max(120),price_chf_cents:z.coerce.number().int().min(1).max(1000000),stock_mode:z.enum(['available','preorder','out_of_stock'])}).safeParse(Object.fromEntries([...form].filter(([key])=>!['active','featured'].includes(key))));
  if(!parsed.success)redirect('/dashboard/products?status=error');
  let success=false;
  try{
    const p=parsed.data;await audit(user.id,'product.update.requested',p.id);
    const {error}=await getAdminSupabase().rpc('admin_update_product',{p_product_id:p.id,p_variant_id:p.variant_id,p_name:p.name,p_description:p.description,p_short_description:p.short_description,p_active:form.get('active')==='on',p_featured:form.get('featured')==='on',p_sku:p.sku,p_supplier_sku:p.supplier_sku||null,p_price_chf_cents:p.price_chf_cents,p_stock_mode:p.stock_mode});if(error)throw error;success=true;
  }catch{}
  revalidatePath('/');revalidatePath('/dashboard/products');redirect(`/dashboard/products?status=${success?'saved':'error'}`);
}
export async function notifyWaitlist(){
  const user=await requireAdmin();
  let sent=0;let success=false;
  try{
    await audit(user.id,'waitlist.notify.requested','waitlist');
    const db=getAdminSupabase();
    const {data:rows,error}=await db.from('waitlist_signups').select('id,email,locale').not('confirmed_at','is',null).is('notified_at',null).limit(500);
    if(error)throw error;
    if(isEmailConfigured()){
      for(const row of rows??[]){
        try{
          const locale=isLocale(row.locale)?row.locale:'de';
          const message=renderWaitlistLaunchEmail(`${siteUrl()}/${locale}`,locale);
          const response=await getResend().emails.send({from:process.env.RESEND_FROM_EMAIL!,to:row.email,...message},{idempotencyKey:`wakpu-waitlist-launch/${row.id}`});
          if(!response.error){await db.from('waitlist_signups').update({notified_at:new Date().toISOString()}).eq('id',row.id);sent++;}
        }catch{}
      }
    }
    success=true;
  }catch{}
  revalidatePath('/dashboard/waitlist');redirect(`/dashboard/waitlist?status=${success?'saved':'error'}&sent=${sent}`);
}
export async function saveSettings(form:FormData){
  const user=await requireAdmin();
  const booleanFields=['fulfillment_enabled','shop_maintenance','legal_ready','swiss_shop_verified'];
  const textFields=['default_shipping_text','shipping_origin_text','support_email','business_name','business_address','business_postal_city','product_safety_text','product_use_text','legal_terms','privacy_notice'];
  const payload:Record<string,string|number|boolean>={};
  for(const field of booleanFields)payload[field]=form.get(field)==='on';
  for(const field of textFields)payload[field]=String(form.get(field)||'').trim();
  payload.max_supplier_order_cost_cents=Number(form.get('max_supplier_order_cost_cents'));payload.shipping_cost_cents=Number(form.get('shipping_cost_cents'));
  if(!Number.isSafeInteger(payload.max_supplier_order_cost_cents)||Number(payload.max_supplier_order_cost_cents)<0||Number(payload.max_supplier_order_cost_cents)>2147483647||!Number.isSafeInteger(payload.shipping_cost_cents)||Number(payload.shipping_cost_cents)<0||Number(payload.shipping_cost_cents)>2147483647||String(payload.default_shipping_text).length>1200||textFields.some(f=>String(payload[f]).length>30000)||(payload.support_email&&!z.email().safeParse(payload.support_email).success))redirect('/dashboard/settings?status=error');
  let success=false;
  try{await audit(user.id,'settings.update.requested','site');const {error}=await getAdminSupabase().from('site_settings').update(payload).eq('id',true);if(error)throw error;success=true;}catch{}
  revalidatePath('/');revalidatePath('/dashboard/settings');redirect(`/dashboard/settings?status=${success?'saved':'error'}`);
}
