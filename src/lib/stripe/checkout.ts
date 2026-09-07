import type Stripe from 'stripe';
import type { Locale } from '@/i18n/locales';

export interface CheckoutSnapshot {
  order_id:string;order_number:string;total_cents:number;subtotal_cents:number;shipping_cents:number;
  items:{variant_id:string;product_name:string;quantity:number;unit_price_cents:number}[];
}

/** Build from immutable order snapshots; SQL freezes the complete body before the first Stripe request. */
export function checkoutParameters(order:CheckoutSnapshot,origin:string,shippingText:string,expiresAt:number,locale:Locale):Stripe.Checkout.SessionCreateParams {
  if(shippingText.length>1200)throw new Error('SHIPPING_TEXT_TOO_LONG');
  return {
    mode:'payment',locale,currency:'chf',adaptive_pricing:{enabled:false},client_reference_id:order.order_id,
    metadata:{order_id:order.order_id},payment_intent_data:{metadata:{order_id:order.order_id}},
    line_items:[...order.items].sort((a,b)=>a.variant_id.localeCompare(b.variant_id)).map(i=>({quantity:i.quantity,price_data:{currency:'chf',unit_amount:i.unit_price_cents,product_data:{name:i.product_name}}})),
    shipping_address_collection:{allowed_countries:['CH']},
    shipping_options:[{shipping_rate_data:{display_name:'Versand Schweiz',type:'fixed_amount',fixed_amount:{amount:order.shipping_cents,currency:'chf'}}}],
    customer_creation:'always',billing_address_collection:'required',phone_number_collection:{enabled:false},
    ...(shippingText?{custom_text:{submit:{message:shippingText}}}:{}),
    success_url:`${origin}/${locale}/bestellung/erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${origin}/${locale}/?checkout=cancelled`,expires_at:expiresAt,
  };
}
