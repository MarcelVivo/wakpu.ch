-- Re-runnable seed. Existing prices, business details and settings are preserved.
-- Only the database owns prices; application source contains no seeded amounts.
begin;
insert into public.products(id,name,slug,description,short_description,active,featured,badge,display_order)
values
 ('11111111-1111-4111-8111-111111111111','WAKPU Single','wakpu-single','Ein Wax-Cracking-Ball mit knackender Aussenschicht und weichem Inneren. Deine Farbe bleibt eine Überraschung.','Einmal cracken. Einmal fühlen.',true,false,null,1),
 ('22222222-2222-4222-8222-222222222222','WAKPU Triple','wakpu-triple','Drei Wax-Cracking-Balls in überraschenden Farben. Zum Ausprobieren und Teilen.','Drei Cracks. Mehr Spass.',true,true,'BELIEBT',2),
 ('33333333-3333-4333-8333-333333333333','WAKPU Party Pack','wakpu-party-pack','Sechs Wax-Cracking-Balls in überraschenden Farben. Für deinen gemeinsamen Crack-Moment.','Zum Teilen, Verschenken oder selber cracken.',true,false,null,3)
on conflict(slug) do nothing;

insert into public.product_variants(id,product_id,sku,name,price_chf_cents,supplier_sku,active,stock_mode)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',id,'WAKPU-MYSTERY-1','Mystery Color',990,'MOCK-WAKPU-1',true,'available' from public.products where slug='wakpu-single'
on conflict(sku) do nothing;
insert into public.product_variants(id,product_id,sku,name,price_chf_cents,supplier_sku,active,stock_mode)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',id,'WAKPU-MYSTERY-3','Mystery Color',2490,'MOCK-WAKPU-3',true,'available' from public.products where slug='wakpu-triple'
on conflict(sku) do nothing;
insert into public.product_variants(id,product_id,sku,name,price_chf_cents,supplier_sku,active,stock_mode)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',id,'WAKPU-MYSTERY-6','Mystery Color',3990,'MOCK-WAKPU-6',true,'available' from public.products where slug='wakpu-party-pack'
on conflict(sku) do nothing;

insert into public.site_settings(id) values(true) on conflict(id) do nothing;
-- Intentionally no fabricated trust claims, reviews, company/address or ETA.
-- Maintenance and live supplier fulfillment remain disabled for safe setup.
commit;
