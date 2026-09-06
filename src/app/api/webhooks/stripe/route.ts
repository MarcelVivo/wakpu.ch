import Stripe from 'stripe';
import { after, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { requiredEnv } from '@/lib/env';
import { checkoutCustomer,stripeEventMatchesMode } from '@/lib/stripe/webhook';
import { processFulfillmentJobs } from '@/lib/services/fulfillment';
import { processEmailJobs } from '@/lib/services/email';
import { logEvent } from '@/lib/logger';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request) {
  let event:Stripe.Event;
  try {
    const signature=request.headers.get('stripe-signature');
    if(!signature)return NextResponse.json({error:'Signatur fehlt.'},{status:400});
    event=getStripe().webhooks.constructEvent(await request.text(),signature,requiredEnv('STRIPE_WEBHOOK_SECRET'));
    if(!stripeEventMatchesMode(event.livemode,requiredEnv('STRIPE_SECRET_KEY')))return NextResponse.json({error:'Webhook-Modus stimmt nicht mit dem Shop überein.'},{status:400});
  }catch{ return NextResponse.json({error:'Ungültige Webhook-Signatur.'},{status:400}); }
  try {
    const db=getAdminSupabase();
    if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded') {
      const session=event.data.object;
      if(session.payment_status!=='paid')return NextResponse.json({received:true});
      const orderId=session.metadata?.order_id;
      if(!orderId){logEvent('stripe.unrelated_session',{eventId:event.id});return NextResponse.json({received:true});}
      if(session.mode!=='payment'||session.status!=='complete'||session.client_reference_id!==orderId)throw new Error('CHECKOUT_CONTEXT_MISMATCH');
      const customer=checkoutCustomer(session);
      const pi=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
      if(!pi)throw new Error('PAYMENT_INTENT_MISSING');
      const {error}=await db.rpc('finalize_paid_order',{p_event_id:event.id,p_order_id:orderId,p_session_id:session.id,p_payment_intent_id:pi,p_amount_total:session.amount_total,p_currency:session.currency,p_customer:customer});
      if(error)throw error;
    }else if(event.type==='payment_intent.payment_failed'||event.type==='charge.refunded') {
      const obj=event.data.object;
      let pi:string|null;let orderId:string|null;let refunded:number|null=null;
      if(event.type==='payment_intent.payment_failed'){const intent=obj as Stripe.PaymentIntent;pi=intent.id;orderId=intent.metadata.order_id||null;}
      else {const charge=obj as Stripe.Charge;pi=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id??null;orderId=charge.metadata.order_id||null;refunded=charge.amount_refunded;if(pi&&!orderId){const intent=await getStripe().paymentIntents.retrieve(pi);orderId=intent.metadata.order_id||null;}}
      if(!pi||!orderId)return NextResponse.json({received:true});
      const {error}=await db.rpc('record_payment_event',{p_event_id:event.id,p_event_type:event.type,p_payment_intent_id:pi,p_amount_refunded:refunded,p_order_id:orderId});
      if(error)throw error;
    }
    // Durable jobs are committed before acknowledging. Cron retries if this invocation stops.
    after(async()=>{try{await processFulfillmentJobs();await processEmailJobs();}catch{logEvent('worker.deferred_to_cron',{eventId:event.id});}});
    return NextResponse.json({received:true});
  }catch{logEvent('stripe.processing_failed',{eventId:event.id});return NextResponse.json({error:'Verarbeitung wird wiederholt.'},{status:500});}
}
