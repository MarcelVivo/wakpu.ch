import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import { checkoutParameters,type CheckoutSnapshot } from '../src/lib/stripe/checkout';
import { checkoutCustomer,stripeEventMatchesMode } from '../src/lib/stripe/webhook';
import { readBoundedJson } from '../src/lib/validation/request';

test('Stripe checkout body is invariant to initial versus replayed database item ordering',()=>{
  const order:CheckoutSnapshot={order_id:'10000000-0000-4000-8000-000000000001',order_number:'WK-10001',subtotal_cents:3480,shipping_cents:200,total_cents:3680,items:[
    {variant_id:'b',product_name:'Triple',quantity:1,unit_price_cents:2490},
    {variant_id:'a',product_name:'Single',quantity:1,unit_price_cents:990},
  ]};
  const params=checkoutParameters(order,'https://wakpu.ch','Lieferung gemäss bestätigtem Versandhinweis.',1_900_000_000);
  const replay=checkoutParameters({...order,items:[...order.items].reverse()},'https://wakpu.ch','Lieferung gemäss bestätigtem Versandhinweis.',1_900_000_000);
  assert.deepEqual(params,replay);
  assert.equal(params.adaptive_pricing?.enabled,false);
  assert.equal(params.currency,'chf');
  assert.equal(params.line_items?.[0].price_data?.unit_amount,990);
  assert.throws(()=>checkoutParameters(order,'https://wakpu.ch','x'.repeat(1201),1_900_000_000),/SHIPPING_TEXT/);
});

test('modern Stripe delivery address is used and missing/foreign delivery details cannot finalize',()=>{
  const session={
    customer_details:{email:'test@example.com',name:'Billing Name',phone:null},
    collected_information:{business_name:null,individual_name:null,shipping_details:{name:'Anna Maria Beispiel',address:{line1:'Lieferstrasse 1',line2:null,postal_code:'8000',city:'Zürich',country:'CH',state:null}}},
  } as Pick<Stripe.Checkout.Session,'customer_details'|'collected_information'>;
  const customer=checkoutCustomer(session);
  assert.equal(customer.first_name,'Anna');assert.equal(customer.last_name,'Maria Beispiel');
  assert.equal(customer.address_line1,'Lieferstrasse 1');
  assert.throws(()=>checkoutCustomer({...session,collected_information:null}));
  const foreign=structuredClone(session);foreign.collected_information!.shipping_details!.address!.country='DE';
  assert.throws(()=>checkoutCustomer(foreign));
  assert.equal(stripeEventMatchesMode(false,'sk_live_example'),false);
  assert.equal(stripeEventMatchesMode(true,'sk_test_example'),false);
  assert.equal(stripeEventMatchesMode(true,'rk_live_example'),true);
  assert.equal(stripeEventMatchesMode(false,'invalid'),false);
});

test('chunked checkout bodies are cancelled at the byte limit, without trusting content length',async()=>{
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(8192));},cancel(){cancelled=true;}});
  const request=new Request('https://wakpu.ch/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body,duplex:'half'} as RequestInit);
  await assert.rejects(()=>readBoundedJson(request),/BODY_SIZE/);assert.equal(cancelled,true);
  const multibyte=JSON.stringify({value:'💥'.repeat(5000)});
  await assert.rejects(()=>readBoundedJson(new Request('https://wakpu.ch',{method:'POST',headers:{'content-type':'application/json'},body:multibyte})),/BODY_SIZE/);
  assert.deepEqual(await readBoundedJson(new Request('https://wakpu.ch',{method:'POST',headers:{'content-type':'application/json'},body:'{"ok":true}'})),{ok:true});
});
