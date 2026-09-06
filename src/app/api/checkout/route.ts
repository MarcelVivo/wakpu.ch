import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/validation/order';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/server';
import { checkoutParameters, type CheckoutSnapshot } from '@/lib/stripe/checkout';
import type Stripe from 'stripe';
import { getRawSettings } from '@/lib/catalog';
import { requiredEnv, siteUrl } from '@/lib/env';
import { apiError, assertSameOrigin, readJson } from '@/lib/http';
import { logEvent } from '@/lib/logger';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    const parsed=checkoutSchema.safeParse(await readJson(request));
    if(!parsed.success)return apiError('Bitte prüfe deinen Warenkorb.',400);
    requiredEnv('STRIPE_WEBHOOK_SECRET');requiredEnv('CRON_SECRET');
    if(requiredEnv('ORDER_ACCESS_SECRET').length<32)throw new Error('CONFIG');
    const settings=await getRawSettings();
    if(!settings||settings.shop_maintenance)return apiError('Der Shop ist noch nicht für Bestellungen geöffnet.',503);
    const live=requiredEnv('STRIPE_SECRET_KEY').includes('_live_');
    if(live&&(!settings.legal_ready||!settings.business_name||!settings.business_address||!settings.business_postal_city||!settings.support_email||!settings.default_shipping_text||!settings.shipping_origin_text||!settings.legal_terms||!settings.privacy_notice||(process.env.FULFILLMENT_PROVIDER||'mock')==='mock'))return apiError('Bestellungen sind noch nicht freigeschaltet.',503);
    const items=parsed.data.items.map(i=>({variant_id:i.variantId,quantity:i.quantity})).sort((a,b)=>a.variant_id.localeCompare(b.variant_id));
    const fingerprint=createHash('sha256').update(JSON.stringify(items)).digest('hex');
    const db=getAdminSupabase();
    const {data,error}=await db.rpc('create_pending_order',{p_items:items,p_request_id:parsed.data.requestId,p_cart_fingerprint:fingerprint});
    if(error){logEvent('checkout.validation_rejected',{code:error.code});return apiError('Ein Produkt ist nicht mehr verfügbar. Bitte lade den Shop neu und prüfe deinen Warenkorb.',409);}
    const order=data as CheckoutSnapshot;
    const stripe=getStripe();
    const {data:existing,error:lookupError}=await db.from('orders').select('stripe_checkout_session_id,stripe_checkout_params,payment_status,created_at').eq('id',order.order_id).single();
    if(lookupError)throw lookupError;
    if(existing.payment_status==='paid'||existing.payment_status==='refunded')return apiError('Dieser Bestellversuch ist bereits abgeschlossen. Bitte öffne den Warenkorb erneut.',409);
    if(existing.stripe_checkout_session_id){
      const session=await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
      if(session.status==='open'&&session.url)return NextResponse.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
      return apiError('Die Kassensitzung ist abgelaufen. Bitte starte eine neue Bestellung.',409);
    }
    // Stable expiration and idempotency key keep retries byte-equivalent, including concurrent requests.
    const expiresAt=Math.floor(new Date(existing.created_at).getTime()/1000)+3600;
    if(expiresAt<Date.now()/1000+1800)return apiError('Bitte starte eine neue Bestellung.',409);
    let frozen=existing.stripe_checkout_params;
    if(!frozen){
      const {data:params,error:freezeError}=await db.rpc('freeze_checkout_params',{
        p_order_id:order.order_id,p_params:checkoutParameters(order,siteUrl(),settings.default_shipping_text,expiresAt),
      });
      if(freezeError||!params)throw new Error('CHECKOUT_SNAPSHOT');frozen=params;
    }
    const session=await stripe.checkout.sessions.create(frozen as Stripe.Checkout.SessionCreateParams,{idempotencyKey:`checkout:${order.order_id}`});
    const {error:updateError}=await db.from('orders').update({stripe_checkout_session_id:session.id}).eq('id',order.order_id);
    if(updateError||!session.url)throw new Error('CHECKOUT_PERSIST');
    return NextResponse.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
  } catch(error){
    const code=error instanceof Error?error.message:'';
    if(code==='ORIGIN')return apiError('Diese Anfrage ist nicht erlaubt.',403);
    if(['CONTENT_TYPE','BODY_SIZE'].includes(code)||error instanceof SyntaxError)return apiError('Ungültige Anfrage.',400);
    logEvent('checkout.failed',{code:'CHECKOUT_ERROR'});return apiError();
  }
}
