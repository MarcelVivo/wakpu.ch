import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { hasDatabase } from '@/lib/env';
import { buildOrderStatusUrl } from '@/lib/services/order-access';
import type { Order } from '@/types/database';
import { CheckoutComplete } from './refresh';
export const metadata:Metadata={title:'Bestellung empfangen',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function CheckoutSuccess({searchParams}:{searchParams:Promise<{session_id?:string}>}){
  const {session_id}=await searchParams;let order:Order|null=null;
  if(session_id&&/^cs_(test_|live_)?[A-Za-z0-9_]{20,255}$/.test(session_id)&&hasDatabase()){
    const {data,error}=await getAdminSupabase().from('orders').select('*').eq('stripe_checkout_session_id',session_id).maybeSingle();if(error)throw error;order=data as Order|null;
  }
  const paid=order?.payment_status==='paid'||order?.payment_status==='refunded';
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">DANKE FÜR DEINEN WAKPU-MOMENT</p><h1>{paid?'Dein WAKPU ist bestellt.':'Wir prüfen deine Zahlung.'}</h1><p>{paid?`Deine Bestellnummer: ${order?.order_number}. Die Bestätigung wird an deine E-Mail-Adresse gesendet.`:'Sobald die Zahlungsbestätigung eingetroffen ist, findest du hier deinen Bestellstatus.'}</p><CheckoutComplete paid={Boolean(paid)} valid={Boolean(session_id)}/>{paid&&order&&<Link className="button button-dark" href={buildOrderStatusUrl(order)}>Bestellung ansehen</Link>}<p><Link href="/">Zurück zum Shop</Link></p></main>;
}
