import 'server-only';
import Stripe from 'stripe';
import { requiredEnv } from '@/lib/env';
let stripe: Stripe | undefined;
export function getStripe(): Stripe {
  return stripe ??= new Stripe(requiredEnv('STRIPE_SECRET_KEY'), {maxNetworkRetries:2,timeout:20000});
}
