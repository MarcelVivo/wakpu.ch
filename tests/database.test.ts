import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// Runs the unmodified migration and seed on PostgreSQL WASM.
let db: PGlite;
const single = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const triple = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const product = '11111111-1111-4111-8111-111111111111';
const customer = { email: 'test@example.com', first_name: 'Test', last_name: 'Kunde', phone: '', address_line1: 'Testweg 1', address_line2: '', postal_code: '8000', city: 'Zürich', country: 'CH' };
type Pending = { order_id: string; order_number: string; subtotal_cents: number; shipping_cents: number; total_cents: number; items: { unit_price_cents: number }[] };

before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const migration = await readFile(new URL('../supabase/migrations/202609060001_initial_shop.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(await readFile(new URL('../supabase/migrations/202609070001_waitlist_signups.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609070003_order_locale.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<Record<string, T>>(sql, params);
  return Object.values(rows[0])[0];
}
async function pending(quantity = 1): Promise<Pending> {
  return scalar<Pending>('select wakpu.create_pending_order($1::jsonb,$2::uuid,$3)', [JSON.stringify([{ variant_id: single, quantity }]), randomUUID(), `single-${quantity}`]);
}
async function finalize(order: Pending, event = `evt_${randomUUID()}`, intent = `pi_${order.order_id}`) {
  return scalar<{ duplicate: boolean; order_id: string }>('select wakpu.finalize_paid_order($1,$2::uuid,$3,$4,$5,$6,$7::jsonb)', [event, order.order_id, `cs_${order.order_id}`, intent, order.total_cents, 'chf', JSON.stringify(customer)]);
}
async function status(orderId: string) {
  const { rows } = await db.query<{ payment_status: string; fulfillment_status: string; order_status: string }>('select payment_status,fulfillment_status,order_status from wakpu.orders where id=$1', [orderId]);
  return rows[0];
}

test('seed config is closed by default and contains only the requested prices', async () => {
  assert.deepEqual(await scalar('select jsonb_agg(price_chf_cents order by price_chf_cents) from wakpu.product_variants'), [990, 2490, 3990]);
  assert.equal(await scalar('select fulfillment_enabled from wakpu.site_settings'), false);
  assert.equal(await scalar('select shop_maintenance from wakpu.site_settings'), true);
  assert.equal(await scalar('select count(*)::int from wakpu.verified_claims'), 0);
  await assert.rejects(pending(), /SHOP_UNAVAILABLE/);
  await db.exec('update wakpu.site_settings set shop_maintenance=false, shipping_cost_cents=490;');
});

test('checkout validates identifiers and quantities and sums only database prices', async () => {
  const order = await pending(2);
  assert.match(order.order_number, /^WK-\d+$/);
  assert.equal(order.subtotal_cents, 1980);
  assert.equal(order.shipping_cents, 490);
  assert.equal(order.total_cents, 2470);
  assert.equal(await scalar('select count(*)::int from wakpu.order_items where order_id=$1', [order.order_id]), 1);
  assert.equal((await status(order.order_id)).payment_status, 'pending');
  for (const quantity of [0, -1, 21, null]) {
    await assert.rejects(scalar('select wakpu.create_pending_order($1::jsonb)', [JSON.stringify([{ variant_id: single, quantity }])]), /INVALID_QUANTITY/);
  }
  await assert.rejects(scalar('select wakpu.create_pending_order($1::jsonb)', [JSON.stringify([{ variant_id: randomUUID(), quantity: 1 }])]), /VARIANT_UNAVAILABLE/);
  await assert.rejects(scalar('select wakpu.create_pending_order($1::jsonb)', [JSON.stringify([{ variant_id: single, quantity: 3 }, { variant_id: single, quantity: -1 }])]), /INVALID_QUANTITY/);
  await db.query('update wakpu.product_variants set active=false where id=$1', [triple]);
  await assert.rejects(scalar('select wakpu.create_pending_order($1::jsonb)', [JSON.stringify([{ variant_id: triple, quantity: 1 }])]), /VARIANT_UNAVAILABLE/);
  await db.query('update wakpu.product_variants set active=true where id=$1', [triple]);
});

test('checkout request IDs replay the same immutable order and reject changed carts', async () => {
  const key = randomUUID();
  const params = [JSON.stringify([{ variant_id: single, quantity: 1 }]), key, 'fingerprint'];
  const original = await scalar<Pending>('select wakpu.create_pending_order($1::jsonb,$2::uuid,$3)', params);
  const replay = await scalar<Pending>('select wakpu.create_pending_order($1::jsonb,$2::uuid,$3)', params);
  assert.equal(replay.order_id, original.order_id);
  assert.equal(await scalar('select count(*)::int from wakpu.orders where checkout_request_id=$1', [key]), 1);
  await assert.rejects(scalar('select wakpu.create_pending_order($1::jsonb,$2::uuid,$3)', [params[0], key, 'different']), /CHECKOUT_REQUEST_MISMATCH/);
});

test('complete Stripe request is frozen before payment and survives copy, settings and deployment changes', async () => {
  const order = await pending();
  const params = {
    mode: 'payment', currency: 'chf', client_reference_id: order.order_id,
    metadata: { order_id: order.order_id }, payment_intent_data: { metadata: { order_id: order.order_id } },
    line_items: [{ quantity: 1, price_data: { currency: 'chf', unit_amount: order.subtotal_cents, product_data: { name: 'WAKPU Single' } } }],
    shipping_address_collection: { allowed_countries: ['CH'] },
    shipping_options: [{ shipping_rate_data: { fixed_amount: { amount: order.shipping_cents, currency: 'chf' } } }],
    success_url: 'https://wakpu.ch/bestellung/erfolgreich?session_id={CHECKOUT_SESSION_ID}',
    custom_text: { submit: { message: 'Ursprüngliche Lieferinformation' } }, expires_at: 1800000000,
  };
  const sql = 'select wakpu.freeze_checkout_params($1,$2::jsonb)';
  await assert.rejects(scalar(sql, [order.order_id, JSON.stringify({ ...params, client_reference_id: randomUUID() })]), /INVALID_CHECKOUT_PARAMETERS/);
  await assert.rejects(scalar(sql, [order.order_id, JSON.stringify({ ...params, currency: 'eur' })]), /INVALID_CHECKOUT_PARAMETERS/);
  assert.deepEqual(await scalar(sql, [order.order_id, JSON.stringify(params)]), params);
  const changed = { ...params, success_url: 'https://changed.example/success', custom_text: { submit: { message: 'Geänderte Lieferinformation' } }, expires_at: 1800001000 };
  assert.deepEqual(await scalar(sql, [order.order_id, JSON.stringify(changed)]), params);
  assert.deepEqual(await scalar('select stripe_checkout_params from wakpu.orders where id=$1', [order.order_id]), params);
  await assert.rejects(scalar(sql, [order.order_id, JSON.stringify({ ...changed, metadata: { order_id: randomUUID() } })]), /INVALID_CHECKOUT_PARAMETERS/);
  await finalize(order);
  assert.deepEqual(await scalar(sql, [order.order_id, JSON.stringify(changed)]), params);
  const paid = await pending();
  await finalize(paid);
  await assert.rejects(scalar(sql, [paid.order_id, JSON.stringify({ ...params, client_reference_id: paid.order_id, metadata: { order_id: paid.order_id }, payment_intent_data: { metadata: { order_id: paid.order_id } } })]), /CHECKOUT_ALREADY_COMPLETED/);
});

test('payment finalization is transactional, immutable in value and idempotent', async () => {
  const order = await pending();
  const event = `evt_${randomUUID()}`;
  await assert.rejects(scalar('select wakpu.finalize_paid_order($1,$2::uuid,$3,$4,$5,$6,$7::jsonb)', [event, order.order_id, `cs_${order.order_id}`, `pi_${order.order_id}`, order.total_cents - 1, 'chf', JSON.stringify(customer)]), /PAYMENT_AMOUNT_MISMATCH/);
  assert.equal(await scalar('select count(*)::int from wakpu.webhook_events where event_id=$1', [event]), 0);
  assert.equal((await status(order.order_id)).payment_status, 'pending');
  assert.equal((await finalize(order, event)).duplicate, false);
  assert.equal((await finalize(order, event)).duplicate, true);
  assert.equal((await finalize(order)).duplicate, false);
  assert.equal(await scalar('select count(*)::int from wakpu.payments where order_id=$1', [order.order_id]), 1);
  assert.equal(await scalar('select count(*)::int from wakpu.jobs where order_id=$1', [order.order_id]), 2);
  assert.deepEqual(await status(order.order_id), { payment_status: 'paid', fulfillment_status: 'pending', order_status: 'fulfillment_pending' });
  await assert.rejects(scalar('select wakpu.finalize_paid_order($1,$2::uuid,$3,$4,$5,$6,$7::jsonb)', [`evt_${randomUUID()}`, order.order_id, 'cs_other', `pi_${order.order_id}`, order.total_cents, 'chf', JSON.stringify(customer)]), /CHECKOUT_SESSION_MISMATCH/);
});

test('incomplete/non-Swiss addresses cannot commit payment finalization', async () => {
  const order = await pending();
  const event = `evt_${randomUUID()}`;
  await assert.rejects(scalar('select wakpu.finalize_paid_order($1,$2::uuid,$3,$4,$5,$6,$7::jsonb)', [event, order.order_id, `cs_${order.order_id}`, `pi_${order.order_id}`, order.total_cents, 'chf', JSON.stringify({ ...customer, country: 'DE' })]), /SHIPPING_DETAILS_MISSING/);
  assert.equal(await scalar('select count(*)::int from wakpu.webhook_events where event_id=$1', [event]), 0);
});

test('failed payment can become paid and a late failure cannot revert paid', async () => {
  const order = await pending();
  await scalar('select wakpu.record_payment_event($1,$2,$3,null,$4::uuid)', [`evt_${randomUUID()}`, 'payment_intent.payment_failed', `pi_${order.order_id}`, order.order_id]);
  assert.equal((await status(order.order_id)).payment_status, 'failed');
  await finalize(order);
  await scalar('select wakpu.record_payment_event($1,$2,$3,null,$4::uuid)', [`evt_${randomUUID()}`, 'payment_intent.payment_failed', `pi_${order.order_id}`, order.order_id]);
  assert.equal((await status(order.order_id)).payment_status, 'paid');
  assert.equal(await scalar('select status from wakpu.payments where order_id=$1', [order.order_id]), 'paid');
});

test('partial refunds are monotonic and full refunds prevent new fulfillment', async () => {
  const order = await pending(2);
  await finalize(order);
  for (const amount of [500, 200, order.total_cents]) {
    const event = `evt_${randomUUID()}`;
    const args = [event, 'charge.refunded', `pi_${order.order_id}`, amount, order.order_id];
    await scalar('select wakpu.record_payment_event($1,$2,$3,$4,$5::uuid)', args);
    await scalar('select wakpu.record_payment_event($1,$2,$3,$4,$5::uuid)', args);
    if (amount < order.total_cents) {
      assert.equal((await status(order.order_id)).payment_status, 'paid');
      assert.equal(await scalar('select amount_refunded_cents from wakpu.payments where order_id=$1', [order.order_id]), 500);
    }
  }
  assert.equal((await status(order.order_id)).payment_status, 'refunded');
  assert.equal(await scalar('select status from wakpu.jobs where order_id=$1 and kind=$2', [order.order_id, 'fulfillment']), 'failed');
  assert.equal(await scalar('select count(*)::int from wakpu.jobs where order_id=$1 and kind=$2', [order.order_id, 'refund_confirmation']), 2);
  await finalize(order);
  assert.equal((await status(order.order_id)).order_status, 'refunded');
});

test('refund received before completed cannot be overwritten by the completed webhook', async () => {
  const order = await pending();
  await scalar('select wakpu.record_payment_event($1,$2,$3,$4,$5::uuid)', [`evt_${randomUUID()}`, 'charge.refunded', `pi_${order.order_id}`, order.total_cents, order.order_id]);
  await finalize(order);
  assert.equal((await status(order.order_id)).payment_status, 'refunded');
  assert.equal(await scalar('select count(*)::int from wakpu.jobs where order_id=$1 and kind=$2', [order.order_id, 'fulfillment']), 0);
});

test('worker leases isolate job kinds, reject stale owners and recover expired work', async () => {
  // Keep this lease test independent of pending jobs from payment tests.
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const claimed = await db.query<{ id: string; kind: string; attempt_count: number }>("select * from wakpu.claim_jobs('worker-a',10,300,array['fulfillment'])");
  assert.equal(claimed.rows.length, 1);
  assert.equal(claimed.rows[0].kind, 'fulfillment');
  const id = claimed.rows[0].id;
  assert.equal((await db.query("select * from wakpu.claim_jobs('worker-b',10,300,array['fulfillment'])")).rows.length, 0);
  assert.equal(await scalar("select wakpu.complete_job($1,'worker-b')", [id]), false);
  await db.query("update wakpu.jobs set locked_until=now()-interval '1 second' where id=$1", [id]);
  assert.equal(await scalar("select wakpu.complete_job($1,'worker-a')", [id]), false);
  const recovered = await db.query<{ id: string; attempt_count: number }>("select * from wakpu.claim_jobs('worker-b',10,300,array['fulfillment'])");
  assert.equal(recovered.rows[0].id, id);
  assert.equal(recovered.rows[0].attempt_count, 2);
  assert.equal(await scalar("select wakpu.defer_job($1,'worker-b',60)", [id]), true);
  assert.equal(await scalar('select attempt_count from wakpu.jobs where id=$1', [id]), 1);
  assert.equal(await scalar("select wakpu.fail_job($1,'worker-b','stale')", [id]), false);
});

test('exhausted fulfillment retries park the order and enqueue exactly one admin email', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  await db.query('update wakpu.jobs set max_attempts=1 where order_id=$1 and kind=$2', [order.order_id, 'fulfillment']);
  const { rows } = await db.query<{ id: string }>("select * from wakpu.claim_jobs('worker-fail',10,300,array['fulfillment'])");
  assert.equal(await scalar("select wakpu.fail_job($1,'worker-fail','Temporary supplier failure')", [rows[0].id]), true);
  assert.equal((await status(order.order_id)).fulfillment_status, 'manual_review');
  assert.equal(await scalar('select count(*)::int from wakpu.jobs where order_id=$1 and kind=$2', [order.order_id, 'fulfillment_error']), 1);
  assert.equal(await scalar("select wakpu.fail_job($1,'worker-fail','again')", [rows[0].id]), false);
});

