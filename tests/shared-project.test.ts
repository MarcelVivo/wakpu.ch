import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;
let migration: string;
let seed: string;
let existingState: Awaited<ReturnType<typeof snapshotExistingProject>>;

async function createExistingProject(database: PGlite) {
  // Use only synthetic data. Deliberately collide with shop table, sequence and
  // trigger-function names to detect accidental public search-path references.
  await database.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text not null);
    insert into auth.users values('99999999-9999-4999-8999-999999999999','existing@example.test');
    create table public.profiles(id uuid primary key references auth.users(id), display_name text);
    insert into public.profiles values('99999999-9999-4999-8999-999999999999','Existing account');
    create sequence public.order_number_seq start with 900;
    create table public.products(id integer primary key, name text not null);
    create table public.orders(id integer primary key, reference text not null);
    create table public.kunden(id integer primary key, name text not null, updated_at timestamptz);
    insert into public.products values(1,'Existing website product');
    insert into public.orders values(1,'Existing website order');
    insert into public.kunden values(1,'Existing customer','2026-01-01T00:00:00Z');
    create function public.set_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = '2026-02-01T00:00:00Z'; return new; end;
    $$;
    create trigger set_updated_at before update on public.kunden
      for each row execute function public.set_updated_at();
    alter table public.kunden enable row level security;
    create policy existing_customer_access on public.kunden for select to authenticated using (id=1);
    grant select on public.kunden to authenticated;
    grant select(name) on public.products to anon;
    grant usage on schema auth to authenticated;
    revoke all on auth.users from public,anon,authenticated;
    -- Existing broad defaults must not expose new WAKPU private objects, and
    -- installing WAKPU must not rewrite defaults used by the existing website.
    alter default privileges grant all on tables to public,anon,authenticated;
    alter default privileges grant all on sequences to public,anon,authenticated;
    alter default privileges grant execute on functions to anon,authenticated;
  `);
}

async function snapshotExistingProject(database: PGlite) {
  const queries = {
    namespaces: `select nspname,nspowner::regrole::text as owner,nspacl::text from pg_namespace where nspname in ('public','auth') order by nspname`,
    objects: `select n.nspname,c.relname,c.relkind,c.relowner::regrole::text as owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') order by n.nspname,c.relname`,
    columns: `select n.nspname,c.relname,a.attname,a.atttypid::regtype::text as type,a.attnotnull,a.attacl::text,pg_get_expr(d.adbin,d.adrelid) as default_expression
      from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where n.nspname in ('public','auth') and a.attnum>0 and not a.attisdropped order by n.nspname,c.relname,a.attnum`,
    functions: `select n.nspname,p.proname,p.proacl::text,pg_get_functiondef(p.oid) as definition
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth') order by n.nspname,p.proname`,
    constraints: `select n.nspname,c.conname,pg_get_constraintdef(c.oid) as definition
      from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','auth') order by n.nspname,c.conname`,
    triggers: `select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','auth') order by n.nspname,c.relname,t.tgname`,
    policies: `select * from pg_policies where schemaname in ('public','auth') order by schemaname,tablename,policyname`,
    defaults: `select defaclrole::regrole::text as role,defaclnamespace::regnamespace::text as schema,defaclobjtype,defaclacl::text
      from pg_default_acl where defaclnamespace=0 or defaclnamespace in (select oid from pg_namespace where nspname in ('public','auth')) order by role,schema,defaclobjtype`,
    extensions: `select extname,extnamespace::regnamespace::text as schema,extversion from pg_extension order by extname`,
    products: 'select * from public.products order by id',
    orders: 'select * from public.orders order by id',
    customers: 'select * from public.kunden order by id',
    users: 'select * from auth.users order by id',
    profiles: 'select * from public.profiles order by id',
    sequence: 'select last_value,is_called from public.order_number_seq',
  };
  const state: Record<string, unknown[]> = {};
  for (const [name, sql] of Object.entries(queries)) state[name] = (await database.query(sql)).rows;
  return state;
}

async function scalar<T>(sql: string): Promise<T> {
  const { rows } = await db.query<Record<string, T>>(sql);
  return Object.values(rows[0])[0];
}

before(async () => {
  migration = await readFile(new URL('../supabase/migrations/202609060001_initial_shop.sql', import.meta.url), 'utf8');
  seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  db = new PGlite();
  await createExistingProject(db);
  existingState = await snapshotExistingProject(db);
  await db.exec(migration);
  await db.exec(seed);
});
after(async () => { await db?.close(); });

