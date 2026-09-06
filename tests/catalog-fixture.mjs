/**
 * LOCAL TEST FIXTURE ONLY. Never imported by the application or deployed.
 * A read-only PostgREST-shaped HTTP surface backed by the actual SQL migration
 * and seed, for browser cart tests without live Supabase/Stripe credentials.
 * It does not implement checkout, authentication, payments or order writes.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
const migration = await readFile(new URL('../supabase/migrations/202609060001_initial_shop.sql', import.meta.url), 'utf8');
await db.exec(migration.replace('create extension if not exists pgcrypto;', ''));
await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
// Only this isolated in-memory database is opened for browser interaction.
await db.exec("update public.site_settings set shop_maintenance=false,default_shipping_text='Testbetrieb: Lieferzeit wird vor dem Verkaufsstart bestätigt.';");
const { rows: catalog } = await db.query(`select p.*, coalesce((select jsonb_agg(v order by v.created_at) from public.product_variants v where v.product_id=p.id and v.active), '[]'::jsonb) as variants from public.products p where p.active order by p.display_order`);
const { rows: settings } = await db.query('select * from public.site_settings');
const port = Number(process.env.WAKPU_FIXTURE_PORT || 54322);
const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(request.url || '/', `http://127.0.0.1:${port}`).pathname;
  if (request.method !== 'GET') { response.writeHead(405); response.end(JSON.stringify({ message: 'Read-only local test fixture' })); return; }
  if (pathname === '/rest/v1/products' || pathname === '/fixtures/catalog') { response.end(JSON.stringify(catalog)); return; }
  if (pathname === '/rest/v1/site_settings') { response.end(JSON.stringify(request.headers.accept?.includes('vnd.pgrst.object') ? settings[0] : settings)); return; }
  if (pathname === '/rest/v1/verified_claims') { response.end('[]'); return; }
  if (pathname === '/health') { response.end(JSON.stringify({ testFixture: true })); return; }
  response.writeHead(404); response.end(JSON.stringify({ message: 'Unsupported test-fixture route' }));
});
server.listen(port, '127.0.0.1', () => console.log(`Read-only WAKPU browser fixture: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