test('supplier response after refund saves external reference and requests manual cancellation review', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const { rows } = await db.query<{ id: string }>("select * from wakpu.claim_jobs('supplier-worker',10,300,array['fulfillment'])");
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key,status) values($1::uuid,'mock',$1::text,'submitting') returning id", [order.order_id]);
  await scalar('select wakpu.record_payment_event($1,$2,$3,$4,$5::uuid)', [`evt_${randomUUID()}`, 'charge.refunded', `pi_${order.order_id}`, order.total_cents, order.order_id]);
  assert.equal(await scalar("select wakpu.finish_fulfillment($1,'supplier-worker',$2,'MOCK-TEST','processing',300)", [rows[0].id, fid]), true);
  assert.equal(await scalar('select provider_order_id from wakpu.fulfillment_orders where id=$1', [fid]), 'MOCK-TEST');
  assert.equal(await scalar('select status from wakpu.fulfillment_orders where id=$1', [fid]), 'manual_review');
  assert.equal((await status(order.order_id)).order_status, 'refunded');
  assert.equal((await status(order.order_id)).fulfillment_status, 'manual_review');
});

test('fulfillment and tracking uniqueness prevent duplicate supplier rows and tracking shipments', async () => {
  const order = await pending();
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key) values($1::uuid,'mock',$1::text) returning id", [order.order_id]);
  await assert.rejects(db.query("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key) values($1,'mock','different')", [order.order_id]), /unique constraint/);
  await db.query("insert into wakpu.shipments(order_id,fulfillment_order_id,carrier,tracking_number) values($1,$2,'Mock','TEST-TRACK')", [order.order_id, fid]);
  await assert.rejects(db.query("insert into wakpu.shipments(order_id,fulfillment_order_id,carrier,tracking_number) values($1,$2,'Mock','TEST-TRACK')", [order.order_id, fid]), /unique constraint/);
});

