import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { formatCHF } from '@/lib/status';
import { ShoppingBag, Banknote, PackageOpen, AlertTriangle, Truck } from 'lucide-react';
export default async function AdminPage(){
  await requireAdmin();const {data,error}=await getAdminSupabase().rpc('dashboard_metrics');if(error)throw new Error('DASHBOARD_UNAVAILABLE');
  const metrics=[
    {label:'Bestellungen heute',value:data.orders_today,icon:ShoppingBag},
    {label:'Umsatz heute',value:formatCHF(data.revenue_today_cents),icon:Banknote},
    {label:'Offene Bestellungen',value:data.open_orders,icon:PackageOpen},
    {label:'Fulfillment-Fehler',value:data.fulfillment_errors,icon:AlertTriangle,warn:data.fulfillment_errors>0},
    {label:'Versendete Bestellungen',value:data.shipped_orders,icon:Truck},
  ];
  return <><AdminNav/><p className="eyebrow">ÜBERSICHT</p><h1>Dein Shop. Im Blick.</h1><p className="admin-lead">Heute nach Schweizer Zeit. Umsatz aus bezahlten Bestellungen.</p><div className="admin-metrics">{metrics.map(({label,value,icon:Icon,warn})=><div key={label} className={`admin-metric-card${warn?' is-warn':''}`}><Icon size={20} aria-hidden="true"/><strong>{value}</strong><span>{label}</span></div>)}</div></>;
}
