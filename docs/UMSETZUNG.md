# Übergabe WAKPU – aktualisiert am 7. September 2026

## Ergebnis

Neues eigenständiges Next.js-Projekt aus zuvor leerem Ordner. Implementiert: Landingpage mit generierter Produktvisualisierung und MP4-Fallback, SQL-Katalog, persistentem Warenkorb, Stripe Checkout und signiertem Webhook, Supabase-Bestellungen, unabhängige Fulfillment-Adapter, deterministischer Mock, E-Mail-Outbox mit Resend, geschützte Adminseiten und Bestelllinks, Rechtstextentwürfe, SEO, Domain-Weiterleitungen und Vercel-Konfiguration.

## Geprüft

- 37/37 Tests bestanden: echte PostgreSQL-Migration/RPCs via PGlite, Webhook-/Checkout-Idempotenz, Preis-Snapshots, CHF, Auftragsreservierungen, Refund-Reihenfolgen, Limits, Versand-/E-Mail-Transaktionen, RLS-Rechte, Tokens und Mock über Prozessneustarts. Drei zusätzliche Regressionstests prüfen das gemeinsame Projekt: bestehende `public`-/`auth`-Objekte inklusive Daten und Rechten bleiben erhalten, geerbte breite Standardrechte legen keine privaten WAKPU-Daten offen, ein vorhandenes `wakpu`-Schema stoppt die Installation unverändert.
- ESLint ohne Fehler/Warnungen; strict TypeScript ohne Fehler.
- Produktionsbuild mit `npm run build` (`next build --webpack`) erfolgreich. Turbopack-Build scheiterte in dieser lokalen Umgebung am internen Prozess-Port; der offiziell unterstützte Webpack-Build ist als reproduzierbarer Standard eingestellt.
- Gebaute Website per HTTP gegen isolierte PGlite-Katalog-Fixture geprüft: HTTP 200 und drei Produktkarten; die Fixture verweigert Anfragen ohne `Accept-Profile: wakpu`. Keine echte Supabase-Verbindung für diese Prüfung verwendet.
- Browser: 375, 390, 430, 768, 1024, 1440 und 1920 px; keine horizontalen Überläufe. Zusätzlich WebKit/iPhone 390 px geprüft.
- Warenkorb mit tatsächlichem SQL-Seed in isolierter Testdatenbank: Add/Remove, Menge, Reload/Persistenz, gefälschte Browserpreise, Sticky-Leiste, Checkout-Request und Fehlerfall geprüft.
- 301 auf allen drei Alias-Domains mit erhaltenem Pfad/Query lokal per Host-Header geprüft.
- Keine echten Zahlungen, Bestellungen bei Lieferanten oder E-Mails ausgelöst.
- Lighthouse-Ziel >90 wurde nicht gemessen. Die vollständige externe Stripe/Supabase/Resend-Kette muss nach Einrichtung mit einer Testbestellung nachgewiesen werden.

## Ausgeführte Hauptbefehle

```text
npm install --save-exact
npm install --prefix /private/tmp/wakpu-toolchain node@22
npm install --package-lock-only --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build
npm run build -- --webpack  (Compiler-Gegenprüfung vor Festlegung)
npm run dev -- --hostname 127.0.0.1
npm run test:browser
node tests/catalog-fixture.mjs
node tests/cart-browser.mjs
node tests/http-smoke.mjs
npm run check:setup
```

Prüfungen liefen mit Node 22.23.2 aus dem isolierten temporären Toolchain-Ordner, da systemseitig zunächst Node 20 aktiv war. Einige Netzwerk-/IPC-/Browserbefehle benötigten Sandbox-Freigabe. `check:setup` meldet erwartungsgemäss fehlende Konfiguration und liefert Exit 1, solange noch keine `.env.local` ausgefüllt ist.

## Noch einzurichten