test('atomic product edits never rewrite purchased price snapshots and mismatch rolls back', async () => {
  const order = await pending();
  await scalar('select wakpu.admin_update_product($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [product, single, 'WAKPU Single', 'Beschreibung', 'Kurz', true, false, 'WAKPU-MYSTERY-1', 'MOCK-WAKPU-1', 1090, 'available']);
  assert.equal(await scalar('select unit_price_cents from wakpu.order_items where order_id=$1', [order.order_id]), 990);
  assert.equal((await pending()).subtotal_cents, 1090);
  await assert.rejects(scalar('select wakpu.admin_update_product($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [product, triple, 'Should rollback', '', '', true, false, 'OTHER-SKU', null, 1200, 'available']), /VARIANT_PRODUCT_MISMATCH/);
  assert.equal(await scalar('select name from wakpu.products where id=$1', [product]), 'WAKPU Single');
  await db.query('update wakpu.product_variants set price_chf_cents=990 where id=$1', [single]);
});

test('supplier submission rechecks lease, enable switch, budget, quote expiry and manual review atomically', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const { rows } = await db.query<{ id: string }>("select * from wakpu.claim_jobs('begin-worker',10,300,array['fulfillment'])");
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key) values($1::uuid,'mock',$1::text) returning id", [order.order_id]);
  const beginSql = "select wakpu.begin_fulfillment($1,'begin-worker',$2,$3,$4,$5::timestamptz)";
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, false, null]), false);
  await db.exec('update wakpu.site_settings set fulfillment_enabled=true,max_supplier_order_cost_cents=500;');
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 501, false, null]), false);
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, false, '2000-01-01T00:00:00Z']), false);
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, false, null]), true);
  const started = await scalar('select submission_started_at::text from wakpu.fulfillment_orders where id=$1', [fid]);
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, false, null]), false);
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, true, null]), true);
  assert.equal(await scalar('select submission_started_at::text from wakpu.fulfillment_orders where id=$1', [fid]), started);
  await db.query("update wakpu.orders set order_status='manual_review',fulfillment_status='manual_review' where id=$1", [order.order_id]);
  assert.equal(await scalar(beginSql, [rows[0].id, fid, 300, true, null]), false);
  assert.equal(await scalar("select wakpu.finish_fulfillment($1,'begin-worker',$2,$3,'processing',300)", [rows[0].id, fid, `MOCK-${order.order_id}`]), true);
  assert.equal((await status(order.order_id)).order_status, 'manual_review');
  assert.equal(await scalar('select status from wakpu.fulfillment_orders where id=$1', [fid]), 'manual_review');
});

