import 'server-only';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { verifyOrderAccess } from './order-access';
import type { Order,OrderItem,Shipment } from '@/types/database';
export async function getAccessibleOrder(orderNumber:string,token:string){
  if(!/^WK-\d{5,12}$/.test(orderNumber)||!/^[a-f0-9]{64}$/.test(token))return null;
  const db=getAdminSupabase();const {data,error}=await db.from('orders').select('*').eq('order_number',orderNumber).maybeSingle();
  if(error)throw error;if(!data||!verifyOrderAccess(data as Order,token))return null;
  const [items,shipments]=await Promise.all([db.from('order_items').select('*').eq('order_id',data.id),db.from('shipments').select('*').eq('order_id',data.id).order('created_at',{ascending:false})]);
  if(items.error||shipments.error)throw new Error('ORDER_DETAILS');return {order:data as Order,items:items.data as OrderItem[],shipments:shipments.data as Shipment[]};
}
export function safeTrackingUrl(value:string|null):string|null{if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
