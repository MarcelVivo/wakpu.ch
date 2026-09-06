import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Exercise the actual server-only adapter in fresh processes. No Supabase,
// Stripe or Resend connection is used by quoteOrder/createOrder.
const program = `
  import assert from 'node:assert/strict';
  import { createRequire } from 'node:module';
  const { MockFulfillmentProvider } = createRequire(import.meta.url)('./src/lib/fulfillment/mock-provider.ts');
  const provider = new MockFulfillmentProvider();
  const input = {
    orderId: '10000000-0000-4000-8000-000000000001', orderNumber: 'WK-10001',
    idempotencyKey: 'wakpu-order:10000000-0000-4000-8000-000000000001', currency: 'CHF',
    shippingAddress: { firstName:'Test', lastName:'Kunde', line1:'Teststrasse 1', postalCode:'8000', city:'Zürich', country:'CH', email:'test@example.com' },
    items: [{ supplierSku:'MOCK-WAKPU-3', quantity:1 }]
  };
  const quote = await provider.quoteOrder(input);
  assert.equal(quote.totalCostCents, 0);
  const first = await provider.createOrder(input, quote);
  const duplicate = await provider.createOrder(input, quote);
  assert.deepEqual(first, duplicate);
  assert.match(first.providerOrderId, /^MOCK-[A-F0-9]{20}$/);
  const otherInput = {...input, orderId:'other-order', idempotencyKey:'wakpu-order:other-order'};
  assert.notEqual((await provider.createOrder(otherInput, await provider.quoteOrder(otherInput))).providerOrderId, first.providerOrderId);
  await assert.rejects(() => provider.quoteOrder({...input,items:[{supplierSku:'REAL-SKU',quantity:1}]}));
  await assert.rejects(() => provider.createOrder(input,{...quote,expiresAt:'2020-01-01T00:00:00Z'}));
  process.stdout.write(first.providerOrderId);
`;

test("mock provider preserves its supplier reference across repeated calls and worker restarts", () => {
  const references: string[] = [];
  for (let run = 0; run < 2; run++) {
    const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "--eval", program], { encoding: "utf8", timeout: 20_000 });
    assert.equal(result.status, 0, result.stderr);
    references.push(result.stdout);
  }
  assert.equal(references[0], references[1]);
});