test('admin retry refuses in-flight, already-submitted and uncertain non-idempotent orders', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key,submission_started_at,status) values($1::uuid,'mock',$1::text,now(),'manual_review') returning id", [order.order_id]);
  await db.query("update wakpu.jobs set status='failed' where order_id=$1 and kind='fulfillment'", [order.order_id]);
  await assert.rejects(scalar("select wakpu.retry_fulfillment($1,'mock',false)", [order.order_id]), /SUPPLIER_OUTCOME_REQUIRES_REVIEW/);
  await assert.rejects(scalar("select wakpu.retry_fulfillment($1,'other',true)", [order.order_id]), /SUPPLIER_OUTCOME_REQUIRES_REVIEW/);
  assert.equal(await scalar("select wakpu.retry_fulfillment($1,'mock',true)", [order.order_id]), true);
  const { rows } = await db.query<{ id: string }>("select * from wakpu.claim_jobs('retry-worker',10,300,array['fulfillment'])");
  await assert.rejects(scalar("select wakpu.retry_fulfillment($1,'mock',true)", [order.order_id]), /FULFILLMENT_ALREADY_PROCESSING/);
  await scalar("select wakpu.complete_job($1,'retry-worker')", [rows[0].id]);
  await db.query('update wakpu.fulfillment_orders set provider_order_id=$1 where id=$2', [`MOCK-${order.order_id}`, fid]);
  await assert.rejects(scalar("select wakpu.retry_fulfillment($1,'mock',true)", [order.order_id]), /FULFILLMENT_ALREADY_SUBMITTED/);
});

