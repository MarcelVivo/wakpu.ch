import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { formatCHF,formatDate,statusLabel } from '@/lib/status';
import type { Order,Shipment } from '@/types/database';
export default async function OrdersPage({searchParams}:{searchParams:Promise<{page?:string}>}){
  await requireAdmin();const p=await searchParams;const page=Math.max(1,Math.min(100000,Number.parseInt(p.page||'1')||1));
  const {data,error,count}=await getAdminSupabase().from('orders').select('*,shipments(tracking_number,carrier)',{count:'exact'}).order('created_at',{ascending:false}).range((page-1)*25,page*25-1);if(error)throw new Error('ORDERS_UNAVAILABLE');
  return <><AdminNav/><p className="eyebrow">{count||0} INSGESAMT</p><h1>Bestellungen.</h1><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Bestellung</th><th>Datum</th><th>Kunde</th><th>Total</th><th>Zahlung</th><th>Fulfillment</th><th>Tracking</th></tr></thead><tbody>{(data as (Order&{shipments:Pick<Shipment,'tracking_number'|'carrier'>[]})[]).map(o=><tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}>{o.order_number}</Link></td><td>{formatDate(o.created_at)}</td><td>{o.email||'Checkout offen'}</td><td>{formatCHF(o.total_cents)}</td><td><span className="status-pill" data-status={o.payment_status}>{statusLabel(o.payment_status)}</span></td><td><span className="status-pill" data-status={o.fulfillment_status}>{statusLabel(o.fulfillment_status)}</span></td><td>{o.shipments.map(s=>s.tracking_number).join(', ')||'–'}</td></tr>)}</tbody></table>{!data.length&&<p className="admin-card">Noch keine Bestellungen.</p>}</div><div className="admin-pagination">{page>1&&<Link href={`/admin/orders?page=${page-1}`}>← Zurück</Link>}{(count||0)>page*25&&<Link href={`/admin/orders?page=${page+1}`}>Weitere Bestellungen →</Link>}</div></>;
}
