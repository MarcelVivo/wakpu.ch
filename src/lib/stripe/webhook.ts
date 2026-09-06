import type Stripe from 'stripe';
import { customerSchema } from '@/lib/validation/order';

/** Stripe 22 / Dahlia stores the delivery address under collected_information. Never substitute the billing address. */
export function checkoutCustomer(session:Pick<Stripe.Checkout.Session,'customer_details'|'collected_information'>) {
  const details=session.customer_details;
  const shipping=session.collected_information?.shipping_details;
  const address=shipping?.address;
  const fullName=(shipping?.name||details?.name||'').trim().split(/\s+/);
  return customerSchema.parse({
    email:details?.email,first_name:fullName.shift()||'',last_name:fullName.join(' '),phone:details?.phone??null,
    address_line1:address?.line1,address_line2:address?.line2??null,postal_code:address?.postal_code,
    city:address?.city,country:address?.country,
  });
}

export function stripeEventMatchesMode(livemode:boolean,secretKey:string):boolean {
  const match=/^(?:sk|rk)_(live|test)_/.exec(secretKey);
  return Boolean(match)&&livemode===(match?.[1]==='live');
}