test('supplier result commits the provider ID once and atomically flags a changed invoice', async () => {
  for (const actual of [300, 350]) {
    await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
    const order = await pending();
    await finalize(order);
    const { rows } = await db.query<{ id: string }>("select * from wakpu.claim_jobs('invoice-worker',10,300,array['fulfillment'])");
    const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key) values($1::uuid,'mock',$1::text) returning id", [order.order_id]);
    assert.equal(await scalar("select wakpu.begin_fulfillment($1,'invoice-worker',$2,300,true,null)", [rows[0].id, fid]), true);
    const args = [rows[0].id, fid, `MOCK-${order.order_id}`, actual];
    assert.equal(await scalar("select wakpu.finish_fulfillment($1,'invoice-worker',$2,$3,'processing',$4)", args), true);
    assert.equal(await scalar("select wakpu.finish_fulfillment($1,'invoice-worker',$2,$3,'processing',$4)", args), false);
    assert.equal((await status(order.order_id)).order_status, actual === 300 ? 'processing' : 'manual_review');
    assert.equal(await scalar('select supplier_cost_cents from wakpu.fulfillment_orders where id=$1', [fid]), actual);
    assert.equal(await scalar('select provider_order_id from wakpu.fulfillment_orders where id=$1', [fid]), `MOCK-${order.order_id}`);
    assert.equal(await scalar("select count(*)::int from wakpu.jobs where order_id=$1 and kind='fulfillment_error'", [order.order_id]), actual === 300 ? 0 : 1);
  }
});

