import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { formatCHF } from '@/lib/status';
export default async function AdminPage(){
  await requireAdmin();const {data,error}=await getAdminSupabase().rpc('dashboard_metrics');if(error)throw new Error('DASHBOARD_UNAVAILABLE');
  const metrics=[['Bestellungen heute',data.orders_today],['Umsatz heute',formatCHF(data.revenue_today_cents)],['Offene Bestellungen',data.open_orders],['Fulfillment-Fehler',data.fulfillment_errors],['Versendete Bestellungen',data.shipped_orders]];
  return <><AdminNav/><h1>Dein Shop. Im Blick.</h1><p>Heute nach Schweizer Zeit. Umsatz aus bezahlten Bestellungen.</p><div className="admin-metrics">{metrics.map(([label,value])=><div key={label} className="admin-card"><span>{label}</span><strong>{value}</strong></div>)}</div></>;
}
