-- WAKPU: remember which language a customer used, for checkout and emails.
begin;

alter table wakpu.orders add column locale text not null default 'de' check (locale in ('de','en','fr','it'));
alter table wakpu.waitlist_signups add column locale text not null default 'de' check (locale in ('de','en','fr','it'));

drop function wakpu.create_pending_order(jsonb, uuid, text);

create function wakpu.create_pending_order(
  p_items jsonb, p_request_id uuid default null, p_cart_fingerprint text default null, p_locale text default 'de'
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
  v_locale text := case when p_locale in ('de','en','fr','it') then p_locale else 'de' end;
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
  insert into wakpu.orders(checkout_request_id,cart_fingerprint,subtotal_cents,shipping_cents,total_cents,locale)
    values(p_request_id,p_cart_fingerprint,v_total,v_settings.shipping_cost_cents,v_total + v_settings.shipping_cost_cents,v_locale) returning * into v_order;
  insert into wakpu.order_items(order_id,product_id,variant_id,sku,product_name,variant_name,quantity,unit_price_cents,total_price_cents,supplier_sku)
    select v_order.id,x.product_id,x.variant_id,x.sku,x.product_name,x.variant_name,x.quantity,x.unit_price_cents,x.total_price_cents,x.supplier_sku
    from jsonb_to_recordset(v_snapshot) as x(product_id uuid,variant_id uuid,sku text,product_name text,variant_name text,quantity integer,unit_price_cents integer,total_price_cents integer,supplier_sku text);
  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'subtotal_cents',v_order.subtotal_cents,'shipping_cents',v_order.shipping_cents,'total_cents',v_order.total_cents,'items',v_snapshot,'stripe_checkout_session_id',null);
end;
$$;

revoke all on function wakpu.create_pending_order(jsonb,uuid,text,text) from public,anon,authenticated;
grant execute on function wakpu.create_pending_order(jsonb,uuid,text,text) to service_role;

commit;