test('tracking transaction records shipment, order progress and one email per event without regressions', async () => {
  const order = await pending();
  await finalize(order);
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key,provider_order_id,status) values($1::uuid,'mock',$1::text,$2,'processing') returning id", [order.order_id, `MOCK-${order.order_id}`]);
  const tracking = 'TEST-ATOMIC';
  const sql = 'select wakpu.commit_shipment($1,$2,$3,$4,$5,null,null)';
  for (const state of ['shipped', 'shipped', 'in_transit', 'delivered', 'shipped']) {
    assert.equal(await scalar(sql, [fid, tracking, 'https://example.com/tracking/123', 'Test carrier', state]), true);
  }
  assert.equal((await status(order.order_id)).order_status, 'delivered');
  assert.equal(await scalar('select count(*)::int from wakpu.shipments where fulfillment_order_id=$1', [fid]), 1);
  assert.equal(await scalar('select status from wakpu.shipments where fulfillment_order_id=$1', [fid]), 'delivered');
  assert.equal(await scalar("select count(*)::int from wakpu.jobs where order_id=$1 and kind='shipping_confirmation'", [order.order_id]), 1);
  assert.equal(await scalar("select count(*)::int from wakpu.jobs where order_id=$1 and kind='tracking_update'", [order.order_id]), 2);
  await assert.rejects(scalar(sql, [fid, 'unsafe-url', 'javascript:alert(1)', null, 'shipped']), /INVALID_TRACKING_RESULT/);
});

