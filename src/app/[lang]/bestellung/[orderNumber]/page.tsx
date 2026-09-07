import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check,Package,Truck } from 'lucide-react';
import { getAccessibleOrder,safeTrackingUrl } from '@/lib/services/orders';
import { formatCHF,formatDate,statusLabel } from '@/lib/status';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export const metadata:Metadata={title:'Deine Bestellung',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function OrderStatusPage({params,searchParams}:{params:Promise<{lang:string;orderNumber:string}>;searchParams:Promise<{token?:string}>}){
  const {lang,orderNumber}=await params;if(!isLocale(lang))notFound();
  const {token}=await searchParams;if(!token)notFound();const result=await getAccessibleOrder(orderNumber,token);if(!result)notFound();const {order,items,shipments}=result;
  const dict=getDictionary(lang).orderStatus;
  const stage=order.fulfillment_status==='delivered'?4:order.fulfillment_status==='shipped'?3:['processing','submitted'].includes(order.fulfillment_status)?2:order.payment_status==='paid'?1:0;
  return <main id="main-content" className="page-shell prose order-status"><p className="eyebrow">{dict.eyebrow}</p><h1>{order.order_number}</h1><p>{dict.orderedOn(formatDate(order.created_at))}</p>{['refunded','cancelled'].includes(order.order_status)?<div className="panel"><h2>{statusLabel(order.order_status)}</h2><p>{dict.supportNote}</p></div>:<><h2>{order.payment_status==='paid'?dict.paidHeading:dict.pendingHeading}</h2><ol className="order-progress">{dict.steps.map((step,index)=><li key={step} className={index<=stage?'done':''}><span>{index<=stage?<Check size={18}/>:index+1}</span>{step}</li>)}</ol>{order.order_status==='manual_review'&&<p>{dict.manualReview}</p>}</>}{shipments.map(s=>{const url=safeTrackingUrl(s.tracking_url);return <section className="panel" key={s.id}><Truck size={28}/><h2>{dict.shipmentHeading}</h2><p>{s.carrier} · {s.tracking_number}</p>{s.carrier.includes('Mock')&&<p>{dict.mockShipment}</p>}{url&&<a className="button button-dark" href={url} target="_blank" rel="noopener noreferrer">{dict.trackShipment}</a>}</section>;})}<section className="panel"><Package size={25}/><h2>{dict.orderHeading}</h2>{items.map(i=><p key={i.id}>{i.quantity} × {i.product_name} · {formatCHF(i.total_price_cents)}</p>)}<p>{dict.shipping}: {formatCHF(order.shipping_cents)}</p><strong>{dict.total}: {formatCHF(order.total_cents)}</strong></section><p>{dict.confidentialNote}</p><Link href={`/${lang}/kontakt`}>{dict.questions}</Link></main>;
}