1. `.env.example` nach `.env.local` kopieren. Pflichtangaben: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`, `CRON_SECRET`, `ORDER_ACCESS_SECRET`. Provider zunächst `mock`. Der Stripe-Publishable-Key ist für gehosteten Checkout optional.
2. Bestehendes Supabase-Projekt `marcelspahr-ch` verwenden, Initialmigration und Seed im eigenen Schema `wakpu` ausführen und `wakpu` zu den Exposed schemas hinzufügen. Bestätigtes eigenes Admin-Konto verwenden. Anleitung: `docs/SUPABASE_SHARED_PROJECT.md`. Für Mock-Test nach Konfiguration Wartungsmodus deaktivieren und Fulfillment aktivieren.
3. Stripe-Testschlüssel und Webhook einrichten; API-Version `2026-08-26.dahlia`. Echte Testbestellung über den Shop durchführen.
4. Resend-Domain verifizieren, Absender und Schlüssel setzen; Bestell-/Versandmails kontrollieren.
5. Unternehmensangaben, Lieferzeit/-ursprung, geprüfte Produktinformationen und freigegebene AGB/Datenschutz ergänzen.
6. Vercel-Projekt und alle Domains verbinden. Cron-Frequenz benötigt passenden Vercel-Tarif oder externen Scheduler. DNS/TLS und 301 über öffentliche Domains prüfen.
7. Echter Dropshipping-Provider: Lieferant/Konto, dokumentierte API, reale SKU-Zuordnung, verbindliches CHF-Gesamtkostenangebot, Idempotenz, Tracking und Fehlerbehandlung implementieren. CJ/private Agent sind ausdrücklich noch unimplementierte Adapter. Live-Checkout mit Mock bleibt gesperrt.

Detaillierte Schritte und Testreihenfolge: `README.md`. Lieferantenvertrag: `docs/FULFILLMENT_PROVIDER.md`. Bildpfad, Generierungsprompt und Fontlizenz: `docs/ASSETS.md` und `public/fonts/OFL.txt`.

## Neu erstellte Projektdateien

Alle Projektdateien wurden neu erstellt; im Ausgangsordner waren keine bestehenden Dateien. `AGENTS.md` und `CLAUDE.md` wurden von Next.js automatisch erzeugt. Build-Artefakte und Abhängigkeiten sind hier ausgelassen.

```text
.env.example
.gitignore
.nvmrc
AGENTS.md
CLAUDE.md
README.md
docs/ANALYTICS.md
docs/ASSETS.md
docs/FULFILLMENT_PROVIDER.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
public/fonts/OFL.txt
public/fonts/geist-latin.woff2
public/images/wakpu-hero.png
scripts/check-setup.mjs
src/app/admin/actions.ts
src/app/admin/admin.css
src/app/admin/layout.tsx
src/app/admin/login/page.tsx
src/app/admin/orders/[id]/page.tsx
src/app/admin/orders/page.tsx
src/app/admin/page.tsx
src/app/admin/products/page.tsx
src/app/admin/settings/page.tsx
src/app/agb/page.tsx
src/app/api/checkout/route.ts
src/app/api/cron/fulfillment-sync/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/bestellung/[orderNumber]/page.tsx
src/app/bestellung/erfolgreich/page.tsx
src/app/bestellung/erfolgreich/refresh.tsx
src/app/datenschutz/page.tsx
src/app/error.tsx
src/app/global-error.tsx
src/app/globals.css
src/app/impressum/page.tsx
src/app/kontakt/page.tsx
src/app/layout.tsx
src/app/not-found.tsx
src/app/page.tsx
src/app/robots.ts
src/app/sitemap.ts
src/app/versand/page.tsx
src/components/admin/AdminNav.tsx
src/components/cart/CartDrawer.tsx
src/components/cart/CartProvider.tsx
src/components/cart/MobileCartBar.tsx
src/components/hero/Hero.tsx
src/components/hero/HeroMedia.tsx
src/components/layout/Footer.tsx
src/components/layout/Header.tsx
src/components/layout/Logo.tsx
src/components/product/AddToCartButton.tsx
src/components/product/ProductCard.tsx
src/components/product/ProductGrid.tsx
src/components/product/ProductVisual.tsx
src/components/product/price.ts
src/components/sections/FAQ.tsx
src/components/sections/HowItWorks.tsx
src/components/sections/ParentTrust.tsx
src/components/sections/ProductDemo.tsx
src/lib/auth/admin.ts
src/lib/catalog.ts
src/lib/env.ts
src/lib/fulfillment/cj-provider.ts
src/lib/fulfillment/mock-provider.ts
src/lib/fulfillment/private-agent-provider.ts
src/lib/fulfillment/provider-factory.ts
src/lib/fulfillment/provider.ts
src/lib/fulfillment/safety.ts
src/lib/fulfillment/types.ts
src/lib/http.ts
src/lib/logger.ts
src/lib/resend/client.ts
src/lib/resend/templates/index.ts
src/lib/services/email.ts
src/lib/services/fulfillment.ts
src/lib/services/job-queue.ts
src/lib/services/order-access.ts
src/lib/services/orders.ts
src/lib/status.ts
src/lib/stripe/checkout.ts
src/lib/stripe/server.ts
src/lib/stripe/webhook.ts
src/lib/supabase/admin.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/validation/order.ts
src/lib/validation/request.ts
src/proxy.ts
src/types/catalog.ts
src/types/database.ts
supabase/migrations/202609060001_initial_shop.sql
supabase/seed.sql
tests/browser.mjs
tests/cart-browser.mjs
tests/catalog-fixture.mjs
tests/checkout-security.test.ts
tests/database.test.ts
tests/fulfillment-safety.test.ts
tests/http-smoke.mjs
tests/mock-provider.test.ts
tests/security.test.ts
tsconfig.json
vercel.json
```