test('tracking after refund retains the refund state and does not enqueue shipping mail', async () => {
  const order = await pending();
  await finalize(order);
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key,provider_order_id,status) values($1::uuid,'mock',$1::text,$2,'processing') returning id", [order.order_id, `MOCK-${order.order_id}`]);
  await scalar('select wakpu.record_payment_event($1,$2,$3,$4,$5::uuid)', [`evt_${randomUUID()}`, 'charge.refunded', `pi_${order.order_id}`, order.total_cents, order.order_id]);
  assert.equal(await scalar("select wakpu.commit_shipment($1,'AFTER-REFUND',null,null,'shipped',null,null)", [fid]), true);
  assert.equal((await status(order.order_id)).order_status, 'refunded');
  assert.equal(await scalar("select count(*)::int from wakpu.jobs where order_id=$1 and kind='shipping_confirmation'", [order.order_id]), 0);
  assert.equal(await scalar('select count(*)::int from wakpu.shipments where fulfillment_order_id=$1', [fid]), 1);
});

test('email retries retain the original first-attempt window and stale workers cannot modify completed events', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const { rows } = await db.query<{ id: string; dedupe_key: string }>("select * from wakpu.claim_jobs('email-worker-a',10,300,array['order_confirmation'])");
  const job = rows[0];
  const eid = await scalar<string>("insert into wakpu.email_events(order_id,dedupe_key,event_type,recipient,payload) values($1,$2,'order_confirmation','test@example.com','{\"subject\":\"Original\"}') returning id", [order.order_id, job.dedupe_key]);
  assert.equal(await scalar("select wakpu.begin_email($1,'email-worker-a',$2)", [job.id, eid]), true);
  const first = await scalar('select first_attempt_at::text from wakpu.email_events where id=$1', [eid]);
  assert.equal(await scalar("select wakpu.fail_job($1,'email-worker-a','Transient')", [job.id]), true);
  assert.equal(await scalar('select status from wakpu.email_events where id=$1', [eid]), 'failed');
  await db.query('update wakpu.jobs set run_after=now() where id=$1', [job.id]);
  await db.query("select * from wakpu.claim_jobs('email-worker-b',10,300,array['order_confirmation'])");
  assert.equal(await scalar("select wakpu.begin_email($1,'email-worker-b',$2)", [job.id, eid]), true);
  assert.equal(await scalar('select first_attempt_at::text from wakpu.email_events where id=$1', [eid]), first);
  assert.equal(await scalar("select wakpu.finish_email($1,'email-worker-a',$2,'resend-stale')", [job.id, eid]), false);
  assert.equal(await scalar("select wakpu.finish_email($1,'email-worker-b',$2,'resend-success')", [job.id, eid]), true);
  assert.equal(await scalar("select wakpu.fail_job($1,'email-worker-a','Old error')", [job.id]), false);
  assert.equal(await scalar('select status from wakpu.email_events where id=$1', [eid]), 'sent');
  assert.equal(await scalar('select status from wakpu.jobs where id=$1', [job.id]), 'completed');
  assert.deepEqual(await scalar('select payload from wakpu.email_events where id=$1', [eid]), { subject: 'Original' });
});