test('installation and repeated seed preserve an existing public/auth project including grants, policies and defaults', async () => {
  assert.deepEqual(await snapshotExistingProject(db), existingState);
  assert.equal(await scalar('select count(*)::int from wakpu.products'), 3);
  await db.exec("update wakpu.products set name='Configured shop product' where slug='wakpu-single';");
  await db.exec('update wakpu.product_variants set price_chf_cents=1190 where sku=\'WAKPU-MYSTERY-1\';');
  await db.exec("update wakpu.site_settings set business_name='Configured business';");
  await db.exec(seed);
  assert.equal(await scalar("select name from wakpu.products where slug='wakpu-single'"), 'Configured shop product');
  assert.equal(await scalar("select price_chf_cents from wakpu.product_variants where sku='WAKPU-MYSTERY-1'"), 1190);
  assert.equal(await scalar('select business_name from wakpu.site_settings'), 'Configured business');
  assert.deepEqual(await snapshotExistingProject(db), existingState);
});

test('shared-project default grants cannot expose private WAKPU data or RPCs and application roles cannot create schema objects', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar(`select has_schema_privilege('${role}','wakpu','USAGE')`), true);
    assert.equal(await scalar(`select has_schema_privilege('${role}','wakpu','CREATE')`), false);
    await db.exec(`set role ${role};`);
    try {
      await assert.rejects(db.exec('create table wakpu.client_created(id integer)'), /permission denied/);
      if (role === 'service_role') {
        await db.exec("update wakpu.site_settings set shop_maintenance=false;");
        const order = await scalar<{ order_id: string; subtotal_cents: number }>(`select wakpu.create_pending_order('[{"variant_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","quantity":1}]'::jsonb)`);
        assert.equal(order.subtotal_cents, 1190);
        assert.equal(await scalar(`select count(*)::int from wakpu.orders where id='${order.order_id}'`), 1);
        assert.equal(await scalar('select count(*)::int from wakpu.order_items'), 1);
        await db.exec('select * from wakpu.dashboard_metrics();');
      } else {
        assert.equal(await scalar('select count(*)::int from wakpu.products'), 3);
        assert.equal(await scalar('select count(id)::int from wakpu.product_variants'), 3);
        assert.equal(await scalar('select business_name from wakpu.site_public_settings'), 'Configured business');
        for (const sql of [
          'select * from wakpu.orders', 'select * from wakpu.order_items', 'select * from wakpu.site_settings',
          'select * from wakpu.payments', 'select * from wakpu.fulfillment_orders', 'select * from wakpu.shipments',
          'select * from wakpu.webhook_events', 'select * from wakpu.jobs', 'select * from wakpu.email_events',
          'select * from wakpu.admin_logs', 'select supplier_sku from wakpu.product_variants',
          'select evidence_url from wakpu.verified_claims', 'select wakpu.dashboard_metrics()',
          "select wakpu.create_pending_order('[]'::jsonb)", "select nextval('wakpu.order_number_seq')",
          'update wakpu.products set active=false',
        ]) await assert.rejects(db.exec(sql), /permission denied/);
      }
    } finally { await db.exec('reset role;'); }
  }
  assert.deepEqual(await snapshotExistingProject(db), existingState);
});

test('an existing wakpu schema stops installation before any existing data or privileges are modified', async () => {
  const occupied = new PGlite();
  try {
    await createExistingProject(occupied);
    await occupied.exec(`create schema wakpu; create table wakpu.keep_me(id integer primary key, value text);
      insert into wakpu.keep_me values(1,'Do not replace'); grant usage on schema wakpu to authenticated;
      grant select on wakpu.keep_me to authenticated;`);
    const oldState = await snapshotExistingProject(occupied);
    const schemaAcl = (await occupied.query("select nspacl::text from pg_namespace where nspname='wakpu'")).rows;
    const objectAcl = (await occupied.query("select relacl::text from pg_class where oid='wakpu.keep_me'::regclass")).rows;
    await assert.rejects(occupied.exec(migration), /schema.*already exists/i);
    await occupied.exec('rollback;');
    assert.deepEqual(await snapshotExistingProject(occupied), oldState);
    assert.deepEqual((await occupied.query('select * from wakpu.keep_me')).rows, [{ id: 1, value: 'Do not replace' }]);
    assert.deepEqual((await occupied.query("select nspacl::text from pg_namespace where nspname='wakpu'")).rows, schemaAcl);
    assert.deepEqual((await occupied.query("select relacl::text from pg_class where oid='wakpu.keep_me'::regclass")).rows, objectAcl);
    assert.deepEqual((await occupied.query("select tablename from pg_tables where schemaname='wakpu'")).rows, [{ tablename: 'keep_me' }]);
  } finally { await occupied.close(); }
});
