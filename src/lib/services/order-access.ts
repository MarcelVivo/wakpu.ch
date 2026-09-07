import { createHmac, timingSafeEqual } from 'node:crypto';
import { isLocale, defaultLocale } from '@/i18n/locales';
type OrderAccess = {id:string;order_number:string;created_at:string};
type OrderAccessWithLocale = OrderAccess & {locale?:string};
function secret():string { const value=process.env.ORDER_ACCESS_SECRET; if(!value || value.length<32) throw new Error('ORDER_ACCESS_SECRET must be at least 32 characters');return value; }
export function orderAccessToken(order:OrderAccess):string {return createHmac('sha256',secret()).update(`wakpu-order-v1:${order.id}:${order.created_at}`).digest('hex');}
export function verifyOrderAccess(order:OrderAccess,token:string):boolean {if(!/^[a-f0-9]{64}$/.test(token))return false;return timingSafeEqual(Buffer.from(orderAccessToken(order)),Buffer.from(token));}
export function buildOrderStatusUrl(order:OrderAccessWithLocale):string {const lang=isLocale(order.locale||'')?order.locale:defaultLocale;const url=new URL(`/${lang}/bestellung/${encodeURIComponent(order.order_number)}`,process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');url.searchParams.set('token',orderAccessToken(order));return url.toString();}
