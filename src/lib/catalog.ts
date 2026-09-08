import 'server-only';
import { cache } from 'react';
import { getAdminSupabase } from './supabase/admin';
import { hasDatabase } from './env';
import type { Product, SiteSettings } from '@/types/catalog';
import type { SiteSettings as DatabaseSettings } from '@/types/database';
export const getRawSettings = cache(async ():Promise<DatabaseSettings | null>=>{
  if(!hasDatabase())return null;
  const {data,error}=await getAdminSupabase().from('site_settings').select('*').eq('id',true).single();
  if(error)throw new Error('SETTINGS_UNAVAILABLE');return data as DatabaseSettings;
});
export const getCatalog = cache(async ():Promise<Product[]>=>{
  if(!hasDatabase())return [];
  const {data,error}=await getAdminSupabase().from('products').select('id,name,slug,description,short_description,featured,active,image_url,variants:product_variants(id,product_id,sku,name,price_chf_cents,active,stock_mode)').eq('active',true).order('display_order');
  if(error)throw new Error('CATALOG_UNAVAILABLE');
  return (data as Product[]).map(p=>({...p,variants:p.variants.filter(v=>v.active)}));
});
export const getSiteSettings = cache(async ():Promise<SiteSettings>=>{
  const s=await getRawSettings();
  const {data:claims,error}=s?await getAdminSupabase().from('verified_claims').select('id,title,description,active').eq('active',true):{data:[],error:null};
  if(error)throw new Error('CLAIMS_UNAVAILABLE');
  return {
    shop_maintenance:s?.shop_maintenance??true,support_email:s?.support_email||process.env.SUPPORT_EMAIL||'',
    shipping_text:s?.default_shipping_text||'',
    shipping_origin:s?.shipping_origin_text||'',shipping_cost_cents:s?.shipping_cost_cents??null,
    company_name:s?.business_name||'',company_address:s?.business_address||'',company_postcode_city:s?.business_postal_city||'',
    swiss_shop_verified:s?.swiss_shop_verified??false,product_safety_text:s?.product_safety_text||'',product_reuse_text:s?.product_use_text||'',
    verified_claims:claims||[],
  };
});