test('expired email deduplication windows and crashed final attempts become manual review', async () => {
  await db.exec("update wakpu.jobs set run_after=now()+interval '1 day' where status='pending';");
  const order = await pending();
  await finalize(order);
  const { rows } = await db.query<{ id: string; dedupe_key: string }>("select * from wakpu.claim_jobs('old-email',10,300,array['order_confirmation'])");
  const job = rows[0];
  const eid = await scalar<string>("insert into wakpu.email_events(order_id,dedupe_key,event_type,recipient,first_attempt_at) values($1,$2,'order_confirmation','test@example.com',now()-interval '23 hours') returning id", [order.order_id, job.dedupe_key]);
  assert.equal(await scalar("select wakpu.begin_email($1,'old-email',$2)", [job.id, eid]), false);
  assert.equal(await scalar("select wakpu.park_job($1,'old-email','Dedupe window expired')", [job.id]), true);
  assert.equal(await scalar('select status from wakpu.email_events where id=$1', [eid]), 'manual_review');
  const fid = await scalar<string>("insert into wakpu.fulfillment_orders(order_id,provider,idempotency_key) values($1::uuid,'mock',$1::text) returning id", [order.order_id]);
  await db.query("update wakpu.jobs set max_attempts=1 where order_id=$1 and kind='fulfillment'", [order.order_id]);
  const claim = await db.query<{ id: string }>("select * from wakpu.claim_jobs('crashed-worker',10,300,array['fulfillment'])");
  await db.query("update wakpu.jobs set locked_until=now()-interval '1 second' where id=$1", [claim.rows[0].id]);
  await db.query("select * from wakpu.claim_jobs('replacement-worker',10,300,array['fulfillment'])");
  assert.equal(await scalar('select status from wakpu.fulfillment_orders where id=$1', [fid]), 'manual_review');
  assert.equal((await status(order.order_id)).fulfillment_status, 'manual_review');
});

test('anonymous and authenticated roles cannot read PII, supplier data or execute server RPCs', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role};`);
    try {
      assert.equal(await scalar('select count(*)::int from wakpu.products'), 3);
      assert.equal(await scalar('select count(id)::int from wakpu.product_variants'), 3);
      assert.equal(await scalar('select business_name from wakpu.site_public_settings'), '');
      for (const query of [
        'select * from wakpu.orders', 'select * from wakpu.order_items', 'select * from wakpu.payments',
        'select * from wakpu.email_events', 'select * from wakpu.jobs', 'select * from wakpu.site_settings',
        'select * from wakpu.waitlist_signups', "insert into wakpu.waitlist_signups(email,confirm_token) values('x@x.com',repeat('a',64))",
        'select supplier_sku from wakpu.product_variants', 'select wakpu.dashboard_metrics()',
        "select wakpu.freeze_checkout_params(gen_random_uuid(),'{}'::jsonb)",
        "select wakpu.claim_jobs('forged')", "select wakpu.create_pending_order('[]'::jsonb)",
        "update wakpu.products set active=false",
      ]) await assert.rejects(db.exec(query), /permission denied/);
    } finally { await db.exec('reset role;'); }
  }
});

test('claims require evidence and aggregates return real database counts', async () => {
  await assert.rejects(db.exec("insert into wakpu.verified_claims(title,active) values('Unproven claim',true)"), /verified_claim_requires_evidence/);
  const metrics = await scalar<{ orders_today: number; revenue_today_cents: number }>('select wakpu.dashboard_metrics()');
  const count = await scalar<number>('select count(*)::int from wakpu.orders');
  assert.equal(metrics.orders_today, count);
  assert.equal(metrics.revenue_today_cents, await scalar('select coalesce(sum(total_cents),0)::int from wakpu.orders where payment_status=$1', ['paid']));
});

test('waitlist signups reject malformed emails/tokens and cannot be duplicated', async () => {
  const token = 'a'.repeat(64);
  await assert.rejects(db.exec(`insert into wakpu.waitlist_signups(email,confirm_token) values('not-an-email','${token}')`), /waitlist_signups_email_check/);
  await assert.rejects(db.exec(`insert into wakpu.waitlist_signups(email,confirm_token) values('ok@example.com','short')`), /waitlist_signups_confirm_token_check/);
  await db.exec(`insert into wakpu.waitlist_signups(email,confirm_token) values('dup@example.com','${token}')`);
  await assert.rejects(db.exec(`insert into wakpu.waitlist_signups(email,confirm_token) values('dup@example.com','${'b'.repeat(64)}')`), /waitlist_signups_email_key/);
  await assert.rejects(db.exec(`insert into wakpu.waitlist_signups(email,confirm_token) values('other@example.com','${token}')`), /waitlist_signups_confirm_token_key/);
  assert.equal(await scalar('select confirmed_at from wakpu.waitlist_signups where email=$1', ['dup@example.com']), null);
});
