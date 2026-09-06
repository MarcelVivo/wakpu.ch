import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSchema,customerSchema } from '../src/lib/validation/order';
import { orderAccessToken,verifyOrderAccess,buildOrderStatusUrl } from '../src/lib/services/order-access';
const variant='10000000-0000-4000-8000-000000000001';
const requestId='20000000-0000-4000-8000-000000000001';
test('checkout rejects client prices, duplicated variants and invalid quantities',()=>{
  assert.ok(checkoutSchema.safeParse({requestId,items:[{variantId:variant,quantity:1}]}).success);
  for(const quantity of [0,-1,1.5,11,NaN])assert.equal(checkoutSchema.safeParse({requestId,items:[{variantId:variant,quantity}]}).success,false);
  assert.equal(checkoutSchema.safeParse({requestId,items:[{variantId:variant,quantity:1,price:1}]}).success,false);
  assert.equal(checkoutSchema.safeParse({requestId,items:[{variantId:variant,quantity:1},{variantId:variant,quantity:2}]}).success,false);
});
test('Swiss address validation rejects other countries and malformed postcodes',()=>{
  const address={email:'test@example.com',first_name:'Test',last_name:'Kunde',phone:null,address_line1:'Teststrasse 1',address_line2:null,postal_code:'8000',city:'Zürich',country:'CH'};
  assert.ok(customerSchema.safeParse(address).success);
  assert.equal(customerSchema.safeParse({...address,country:'DE'}).success,false);
  assert.equal(customerSchema.safeParse({...address,postal_code:'80000'}).success,false);
});
test('order access tokens are tamper resistant and bound to order and creation time',()=>{
  process.env.ORDER_ACCESS_SECRET='test-secret-that-is-at-least-32-characters-long';
  process.env.NEXT_PUBLIC_SITE_URL='https://wakpu.ch';
  const order={id:requestId,order_number:'WK-10001',created_at:'2026-09-06T12:00:00Z'};
  const token=orderAccessToken(order);assert.ok(verifyOrderAccess(order,token));
  assert.equal(verifyOrderAccess({...order,id:variant},token),false);
  assert.equal(verifyOrderAccess({...order,created_at:'2026-09-07T12:00:00Z'},token),false);
  for(const bad of ['',token+'a','0'.repeat(64),'../etc/passwd'])assert.equal(verifyOrderAccess(order,bad),false);
  assert.equal(new URL(buildOrderStatusUrl(order)).searchParams.get('token'),token);
});
