import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { hasDatabase } from '@/lib/env';
import { buildOrderStatusUrl } from '@/lib/services/order-access';
import type { Order } from '@/types/database';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
import { CheckoutComplete } from './refresh';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  return {title:getDictionary(lang).checkoutSuccess.title,robots:{index:false,follow:false},referrer:'no-referrer'};
}
export default async function CheckoutSuccess({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{session_id?:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const {session_id}=await searchParams;let order:Order|null=null;
  if(session_id&&/^cs_(test_|live_)?[A-Za-z0-9_]{20,255}$/.test(session_id)&&hasDatabase()){
    const {data,error}=await getAdminSupabase().from('orders').select('*').eq('stripe_checkout_session_id',session_id).maybeSingle();if(error)throw error;order=data as Order|null;
  }
  const paid=order?.payment_status==='paid'||order?.payment_status==='refunded';
  const dict=getDictionary(lang).checkoutSuccess;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{paid?dict.titlePaid:dict.titlePending}</h1><p>{paid?dict.textPaid(order?.order_number||''):dict.textPending}</p><CheckoutComplete paid={Boolean(paid)} valid={Boolean(session_id)} locale={lang}/>{paid&&order&&<Link className="button button-dark" href={buildOrderStatusUrl(order)}>{dict.viewOrder}</Link>}<p><Link href={`/${lang}`}>{dict.backToShop}</Link></p></main>;
}
