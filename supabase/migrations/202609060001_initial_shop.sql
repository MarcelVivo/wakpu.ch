-- WAKPU: all money is stored in CHF rappen. Apply once, then run seed.sql.
-- Install only into a project without a wakpu schema. An existing schema aborts
-- this transaction; existing public/auth tables and project settings are untouched.
begin;

create schema wakpu;
-- Schema access does not permit clients or the server API key to create objects.
revoke all on schema wakpu from public, anon, authenticated, service_role;
grant usage on schema wakpu to anon, authenticated, service_role;
set local search_path = '';

-- UUID generation is built into PostgreSQL; no shared extension changes needed.
create sequence wakpu.order_number_seq start with 10001;

create table wakpu.products (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (length(name) between 1 and 150),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  short_description text not null default '',
  active boolean not null default false,
  featured boolean not null default false,
  badge text,
  image_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.product_variants (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  product_id uuid not null references wakpu.products(id) on delete cascade,
  sku text not null unique,
  name text not null default 'Mystery Color',
  price_chf_cents integer not null check (price_chf_cents > 0 and price_chf_cents <= 1000000),
  supplier_sku text,
  active boolean not null default false,
  stock_mode text not null default 'available' check (stock_mode in ('available', 'preorder', 'out_of_stock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.site_settings (
  id boolean primary key default true check (id = true),
  fulfillment_enabled boolean not null default false,
  max_supplier_order_cost_cents integer not null default 0 check (max_supplier_order_cost_cents >= 0),
  shop_maintenance boolean not null default true,
  default_shipping_text text not null default 'Die Lieferzeit wird vor dem Verkaufsstart bestätigt.',
  shipping_origin_text text not null default 'Der Versandort wird vor dem Verkaufsstart bestätigt.',
  shipping_cost_cents integer not null default 0 check (shipping_cost_cents >= 0),
  support_email text not null default '',
  business_name text not null default '',
  business_address text not null default '',
  business_postal_city text not null default '',
  business_country text not null default 'CH',
  product_safety_text text not null default 'Die Altersfreigabe und Herstellerhinweise werden vor dem Verkaufsstart ergänzt. Es liegen noch keine bestätigten Sicherheitsnachweise vor.',
  product_use_text text not null default 'Die Wachsschicht bricht beim Drücken auf. Dieser Crack-Effekt lässt sich nicht zurücksetzen. Weitere Hinweise zur Verwendung folgen nach der Produktprüfung.',
  instagram_url text,
  tiktok_url text,
  swiss_shop_verified boolean not null default false,
  legal_ready boolean not null default false,
  legal_terms text not null default '',
  privacy_notice text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.verified_claims (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  title text not null,
  description text not null default '',
  active boolean not null default false,
  evidence_url text,
  verified_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_claim_requires_evidence check (not active or (nullif(trim(evidence_url), '') is not null and verified_at is not null))
);

create table wakpu.orders (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_number text not null unique default ('WK-' || nextval('wakpu.order_number_seq')::text),
  checkout_request_id uuid unique,
  cart_fingerprint text,
  email text,
  first_name text,
  last_name text,
  phone text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_postal_code text,
  shipping_city text,
  shipping_country text check (shipping_country is null or shipping_country = 'CH'),
  currency text not null default 'chf' check (currency = 'chf'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents > 0 and total_cents = subtotal_cents + shipping_cents),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  order_status text not null default 'pending' check (order_status in ('pending','paid','fulfillment_pending','fulfillment_submitted','processing','shipped','delivered','manual_review','cancelled','refunded')),
  stripe_checkout_session_id text unique,
  stripe_checkout_params jsonb check (stripe_checkout_params is null or jsonb_typeof(stripe_checkout_params)='object'),
  stripe_payment_intent_id text unique,
  fulfillment_status text not null default 'not_started' check (fulfillment_status in ('not_started','pending','submitted','processing','shipped','delivered','failed','manual_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.order_items (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null references wakpu.orders(id) on delete restrict,
  product_id uuid references wakpu.products(id) on delete set null,
  variant_id uuid references wakpu.product_variants(id) on delete set null,
  sku text not null,
  product_name text not null,
  variant_name text not null default 'Mystery Color',
  quantity integer not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents > 0),
  total_price_cents integer not null check (total_price_cents = quantity * unit_price_cents),
  supplier_sku text,
  created_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create table wakpu.payments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null unique references wakpu.orders(id) on delete restrict,
  provider text not null default 'stripe' check (provider = 'stripe'),
  stripe_payment_intent_id text not null unique,
  stripe_checkout_session_id text unique,
  amount_cents integer not null check (amount_cents > 0),
  amount_refunded_cents integer not null default 0 check (amount_refunded_cents >= 0 and amount_refunded_cents <= amount_cents),
  currency text not null default 'chf' check (currency = 'chf'),
  status text not null check (status in ('pending','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.fulfillment_orders (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null unique references wakpu.orders(id) on delete restrict,
  provider text not null,
  provider_order_id text,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','submitting','submitted','processing','shipped','delivered','failed','manual_review','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  supplier_cost_cents integer check (supplier_cost_cents >= 0),
  tracking_number text,
  tracking_url text,
  next_attempt_at timestamptz,
  locked_until timestamptz,
  submission_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id)
);

create table wakpu.shipments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null references wakpu.orders(id) on delete restrict,
  fulfillment_order_id uuid not null references wakpu.fulfillment_orders(id) on delete restrict,
  carrier text not null,
  tracking_number text not null,
  tracking_url text,
  status text not null default 'shipped' check (status in ('pending','shipped','in_transit','delivered','exception')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fulfillment_order_id, tracking_number)
);

create table wakpu.webhook_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references wakpu.orders(id) on delete restrict,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table wakpu.jobs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  kind text not null check (kind in ('fulfillment','order_confirmation','shipping_confirmation','tracking_update','fulfillment_error','refund_confirmation')),
  order_id uuid not null references wakpu.orders(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_until timestamptz,
  locked_by text,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.email_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  order_id uuid not null references wakpu.orders(id) on delete restrict,
  dedupe_key text not null unique,
  event_type text not null check (event_type in ('order_confirmation','shipping_confirmation','tracking_update','fulfillment_error','refund_confirmation')),
  recipient text not null,
  resend_email_id text unique,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','manual_review')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  locked_until timestamptz,
  first_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wakpu.admin_logs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  admin_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on wakpu.product_variants(product_id);
create index orders_created_at_idx on wakpu.orders(created_at desc);
create index orders_open_idx on wakpu.orders(order_status, fulfillment_status) where payment_status = 'paid';
create index order_items_order_id_idx on wakpu.order_items(order_id);
create index shipments_order_id_idx on wakpu.shipments(order_id);
create index jobs_ready_idx on wakpu.jobs(kind, run_after) where status in ('pending','processing');
create index email_events_order_id_idx on wakpu.email_events(order_id);
create index fulfillment_orders_status_idx on wakpu.fulfillment_orders(status);
create index webhook_events_order_id_idx on wakpu.webhook_events(order_id);

create function wakpu.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
do $$ declare t text; begin
  foreach t in array array['products','product_variants','site_settings','verified_claims','orders','payments','fulfillment_orders','shipments','jobs','email_events'] loop
    execute format('create trigger set_updated_at before update on wakpu.%I for each row execute function wakpu.set_updated_at()', t);
  end loop;
end $$;

-- Every client role is read-only and sees only the active catalogue. Private
-- order/customer/payment tables have no client policies at all.
do $$ declare t text; begin
  foreach t in array array['products','product_variants','site_settings','verified_claims','orders','order_items','payments','fulfillment_orders','shipments','webhook_events','jobs','email_events','admin_logs'] loop
    execute format('alter table wakpu.%I enable row level security', t);
    execute format('revoke all on wakpu.%I from public, anon, authenticated', t);
    execute format('grant all on wakpu.%I to service_role', t);
  end loop;
end $$;
create policy active_products on wakpu.products for select to anon, authenticated using (active);
create policy active_variants on wakpu.product_variants for select to anon, authenticated using (active and exists (select 1 from wakpu.products p where p.id = product_id and p.active));
create policy active_verified_claims on wakpu.verified_claims for select to anon, authenticated using (active);
grant select on wakpu.products to anon, authenticated;
-- supplier_sku is deliberately not public. Never use select('*') from a client.
grant select (id, product_id, sku, name, price_chf_cents, active, stock_mode, created_at, updated_at) on wakpu.product_variants to anon, authenticated;
grant select (id, title, description, active, display_order, created_at, updated_at) on wakpu.verified_claims to anon, authenticated;
revoke all on sequence wakpu.order_number_seq from public, anon, authenticated, service_role;
grant usage, select on sequence wakpu.order_number_seq to service_role;

-- This view exposes public configuration only. Fulfillment limits and controls
-- remain private. The explicit projection is intentional.
create view wakpu.site_public_settings as
select id, shop_maintenance, default_shipping_text, shipping_origin_text,
  shipping_cost_cents, support_email, business_name, business_address,
  business_postal_city, business_country, product_safety_text, product_use_text,
  instagram_url, tiktok_url, swiss_shop_verified, legal_terms, privacy_notice
from wakpu.site_settings where id = true;
revoke all on wakpu.site_public_settings from public, anon, authenticated, service_role;
grant select on wakpu.site_public_settings to anon, authenticated, service_role;

-- Called only by the server. The cart contains identifiers/quantities, never
-- trusted browser prices. Snapshot creation and totals are one transaction.
create function wakpu.create_pending_order(
  p_items jsonb, p_request_id uuid default null, p_cart_fingerprint text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order wakpu.orders%rowtype;
  v_settings wakpu.site_settings%rowtype;
  v_item record;
  v_variant wakpu.product_variants%rowtype;
  v_product wakpu.products%rowtype;
  v_total integer := 0;
  v_count integer := 0;
  v_snapshot jsonb := '[]'::jsonb;
begin
  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
    select * into v_order from wakpu.orders where checkout_request_id = p_request_id;
    if found then
      if v_order.cart_fingerprint is distinct from p_cart_fingerprint then
        raise exception 'CHECKOUT_REQUEST_MISMATCH';
      end if;
      select coalesce(jsonb_agg(to_jsonb(i) order by i.sku), '[]'::jsonb) into v_snapshot from wakpu.order_items i where i.order_id = v_order.id;
      return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'subtotal_cents',v_order.subtotal_cents,'shipping_cents',v_order.shipping_cents,'total_cents',v_order.total_cents,'items',v_snapshot,'stripe_checkout_session_id',v_order.stripe_checkout_session_id);
    end if;
  end if;
  select * into v_settings from wakpu.site_settings where id = true;
  if not found or v_settings.shop_maintenance then raise exception 'SHOP_UNAVAILABLE'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'INVALID_CART';
  end if;
  for v_item in select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer) group by x.variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null or v_item.quantity not between 1 and 20 then raise exception 'INVALID_QUANTITY'; end if;
    -- Reject bad individual quantities even when positive/negative lines cancel.
    if exists (select 1 from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer) where x.quantity is null or x.quantity not between 1 and 20) then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_variant from wakpu.product_variants where id = v_item.variant_id for share;
    if not found or not v_variant.active or v_variant.stock_mode = 'out_of_stock' then raise exception 'VARIANT_UNAVAILABLE'; end if;
    select * into v_product from wakpu.products where id = v_variant.product_id for share;
    if not found or not v_product.active then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_count := v_count + v_item.quantity;
    if v_count > 50 then raise exception 'CART_LIMIT_EXCEEDED'; end if;
    v_total := v_total + v_item.quantity * v_variant.price_chf_cents;
    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'variant_id',v_variant.id,'sku',v_variant.sku,'product_name',v_product.name,'variant_name',v_variant.name,'quantity',v_item.quantity,'unit_price_cents',v_variant.price_chf_cents,'total_price_cents',v_item.quantity * v_variant.price_chf_cents,'supplier_sku',v_variant.supplier_sku));
  end loop;
  if v_total < 1 then raise exception 'INVALID_CART'; end if;
  insert into wakpu.orders(checkout_request_id,cart_fingerprint,subtotal_cents,shipping_cents,total_cents)
    values(p_request_id,p_cart_fingerprint,v_total,v_settings.shipping_cost_cents,v_total + v_settings.shipping_cost_cents) returning * into v_order;
  insert into wakpu.order_items(order_id,product_id,variant_id,sku,product_name,variant_name,quantity,unit_price_cents,total_price_cents,supplier_sku)
    select v_order.id,x.product_id,x.variant_id,x.sku,x.product_name,x.variant_name,x.quantity,x.unit_price_cents,x.total_price_cents,x.supplier_sku
    from jsonb_to_recordset(v_snapshot) as x(product_id uuid,variant_id uuid,sku text,product_name text,variant_name text,quantity integer,unit_price_cents integer,total_price_cents integer,supplier_sku text);
  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'subtotal_cents',v_order.subtotal_cents,'shipping_cents',v_order.shipping_cents,'total_cents',v_order.total_cents,'items',v_snapshot,'stripe_checkout_session_id',null);
end;
$$;

-- Freeze the complete external request before the first Stripe API call.
-- Retries must reuse custom copy, URLs, options and line-item order, even if
-- settings or deployed application code change during a network failure.
create function wakpu.freeze_checkout_params(p_order_id uuid,p_params jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order wakpu.orders%rowtype; v_subtotal bigint; v_shipping integer;
begin
  if jsonb_typeof(p_params) is distinct from 'object'
    or p_params->>'mode' is distinct from 'payment'
    or p_params->>'currency' is distinct from 'chf'
    or p_params->>'client_reference_id' is distinct from p_order_id::text
    or p_params#>>'{metadata,order_id}' is distinct from p_order_id::text
    or p_params#>>'{payment_intent_data,metadata,order_id}' is distinct from p_order_id::text then
    raise exception 'INVALID_CHECKOUT_PARAMETERS';
  end if;
  select * into v_order from wakpu.orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.stripe_checkout_params is not null then return v_order.stripe_checkout_params; end if;
  if v_order.payment_status in ('paid','refunded') or v_order.order_status in ('cancelled','refunded') then raise exception 'CHECKOUT_ALREADY_COMPLETED'; end if;
  if jsonb_typeof(p_params->'line_items') is distinct from 'array'
    or jsonb_array_length(p_params->'line_items')=0
    or p_params#>'{shipping_address_collection,allowed_countries}' is distinct from '["CH"]'::jsonb then
    raise exception 'INVALID_CHECKOUT_PARAMETERS';
  end if;
  if exists(select 1 from jsonb_array_elements(p_params->'line_items') x
      where x#>>'{price_data,currency}' is distinct from 'chf'
        or (x->>'quantity')::integer not between 1 and 20
        or (x#>>'{price_data,unit_amount}')::integer <= 0
        or x->>'quantity' is null or x#>>'{price_data,unit_amount}' is null) then
    raise exception 'INVALID_CHECKOUT_PARAMETERS';
  end if;
  select sum((x->>'quantity')::integer * (x#>>'{price_data,unit_amount}')::bigint)
    into v_subtotal from jsonb_array_elements(p_params->'line_items') x;
  v_shipping:=(p_params#>>'{shipping_options,0,shipping_rate_data,fixed_amount,amount}')::integer;
  if v_subtotal is distinct from v_order.subtotal_cents::bigint or v_shipping is distinct from v_order.shipping_cents
    or p_params#>>'{shipping_options,0,shipping_rate_data,fixed_amount,currency}' is distinct from 'chf' then
    raise exception 'CHECKOUT_SNAPSHOT_AMOUNT_MISMATCH';
  end if;
  update wakpu.orders set stripe_checkout_params=p_params where id=v_order.id;
  return p_params;
end;
$$;

-- Stripe signature validation happens in the route. This function is callable
-- by service_role only and commits the webhook receipt, payment and outbox
-- together: a retry cannot observe a half-finalized order.
create function wakpu.finalize_paid_order(
  p_event_id text, p_order_id uuid, p_session_id text, p_payment_intent_id text,
  p_amount_total integer, p_currency text, p_customer jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order wakpu.orders%rowtype; v_inserted uuid; v_refunded integer := 0;
begin
  select * into v_order from wakpu.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if exists(select 1 from wakpu.webhook_events where provider='stripe' and event_id=p_event_id) then
    return jsonb_build_object('duplicate',true,'order_id',v_order.id,'order_number',v_order.order_number);
  end if;
  if p_amount_total is distinct from v_order.total_cents or lower(p_currency) is distinct from v_order.currency then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if nullif(p_session_id,'') is null or nullif(p_payment_intent_id,'') is null then raise exception 'PAYMENT_REFERENCE_MISSING'; end if;
  if v_order.stripe_checkout_session_id is not null and v_order.stripe_checkout_session_id <> p_session_id then raise exception 'CHECKOUT_SESSION_MISMATCH'; end if;
  if v_order.stripe_payment_intent_id is not null and v_order.stripe_payment_intent_id <> p_payment_intent_id then raise exception 'PAYMENT_INTENT_MISMATCH'; end if;
  if nullif(p_customer->>'email','') is null or nullif(p_customer->>'address_line1','') is null
    or nullif(p_customer->>'postal_code','') is null or nullif(p_customer->>'city','') is null
    or p_customer->>'country' is distinct from 'CH' then raise exception 'SHIPPING_DETAILS_MISSING'; end if;
  insert into wakpu.webhook_events(provider,event_id,event_type,order_id)
    values('stripe',p_event_id,'checkout.session.completed',v_order.id)
    on conflict(provider,event_id) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('duplicate',true,'order_id',v_order.id,'order_number',v_order.order_number); end if;
  select amount_refunded_cents into v_refunded from wakpu.payments where order_id=v_order.id;
  v_refunded := coalesce(v_refunded,0);
  update wakpu.orders set
    email=p_customer->>'email',first_name=p_customer->>'first_name',last_name=p_customer->>'last_name',phone=nullif(p_customer->>'phone',''),
    shipping_address_line1=p_customer->>'address_line1',shipping_address_line2=nullif(p_customer->>'address_line2',''),
    shipping_postal_code=p_customer->>'postal_code',shipping_city=p_customer->>'city',shipping_country='CH',
    stripe_checkout_session_id=p_session_id,stripe_payment_intent_id=p_payment_intent_id,
    payment_status=case when v_refunded >= total_cents or payment_status='refunded' then 'refunded' else 'paid' end,
    order_status=case when v_refunded >= total_cents or payment_status='refunded' then 'refunded' when order_status='cancelled' then 'manual_review' when order_status in ('pending','paid') then 'fulfillment_pending' else order_status end,
    fulfillment_status=case when v_refunded >= total_cents or payment_status='refunded' then 'manual_review' when order_status='cancelled' then 'manual_review' when fulfillment_status='not_started' then 'pending' else fulfillment_status end
    where id=v_order.id returning * into v_order;
  insert into wakpu.payments(order_id,stripe_payment_intent_id,stripe_checkout_session_id,amount_cents,currency,status)
    values(v_order.id,p_payment_intent_id,p_session_id,p_amount_total,p_currency,v_order.payment_status)
    on conflict(order_id) do update set stripe_checkout_session_id=excluded.stripe_checkout_session_id,
      status=case when wakpu.payments.amount_refunded_cents>=wakpu.payments.amount_cents then 'refunded' else excluded.status end;
  if v_order.payment_status='paid' then
    insert into wakpu.jobs(kind,order_id,dedupe_key) values('order_confirmation',v_order.id,'order_confirmation:'||v_order.id) on conflict(dedupe_key) do nothing;
    if v_order.fulfillment_status='pending' then
      insert into wakpu.jobs(kind,order_id,dedupe_key) values('fulfillment',v_order.id,'fulfillment:'||v_order.id) on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return jsonb_build_object('duplicate',false,'order_id',v_order.id,'order_number',v_order.order_number,'payment_status',v_order.payment_status);
end;
$$;

create function wakpu.record_payment_event(
  p_event_id text,p_event_type text,p_payment_intent_id text,
  p_amount_refunded integer default null,p_order_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order wakpu.orders%rowtype; v_inserted uuid; v_refund integer; v_previous_refund integer := 0;
begin
  if p_event_type not in ('payment_intent.payment_failed','charge.refunded') then raise exception 'UNSUPPORTED_PAYMENT_EVENT'; end if;
  if exists(select 1 from wakpu.webhook_events where provider='stripe' and event_id=p_event_id) then return jsonb_build_object('duplicate',true); end if;
  select * into v_order from wakpu.orders where stripe_payment_intent_id=p_payment_intent_id or (p_order_id is not null and id=p_order_id) for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if nullif(p_payment_intent_id,'') is null or (v_order.stripe_payment_intent_id is not null and v_order.stripe_payment_intent_id<>p_payment_intent_id) then raise exception 'PAYMENT_INTENT_MISMATCH'; end if;
  if p_event_type='charge.refunded' and (p_amount_refunded is null or p_amount_refunded<0 or p_amount_refunded>v_order.total_cents) then raise exception 'INVALID_REFUND_AMOUNT'; end if;
  insert into wakpu.webhook_events(provider,event_id,event_type,order_id)
    values('stripe',p_event_id,p_event_type,v_order.id) on conflict(provider,event_id) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('duplicate',true); end if;
  update wakpu.orders set stripe_payment_intent_id=p_payment_intent_id where id=v_order.id;
  if p_event_type='payment_intent.payment_failed' then
    update wakpu.orders set payment_status='failed' where id=v_order.id and payment_status='pending';
    insert into wakpu.payments(order_id,stripe_payment_intent_id,amount_cents,status)
      values(v_order.id,p_payment_intent_id,v_order.total_cents,'failed')
      on conflict(order_id) do update set status=case when wakpu.payments.status='pending' then 'failed' else wakpu.payments.status end;
  else
    select amount_refunded_cents into v_previous_refund from wakpu.payments where order_id=v_order.id;
    v_previous_refund:=coalesce(v_previous_refund,0);
    v_refund:=greatest(v_previous_refund,p_amount_refunded);
    insert into wakpu.payments(order_id,stripe_payment_intent_id,amount_cents,amount_refunded_cents,status)
      values(v_order.id,p_payment_intent_id,v_order.total_cents,v_refund,case when v_refund>=v_order.total_cents then 'refunded' else 'paid' end)
      on conflict(order_id) do update set amount_refunded_cents=greatest(wakpu.payments.amount_refunded_cents,excluded.amount_refunded_cents),status=case when greatest(wakpu.payments.amount_refunded_cents,excluded.amount_refunded_cents)>=wakpu.payments.amount_cents then 'refunded' else wakpu.payments.status end;
    if v_refund>=v_order.total_cents then
      update wakpu.orders set payment_status='refunded',order_status='refunded',fulfillment_status=case when fulfillment_status in ('shipped','delivered') then fulfillment_status else 'manual_review' end where id=v_order.id;
      -- A submitting worker must retain its lease so it can record an external
      -- provider ID and flag cancellation review if the refund races submission.
      update wakpu.jobs set status='failed',locked_by=null,locked_at=null,locked_until=null,last_error='Order refunded' where order_id=v_order.id and kind='fulfillment' and status='pending';
    end if;
    if v_refund>v_previous_refund then
      insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values('refund_confirmation',v_order.id,'refund_confirmation:'||p_event_id,jsonb_build_object('amount_refunded_cents',v_refund-v_previous_refund,'total_refunded_cents',v_refund)) on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return jsonb_build_object('duplicate',false,'order_id',v_order.id);
end;
$$;

-- Durable leases make webhook/cron/manual workers safe to run concurrently.
-- Provider/Resend idempotency keys are still mandatory across crash recovery.
create function wakpu.claim_jobs(p_worker_id text,p_limit integer default 10,p_lease_seconds integer default 300,p_kinds text[] default null)
returns setof wakpu.jobs language plpgsql security definer set search_path = '' as $$
begin
  if nullif(p_worker_id,'') is null or p_limit not between 1 and 100 or p_lease_seconds not between 30 and 900 then raise exception 'INVALID_LEASE'; end if;
  -- A crashed final attempt needs the same escalation as a reported failure.
  with exhausted as (
    update wakpu.jobs set status='failed',locked_by=null,locked_at=null,locked_until=null,last_error='Worker lease expired after final attempt'
    where status='processing' and locked_until<now() and attempt_count>=max_attempts
      and (p_kinds is null or kind=any(p_kinds)) returning order_id,kind,dedupe_key,attempt_count
  ), updated_fulfillment as (
    update wakpu.fulfillment_orders f set status='manual_review',attempt_count=e.attempt_count,
      last_error='Worker lease expired after final attempt',locked_until=null
    from exhausted e where e.kind='fulfillment' and f.order_id=e.order_id and f.provider_order_id is null
  ), updated_email as (
    update wakpu.email_events m set status='manual_review',attempt_count=e.attempt_count,
      last_error='Worker lease expired after final attempt',locked_until=null
    from exhausted e where e.kind<>'fulfillment' and m.dedupe_key=e.dedupe_key and m.status<>'sent'
  ), escalated as (
    update wakpu.orders set order_status='manual_review',fulfillment_status='manual_review'
    where id in (select order_id from exhausted where kind='fulfillment') and payment_status='paid' returning id
  ) insert into wakpu.jobs(kind,order_id,dedupe_key,payload)
      select 'fulfillment_error',id,'fulfillment_error:'||id,jsonb_build_object('reason','Maximum fulfillment attempts exhausted') from escalated on conflict(dedupe_key) do nothing;
  return query
  with ready as (
    select j.id from wakpu.jobs j
    where ((j.status='pending' and j.run_after<=now()) or (j.status='processing' and j.locked_until<now()))
      and j.attempt_count<j.max_attempts and (p_kinds is null or j.kind=any(p_kinds))
    order by j.run_after,j.created_at for update skip locked limit p_limit
  ) update wakpu.jobs j set status='processing',attempt_count=j.attempt_count+1,locked_at=now(),locked_until=now()+make_interval(secs=>p_lease_seconds),locked_by=p_worker_id
    from ready where j.id=ready.id returning j.*;
end;
$$;

create function wakpu.complete_job(p_job_id uuid,p_worker_id text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update wakpu.jobs set status='completed',locked_at=null,locked_until=null,locked_by=null,last_error=null
    where id=p_job_id and status='processing' and locked_by=p_worker_id and locked_until>now();
  return found;
end;
$$;

create function wakpu.defer_job(p_job_id uuid,p_worker_id text,p_seconds integer) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_seconds not between 5 and 86400 then raise exception 'INVALID_DELAY'; end if;
  update wakpu.jobs set status='pending',attempt_count=greatest(0,attempt_count-1),run_after=now()+make_interval(secs=>p_seconds),locked_at=null,locked_until=null,locked_by=null
    where id=p_job_id and status='processing' and locked_by=p_worker_id and locked_until>now();
  return found;
end;
$$;

create function wakpu.fail_job(p_job_id uuid,p_worker_id text,p_error text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype;
begin
  update wakpu.jobs set status=case when attempt_count>=max_attempts then 'failed' else 'pending' end,
    run_after=now()+make_interval(secs=>least(3600,30*power(2,attempt_count)::integer)),last_error=left(p_error,1000),locked_by=null,locked_at=null,locked_until=null
    where id=p_job_id and status='processing' and locked_by=p_worker_id and locked_until>now() returning * into v_job;
  if not found then return false; end if;
  if v_job.kind='fulfillment' then
    update wakpu.fulfillment_orders set attempt_count=v_job.attempt_count,
      status=case when v_job.status='failed' then 'manual_review' else 'failed' end,
      last_error=left(p_error,1000),locked_until=null
      where order_id=v_job.order_id and provider_order_id is null;
  else
    update wakpu.email_events set status=case when v_job.status='failed' then 'manual_review' else 'failed' end,
      attempt_count=v_job.attempt_count,last_error=left(p_error,1000),locked_until=null
      where dedupe_key=v_job.dedupe_key and status<>'sent';
  end if;
  if v_job.kind='fulfillment' and v_job.status='failed' then
    update wakpu.orders set order_status='manual_review',fulfillment_status='manual_review' where id=v_job.order_id and payment_status='paid';
    insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values('fulfillment_error',v_job.order_id,'fulfillment_error:'||v_job.order_id,jsonb_build_object('reason',left(p_error,1000))) on conflict(dedupe_key) do nothing;
  end if;
  return true;
end;
$$;

create function wakpu.park_job(p_job_id uuid,p_worker_id text,p_error text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype;
begin
  update wakpu.jobs set status='failed',last_error=left(p_error,1000),locked_by=null,locked_at=null,locked_until=null
    where id=p_job_id and status='processing' and locked_by=p_worker_id and locked_until>now() returning * into v_job;
  if not found then return false; end if;
  if v_job.kind='fulfillment' then
    update wakpu.orders set order_status='manual_review',fulfillment_status='manual_review' where id=v_job.order_id and payment_status='paid';
    update wakpu.fulfillment_orders set status='manual_review',attempt_count=v_job.attempt_count,last_error=left(p_error,1000),locked_until=null where order_id=v_job.order_id and provider_order_id is null;
    insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values('fulfillment_error',v_job.order_id,'fulfillment_error:'||v_job.order_id,jsonb_build_object('reason',left(p_error,1000))) on conflict(dedupe_key) do nothing;
  else
    update wakpu.email_events set status='manual_review',attempt_count=v_job.attempt_count,last_error=left(p_error,1000),locked_until=null
      where dedupe_key=v_job.dedupe_key and status<>'sent';
  end if;
  return true;
end;
$$;

-- The final pre-submission check and state transition share the worker lease
-- and row locks. Changing an order to manual review cannot be silently undone
-- by a worker that previously read its paid state.
create function wakpu.begin_fulfillment(
  p_job_id uuid,p_worker_id text,p_fulfillment_id uuid,p_quote_cost_cents integer,
  p_idempotent_create boolean,p_quote_expires_at timestamptz default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype; v_order wakpu.orders%rowtype; v_fo wakpu.fulfillment_orders%rowtype; v_settings wakpu.site_settings%rowtype;
begin
  select * into v_job from wakpu.jobs where id=p_job_id and kind='fulfillment' and status='processing'
    and locked_by=p_worker_id and locked_until>now()+interval '30 seconds' for update;
  if not found then return false; end if;
  select * into v_order from wakpu.orders where id=v_job.order_id for update;
  if not found or v_order.payment_status<>'paid' or v_order.order_status in ('cancelled','refunded','manual_review','shipped','delivered') then return false; end if;
  select * into v_fo from wakpu.fulfillment_orders where id=p_fulfillment_id and order_id=v_job.order_id for update;
  if not found or v_fo.provider_order_id is not null or v_fo.status in ('manual_review','cancelled','shipped','delivered') then return false; end if;
  if v_fo.submission_started_at is not null and not coalesce(p_idempotent_create,false) then return false; end if;
  select * into v_settings from wakpu.site_settings where id=true for share;
  if not found or not v_settings.fulfillment_enabled or p_quote_cost_cents is null or p_quote_cost_cents<0
    or p_quote_cost_cents>v_settings.max_supplier_order_cost_cents
    or (p_quote_expires_at is not null and p_quote_expires_at<=now()) then return false; end if;
  update wakpu.fulfillment_orders set status='submitting',submission_started_at=coalesce(submission_started_at,now()),
    attempt_count=v_job.attempt_count,supplier_cost_cents=p_quote_cost_cents,last_error=null,locked_until=v_job.locked_until where id=v_fo.id;
  return true;
end;
$$;

create function wakpu.retry_fulfillment(p_order_id uuid,p_provider text,p_idempotent_create boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype; v_order wakpu.orders%rowtype; v_fo wakpu.fulfillment_orders%rowtype; v_enabled boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('retry:'||p_order_id::text,0));
  select * into v_job from wakpu.jobs where dedupe_key='fulfillment:'||p_order_id for update;
  if found and v_job.status='processing' then raise exception 'FULFILLMENT_ALREADY_PROCESSING'; end if;
  select * into v_order from wakpu.orders where id=p_order_id for update;
  if not found or v_order.payment_status<>'paid' or v_order.order_status in ('shipped','delivered','cancelled','refunded') then raise exception 'ORDER_NOT_RETRYABLE'; end if;
  select fulfillment_enabled into v_enabled from wakpu.site_settings where id=true for share;
  if not coalesce(v_enabled,false) then raise exception 'FULFILLMENT_DISABLED'; end if;
  select * into v_fo from wakpu.fulfillment_orders where order_id=p_order_id for update;
  if found then
    if v_fo.provider_order_id is not null then raise exception 'FULFILLMENT_ALREADY_SUBMITTED'; end if;
    if v_fo.provider is distinct from p_provider or (v_fo.submission_started_at is not null and not coalesce(p_idempotent_create,false)) then raise exception 'SUPPLIER_OUTCOME_REQUIRES_REVIEW'; end if;
    update wakpu.fulfillment_orders set status='pending',last_error=null,locked_until=null where id=v_fo.id;
  end if;
  update wakpu.orders set order_status='fulfillment_pending',fulfillment_status='pending' where id=p_order_id;
  insert into wakpu.jobs(kind,order_id,dedupe_key) values('fulfillment',p_order_id,'fulfillment:'||p_order_id)
    on conflict(dedupe_key) do update set status='pending',attempt_count=0,run_after=now(),locked_at=null,locked_until=null,locked_by=null,last_error=null;
  return true;
end;
$$;

create function wakpu.begin_email(p_job_id uuid,p_worker_id text,p_event_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype; v_event wakpu.email_events%rowtype;
begin
  select * into v_job from wakpu.jobs where id=p_job_id and kind<>'fulfillment' and status='processing'
    and locked_by=p_worker_id and locked_until>now()+interval '30 seconds' for update;
  if not found then return false; end if;
  select * into v_event from wakpu.email_events where id=p_event_id and order_id=v_job.order_id and dedupe_key=v_job.dedupe_key for update;
  if not found or v_event.status in ('sent','manual_review')
    or (v_event.first_attempt_at is not null and v_event.first_attempt_at<=now()-interval '23 hours') then return false; end if;
  update wakpu.email_events set status='sending',first_attempt_at=coalesce(first_attempt_at,now()),
    attempt_count=v_job.attempt_count,locked_until=v_job.locked_until,last_error=null where id=v_event.id;
  return true;
end;
$$;

create function wakpu.finish_email(p_job_id uuid,p_worker_id text,p_event_id uuid,p_resend_email_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype; v_event wakpu.email_events%rowtype;
begin
  select * into v_job from wakpu.jobs where id=p_job_id and kind<>'fulfillment' and status='processing'
    and locked_by=p_worker_id and locked_until>now() for update;
  if not found then return false; end if;
  if nullif(p_resend_email_id,'') is null then raise exception 'EMAIL_REFERENCE_MISSING'; end if;
  select * into v_event from wakpu.email_events where id=p_event_id and order_id=v_job.order_id and dedupe_key=v_job.dedupe_key for update;
  if not found then raise exception 'EMAIL_EVENT_NOT_FOUND'; end if;
  if v_event.resend_email_id is not null and v_event.resend_email_id<>p_resend_email_id then raise exception 'EMAIL_REFERENCE_MISMATCH'; end if;
  update wakpu.email_events set status='sent',resend_email_id=p_resend_email_id,sent_at=coalesce(sent_at,now()),locked_until=null,last_error=null where id=v_event.id;
  update wakpu.jobs set status='completed',locked_at=null,locked_until=null,locked_by=null,last_error=null where id=v_job.id;
  return true;
end;
$$;

create function wakpu.commit_shipment(
  p_fulfillment_id uuid,p_tracking_number text,p_tracking_url text,p_carrier text,
  p_status text,p_shipped_at timestamptz,p_delivered_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_fo wakpu.fulfillment_orders%rowtype; v_order wakpu.orders%rowtype; v_shipment wakpu.shipments%rowtype;
  v_enabled boolean; v_kind text; v_order_state text; v_safe boolean;
begin
  if nullif(trim(p_tracking_number),'') is null or length(p_tracking_number)>200
    or p_status not in ('shipped','in_transit','delivered','exception')
    or (p_tracking_url is not null and p_tracking_url !~ '^https?://') then raise exception 'INVALID_TRACKING_RESULT'; end if;
  select * into v_fo from wakpu.fulfillment_orders where id=p_fulfillment_id;
  if not found then raise exception 'FULFILLMENT_ORDER_NOT_FOUND'; end if;
  select * into v_order from wakpu.orders where id=v_fo.order_id for update;
  select * into v_fo from wakpu.fulfillment_orders where id=p_fulfillment_id for update;
  if v_fo.provider_order_id is null then raise exception 'FULFILLMENT_NOT_SUBMITTED'; end if;
  select fulfillment_enabled into v_enabled from wakpu.site_settings where id=true for share;
  if not coalesce(v_enabled,false) then return false; end if;
  select * into v_shipment from wakpu.shipments where fulfillment_order_id=v_fo.id and tracking_number=p_tracking_number for update;
  -- Duplicate or out-of-order tracking events must not send repeat mail or
  -- move a delivered shipment back to "shipped".
  if found and (v_shipment.status=p_status or v_shipment.status='delivered' or (v_shipment.status='in_transit' and p_status='shipped')) then return true; end if;
  v_kind:=case when v_fo.tracking_number is null then 'shipping_confirmation' else 'tracking_update' end;
  v_safe:=v_order.payment_status='paid' and v_order.order_status not in ('cancelled','refunded','manual_review');
  insert into wakpu.shipments(order_id,fulfillment_order_id,carrier,tracking_number,tracking_url,status,shipped_at,delivered_at)
    values(v_fo.order_id,v_fo.id,coalesce(nullif(p_carrier,''),'Nicht angegeben'),p_tracking_number,p_tracking_url,p_status,coalesce(p_shipped_at,now()),case when p_status='delivered' then coalesce(p_delivered_at,now()) else p_delivered_at end)
    on conflict(fulfillment_order_id,tracking_number) do update set carrier=excluded.carrier,tracking_url=excluded.tracking_url,status=excluded.status,
      shipped_at=coalesce(wakpu.shipments.shipped_at,excluded.shipped_at),delivered_at=coalesce(excluded.delivered_at,wakpu.shipments.delivered_at);
  v_order_state:=case when v_order.fulfillment_status='delivered' or p_status='delivered' then 'delivered' when p_status='exception' then 'manual_review' else 'shipped' end;
  update wakpu.fulfillment_orders set tracking_number=p_tracking_number,tracking_url=p_tracking_url,
    status=case when v_safe then v_order_state else 'manual_review' end where id=v_fo.id;
  if v_safe then
    update wakpu.orders set fulfillment_status=v_order_state,order_status=v_order_state where id=v_order.id;
    insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values(v_kind,v_order.id,'tracking:'||v_fo.id||':'||p_tracking_number||':'||p_status,
      jsonb_build_object('tracking_number',p_tracking_number,'tracking_url',p_tracking_url,'carrier',p_carrier,'status',p_status)) on conflict(dedupe_key) do nothing;
    if p_status='exception' then
      insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values('fulfillment_error',v_order.id,'fulfillment_error:'||v_order.id,jsonb_build_object('reason','Supplier reported a shipment exception')) on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return true;
end;
$$;

create function wakpu.finish_fulfillment(p_job_id uuid,p_worker_id text,p_fulfillment_id uuid,p_provider_order_id text,p_status text,p_cost_cents integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_job wakpu.jobs%rowtype; v_order wakpu.orders%rowtype; v_fo wakpu.fulfillment_orders%rowtype;
  v_limit integer; v_cost_safe boolean; v_order_safe boolean;
begin
  select * into v_job from wakpu.jobs where id=p_job_id and kind='fulfillment' and status='processing' and locked_by=p_worker_id and locked_until>now() for update;
  if not found then return false; end if;
  if p_status not in ('submitted','processing','shipped','delivered') or nullif(p_provider_order_id,'') is null or p_cost_cents is null or p_cost_cents<0 then raise exception 'INVALID_FULFILLMENT_RESULT'; end if;
  select * into v_order from wakpu.orders where id=v_job.order_id for update;
  select * into v_fo from wakpu.fulfillment_orders where id=p_fulfillment_id and order_id=v_job.order_id for update;
  if not found then raise exception 'FULFILLMENT_ORDER_NOT_FOUND'; end if;
  if v_fo.provider_order_id is not null and v_fo.provider_order_id<>p_provider_order_id then raise exception 'SUPPLIER_REFERENCE_MISMATCH'; end if;
  select max_supplier_order_cost_cents into v_limit from wakpu.site_settings where id=true for share;
  v_cost_safe:=v_limit is not null and p_cost_cents<=v_limit and (v_fo.supplier_cost_cents is null or p_cost_cents=v_fo.supplier_cost_cents);
  v_order_safe:=v_order.payment_status='paid' and v_order.order_status not in ('cancelled','refunded','manual_review');
  -- Preserve the external reference even if a refund arrived during the API
  -- call or the supplier reports a cost different from its binding quote.
  -- Persist the reference, cost and review state in the same transaction.
  update wakpu.fulfillment_orders set provider_order_id=p_provider_order_id,
    status=case when v_order_safe and v_cost_safe then p_status else 'manual_review' end,supplier_cost_cents=p_cost_cents,
    last_error=case when not v_cost_safe then 'Supplier cost differs from quote or exceeds the current limit' else null end,locked_until=null
    where id=p_fulfillment_id and order_id=v_job.order_id;
  if v_order_safe and v_cost_safe then
    update wakpu.orders set fulfillment_status=p_status,order_status=case when p_status='submitted' then 'fulfillment_submitted' else p_status end where id=v_job.order_id;
  else
    update wakpu.orders set fulfillment_status='manual_review',order_status=case when order_status in ('refunded','cancelled') then order_status else 'manual_review' end where id=v_job.order_id;
    insert into wakpu.jobs(kind,order_id,dedupe_key,payload) values('fulfillment_error',v_job.order_id,'fulfillment_error:'||v_job.order_id,
      jsonb_build_object('reason',case when not v_cost_safe then 'Supplier cost differs from quote or exceeds the current limit' else 'Payment or review state changed during supplier submission; cancellation must be checked' end)) on conflict(dedupe_key) do nothing;
  end if;
  update wakpu.jobs set status='completed',locked_at=null,locked_until=null,locked_by=null,last_error=null where id=p_job_id;
  return true;
end;
$$;

create function wakpu.dashboard_metrics() returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'orders_today',count(*) filter(where created_at >= (date_trunc('day',now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich')),
    'revenue_today_cents',coalesce(sum(total_cents) filter(where payment_status='paid' and created_at >= (date_trunc('day',now() at time zone 'Europe/Zurich') at time zone 'Europe/Zurich')),0),
    'open_orders',count(*) filter(where payment_status='paid' and order_status not in ('delivered','cancelled','refunded')),
    'fulfillment_errors',count(*) filter(where fulfillment_status in ('failed','manual_review')),
    'shipped_orders',count(*) filter(where fulfillment_status in ('shipped','delivered'))
  ) from wakpu.orders;
$$;

create function wakpu.admin_update_product(
  p_product_id uuid,p_variant_id uuid,p_name text,p_description text,
  p_short_description text,p_active boolean,p_featured boolean,p_sku text,
  p_supplier_sku text,p_price_chf_cents integer,p_stock_mode text
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from wakpu.products where id=p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  perform 1 from wakpu.product_variants where id=p_variant_id and product_id=p_product_id for update;
  if not found then raise exception 'VARIANT_PRODUCT_MISMATCH'; end if;
  update wakpu.products set name=p_name,description=p_description,short_description=p_short_description,active=p_active,featured=p_featured where id=p_product_id;
  update wakpu.product_variants set sku=p_sku,supplier_sku=nullif(trim(p_supplier_sku),''),price_chf_cents=p_price_chf_cents,stock_mode=p_stock_mode,active=p_active where id=p_variant_id;
  return true;
end;
$$;

-- PostgreSQL grants PUBLIC function execution by default. Revoke it explicitly
-- for every security-definer RPC, including authenticated admin browser users.
revoke all on function wakpu.set_updated_at() from public,anon,authenticated;
revoke all on function wakpu.create_pending_order(jsonb,uuid,text) from public,anon,authenticated;
revoke all on function wakpu.freeze_checkout_params(uuid,jsonb) from public,anon,authenticated;
revoke all on function wakpu.finalize_paid_order(text,uuid,text,text,integer,text,jsonb) from public,anon,authenticated;
revoke all on function wakpu.record_payment_event(text,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function wakpu.claim_jobs(text,integer,integer,text[]) from public,anon,authenticated;
revoke all on function wakpu.complete_job(uuid,text) from public,anon,authenticated;
revoke all on function wakpu.defer_job(uuid,text,integer) from public,anon,authenticated;
revoke all on function wakpu.fail_job(uuid,text,text) from public,anon,authenticated;
revoke all on function wakpu.park_job(uuid,text,text) from public,anon,authenticated;
revoke all on function wakpu.finish_fulfillment(uuid,text,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function wakpu.dashboard_metrics() from public,anon,authenticated;
revoke all on function wakpu.admin_update_product(uuid,uuid,text,text,text,boolean,boolean,text,text,integer,text) from public,anon,authenticated;
revoke all on function wakpu.begin_fulfillment(uuid,text,uuid,integer,boolean,timestamptz) from public,anon,authenticated;
revoke all on function wakpu.retry_fulfillment(uuid,text,boolean) from public,anon,authenticated;
revoke all on function wakpu.commit_shipment(uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function wakpu.begin_email(uuid,text,uuid) from public,anon,authenticated;
revoke all on function wakpu.finish_email(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function wakpu.create_pending_order(jsonb,uuid,text) to service_role;
grant execute on function wakpu.freeze_checkout_params(uuid,jsonb) to service_role;
grant execute on function wakpu.finalize_paid_order(text,uuid,text,text,integer,text,jsonb) to service_role;
grant execute on function wakpu.record_payment_event(text,text,text,integer,uuid) to service_role;
grant execute on function wakpu.claim_jobs(text,integer,integer,text[]) to service_role;
grant execute on function wakpu.complete_job(uuid,text) to service_role;
grant execute on function wakpu.defer_job(uuid,text,integer) to service_role;
grant execute on function wakpu.fail_job(uuid,text,text) to service_role;
grant execute on function wakpu.park_job(uuid,text,text) to service_role;
grant execute on function wakpu.finish_fulfillment(uuid,text,uuid,text,text,integer) to service_role;
grant execute on function wakpu.dashboard_metrics() to service_role;
grant execute on function wakpu.admin_update_product(uuid,uuid,text,text,text,boolean,boolean,text,text,integer,text) to service_role;
grant execute on function wakpu.begin_fulfillment(uuid,text,uuid,integer,boolean,timestamptz) to service_role;
grant execute on function wakpu.retry_fulfillment(uuid,text,boolean) to service_role;
grant execute on function wakpu.commit_shipment(uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function wakpu.begin_email(uuid,text,uuid) to service_role;
grant execute on function wakpu.finish_email(uuid,text,uuid,text) to service_role;

insert into wakpu.site_settings(id) values(true) on conflict(id) do nothing;
commit;
