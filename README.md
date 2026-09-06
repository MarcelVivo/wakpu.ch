# WAKPU · CRACK IT. FEEL IT.

Repository: [MarcelVivo/wakpu.ch](https://github.com/MarcelVivo/wakpu.ch)

Eigenständiger Schweizer Shop mit Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS, Supabase, Stripe Checkout und Resend. Preise werden ausschliesslich in Supabase gepflegt. Alle Geldbeträge liegen in Rappen vor. Kein Shopify, keine versteckten Zahlungs- oder Supplier-Simulationen.

**Der Quellcode ist implementiert. Live-Betrieb benötigt deine Konten, Secrets, Unternehmensangaben, freigegebene Produktinformationen und einen echten Lieferanten.** Ohne Konfiguration zeigt die Website einen gestalteten Verkaufsstart-Zustand und nimmt keine Zahlungen an. Die Seed-Daten starten mit `shop_maintenance=true`, `fulfillment_enabled=false`, `legal_ready=false`.

## 1. Lokal installieren

Node.js **22 oder neuer** verwenden; die aktuelle Supabase-Bibliothek benötigt Node 22. `.nvmrc` ist vorhanden.

```bash
nvm use
npm install
cp .env.example .env.local
```

Alternativ `npm ci` für eine reproduzierbare Installation mit der eingecheckten Lockdatei. Pakete sind auf tatsächlich installierte Versionen festgelegt. Der Produktionsbuild nutzt den offiziell unterstützten Webpack-Compiler; der Dev-Server nutzt Turbopack. Geist wird lokal geladen; beim Build werden keine Google Fonts abgerufen.

## 2. Supabase einrichten

1. Neues Supabase-Projekt anlegen. Geeignete Region und Datenbearbeitungsverträge für deinen Betrieb auswählen.
2. Im SQL Editor den vollständigen Inhalt von `supabase/migrations/202609060001_initial_shop.sql` ausführen. Weitere Dateien unter `supabase/migrations/` in Namensreihenfolge danach ausführen, falls vorhanden.
3. Anschliessend `supabase/seed.sql` ausführen. Nur die Seed-Datei enthält die anfänglichen Verkaufspreise. Wiederholtes Seeding setzt vorhandene Produktpreise nicht zurück.
4. Projekt-URL, Anon-Key und Service-Role-Key in `.env.local` setzen. Der Service-Role-Key bleibt ausschliesslich auf dem Server. Die Migration entzieht anonymen und angemeldeten Browsern Zugriff auf Bestellungen, Zahlungen, Jobs, interne Einstellungen, Logs und Lieferanten-SKUs; RLS ist für alle Tabellen aktiv.
5. Unter Authentication einen eigenen Benutzer mit Passwort erstellen und die E-Mail verifizieren/bestätigen. Exakt diese Adresse als `ADMIN_EMAIL` setzen. Es gibt keine öffentliche Registrierung. `/admin/login` prüft Supabase Auth serverseitig und erlaubt nur dieses bestätigte Konto.
6. In `/admin/settings` Kontakt, Unternehmensangaben, Versandhinweise und Kosten eintragen. Alternativ den Singleton-Datensatz `site_settings` (`id=true`) im Supabase Table Editor bearbeiten.
7. Für den **Testbetrieb** Wartungsmodus deaktivieren und Fulfillment aktivieren. `FULFILLMENT_PROVIDER=mock` beibehalten. Mock-Lieferantenkosten sind 0; `max_supplier_order_cost_cents=0` ist für Mock ausreichend. Der Mock gibt deterministische `MOCK-…`-Bestellreferenzen zurück und kauft nichts ein.

Tabellen: `products`, `product_variants`, `orders`, `order_items`, `payments`, `fulfillment_orders`, `shipments`, `webhook_events`, `email_events`, `jobs`, `site_settings`, `verified_claims`, `admin_logs`. `jobs` ist die dauerhafte Outbox mit atomarer Reservierung, Wiederholungen, Backoff und Ablauf von Reservierungen. `site_public_settings` gibt nur öffentliche Angaben frei.

Supabase CLI als Alternative: Projekt verknüpfen, `supabase db push`; Seed gezielt ausführen. `supabase db reset` nur gegen eine entbehrliche lokale Entwicklungsdatenbank verwenden.

## 3. Environment

| Variable | Verwendung |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Lokal `http://localhost:3000`; Produktion exakt `https://wakpu.ch`. Auch Origin-Prüfung und Bestelllinks. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key für Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Privater Serverzugriff, niemals `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | Zunächst `sk_test_…`; Live-Schlüssel erst nach Freigabe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` des jeweiligen lokalen oder produktiven Endpoints |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Für gehosteten Checkout nicht nötig; für spätere Stripe.js-Nutzung reserviert |
| `RESEND_API_KEY` | Resend-Schlüssel mit Sendeberechtigung |
| `RESEND_FROM_EMAIL` | Absender einer in Resend verifizierten Domain |
| `FULFILLMENT_PROVIDER` | `mock`; `cj` und `private_agent` sind absichtlich noch nicht konfigurierte Adapter |
| `ADMIN_EMAIL` | Zugelassenes Supabase-Admin-Konto und Empfänger interner Fehlermeldungen |
| `SUPPORT_EMAIL` | Optionaler Fallback, wenn `site_settings.support_email` leer ist |
| `CRON_SECRET` | Eigenes zufälliges Secret für den Hintergrundlauf |
| `ORDER_ACCESS_SECRET` | Separates Secret mit mindestens 32 Zeichen für signierte Bestelllinks |

Zwei voneinander unabhängige Secrets erzeugen:

```bash
openssl rand -hex 32
openssl rand -hex 32
npm run check:setup
```

`check:setup` gibt nur Variablennamen und Konfigurationsstatus aus. Keine Secrets in Tickets, Logs oder Git eintragen. Eine Änderung von `ORDER_ACCESS_SECRET` macht bestehende Bestelllinks ungültig.

## 4. Stripe konfigurieren und lokal testen

1. Stripe-Konto im Testmodus öffnen; Test-Secret in `.env.local` setzen. Verkaufsland, Darstellung, erlaubte Zahlungsmethoden und rechtliche URLs im Stripe-Dashboard für deinen Betrieb pflegen.
2. Keine Stripe-Produkte manuell nötig: `/api/checkout` lädt Artikelpreise serverseitig aus Supabase und erstellt daraus CHF-Line-Items. Browserpreise werden abgelehnt. Die komplette Stripe-Anfrage wird vor dem ersten API-Aufruf dauerhaft eingefroren, damit Wiederholungen auch nach Preis-, Text- oder Deployment-Änderungen identisch bleiben. Nur Schweizer Lieferadressen sind erlaubt. E-Mail, Rechnungs- und Liefername sowie Adresse werden in Checkout erfasst; eine Telefonnummer wird nicht verlangt.
3. Stripe CLI installieren und anmelden:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,payment_intent.payment_failed,charge.refunded
```

4. Das vom Listener ausgegebene `whsec_…` als **lokales** `STRIPE_WEBHOOK_SECRET` setzen, danach den Dev-Server neu starten.
5. Shop starten:

```bash
npm run dev
```

6. Produkt auswählen, Warenkorb öffnen, zur Kasse. Im Stripe-Testmodus Testkarte `4242 4242 4242 4242`, zukünftiges Ablaufdatum und beliebigen gültigen CVC verwenden. **Keine echten Kartendaten für diesen Test.**
7. `/bestellung/erfolgreich` liest ausschliesslich den bereits gespeicherten Status. Es setzt keine Bestellung auf bezahlt. Bei langsamem Webhook aktualisiert sich die Anzeige kurzzeitig automatisch.

`checkout.session.completed` wird nur bei `payment_status=paid` finalisiert. Asynchrone Zahlungen werden auch über `checkout.session.async_payment_succeeded` verarbeitet. Signaturprüfung erfolgt auf dem unveränderten Request-Body. Der Datenbankvorgang finalisiert Bestellung, Positionen-Snapshot, Zahlungsdatensatz, Webhook-ID und Folgejobs atomar. Teilrückerstattungen bleiben als Teilrückerstattung dokumentiert; nur vollständige Rückerstattungen setzen den Zahlungsstatus auf `refunded`.

Für Wiederholungsprüfungen dasselbe echte Checkout-Event erneut senden: `stripe events resend EVENT_ID --webhook-endpoint WEBHOOK_ENDPOINT_ID` an einen registrierten Test-Endpoint. Ein blindes `stripe trigger checkout.session.completed` enthält keine WAKPU-Bestellreferenz und ist daher kein Shop-End-to-End-Test.

## 5. Resend einrichten

1. Absenderdomain in Resend hinzufügen und die dort angezeigten DNS-Einträge setzen. Verifikation abwarten.
2. `RESEND_API_KEY` und `RESEND_FROM_EMAIL` setzen, zum Beispiel `WAKPU <bestellungen@wakpu.ch>` nach erfolgreicher Verifikation.
3. Supportadresse in den Shop-Einstellungen hinterlegen. Die Support-Mailbox muss unabhängig davon wirklich empfangsfähig sein; Resend richtet keine Mailbox ein.
4. Testbestellung mit einer erlaubten eigenen Empfängeradresse ausführen. Ein eingeschränktes Resend-Testkonto erlaubt gegebenenfalls noch keine beliebigen Empfänger.

Vorlagen: Bestellbestätigung, Versandbestätigung, Tracking-Update, Fulfillment-Fehler nur an Admin, Rückerstattung. Inhalte sind HTML-escaped. `email_events` speichert den identischen Versandauftrag und die Resend-Referenz. Stabile Idempotenzschlüssel verhindern doppelte Nachrichten. Unklare Ergebnisse nach dem Resend-Deduplizierungsfenster werden manuell geprüft, statt möglicherweise erneut gesendet zu werden. Fehlende Resend-Konfiguration hält E-Mail-Jobs in der Outbox; Zahlung und Bestellung gehen dadurch nicht verloren.

## 6. Vollständiger Mock-Test

1. Migration/Seed/Secrets fertig, `shop_maintenance=false`, `fulfillment_enabled=true`, Provider `mock`.
2. Produkt in den Warenkorb legen; CHF-Preis und Versandkosten kontrollieren.
3. Stripe-Testcheckout bezahlen; Webhook-Listener laufen lassen.
4. In Supabase prüfen: genau eine Bestellung, korrekte `order_items`, `payment_status=paid`, Zahlungsreferenz und Webhook-ID.
5. Genau eine `fulfillment_orders`-Zeile mit `MOCK-…`-Referenz; genau ein abgeschlossener Fulfillment-Job.
6. Bestellbestätigung in Resend und `email_events` prüfen.
7. `/admin/orders` öffnen, Bestellung ansehen, **Versand simulieren** anklicken.
8. `shipments`, Test-Trackingnummer, `order_status=shipped` und Versandmail prüfen. Mock-Nachrichten kennzeichnen die Simulation und verlinken keinen erfundenen Carrier.
9. Persönlichen Bestelllink aus der E-Mail öffnen; Status und Sendungsnummer sind sichtbar. Ohne/falschem Token muss 404 erscheinen.
10. Stripe-Event und Versandaktion wiederholen: keine zweite Supplier-Bestellung und keine zweite identische Versandmail.
11. Fulfillment deaktivieren und weitere Testzahlung durchführen: Bestellung bezahlt, Job bleibt liegen. Nach Aktivierung über Admin erneut verarbeiten oder Cron ausführen.
12. Rückerstattung im Stripe-Testdashboard auslösen. Webhook und Status prüfen. Diese Anwendung bietet absichtlich keinen unvollständig abgesicherten Refund-Button.

Die automatisierten Datenbanktests verwenden PostgreSQL via PGlite und echte Migrationen. Sie prüfen die Transaktionen und Sicherheitsgrenzen ohne externe Konten. Ein erfolgreiches lokales Testergebnis ersetzt nicht diesen echten Stripe/Supabase/Resend-Test.

## 7. Hintergrundjobs und Wiederholungen

`GET /api/cron/fulfillment-sync` verlangt `Authorization: Bearer CRON_SECRET` und verarbeitet Fulfillment, Tracking-Abgleich und E-Mail-Outbox. Stripe-Webhooks stossen nach dem Commit einen ersten Versuch über Next `after()` an. Cron übernimmt Wiederholungen bei Abbruch oder temporären Providerfehlern. Supplier-Timeouts mit unklarem Ergebnis dürfen nur mit garantierter Provider-Idempotenz erneut übertragen werden.

Lokal mit gesetztem Shell-Secret testen:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fulfillment-sync
```

Die `.env.local` wird von Next geladen, nicht automatisch von deiner Shell. Secrets nicht in gemeinsam sichtbare Screenshots oder Logs schreiben.

`vercel.json` enthält einen Fünf-Minuten-Cron. **Dafür ist ein Vercel-Tarif mit dieser Cron-Frequenz nötig (z. B. Pro); Hobby unterstützt diese Frequenz nicht.** Bei Hobby den Cron aus `vercel.json` entfernen und einen verlässlichen externen Scheduler mit dem geschützten Endpoint einrichten. Keine tägliche Verarbeitung für einen produktiven automatischen Shop voraussetzen.

Jobs und Provider-Ausgang bei `manual_review` im Admin/Supabase prüfen. Supplierfehler werden nicht an Kunden ausgegeben. Providerfehler nur ohne Secrets, Adressen und rohe HTTP-Bodies protokollieren. Nicht abgearbeitete Jobs und `email_events.status=manual_review` betrieblich überwachen.

## 8. Deployment auf Vercel

1. In Vercel das GitHub-Repository `MarcelVivo/wakpu.ch` importieren und den Branch `main` als Production-Branch auswählen.
2. Framework Next.js, Root-Verzeichnis dieses Projekt, Node 22, Install `npm ci`, Build `npm run build` einstellen.
3. Environment-Variablen für Production setzen; Preview/Test getrennt mit Stripe-Testschlüsseln und idealerweise separater Supabase-Testdatenbank führen. Keine Produktionsbestellungen aus Preview-Deployments auslösen.
4. Passenden Cron-Tarif festlegen und `CRON_SECRET` in Production setzen. Vercel setzt den Bearer-Header bei Cron-Aufrufen automatisch.
5. Deploy ausführen. Noch keine Live-Verkaufsfreigabe geben, solange die unten genannten Voraussetzungen fehlen.
6. Stripe-Dashboard: Webhook `https://wakpu.ch/api/webhooks/stripe`, oben genannte Events, Secret dieses Endpoints in Vercel setzen. Test- und Live-Endpoints besitzen verschiedene Secrets. Webhook-API-Version auf `2026-08-26.dahlia` setzen, passend zu Stripe SDK 22.6.1. Bei einem späteren SDK-Update gemeinsam prüfen.
7. Resend-Absender verifizieren; Testbestellung auf der veröffentlichten Domain durchführen. Logs, Outbox, Fulfillment und E-Mails kontrollieren.

Dieses Repository wurde nicht automatisch mit einem Vercel-Konto oder DNS-Anbieter verbunden. Ein Build allein ändert keine Domain und veröffentlicht keinen Shop.

## 9. Domains und exakter 301-Redirect

Unter Vercel → Projekt → Settings → Domains alle vier Domains hinzufügen: `wakpu.ch`, `www.wakpu.ch`, `wakppu.ch`, `www.wakppu.ch`. `wakpu.ch` dem Production-Deployment zuweisen. Beim DNS-Anbieter exakt die von Vercel aktuell angezeigten A-/CNAME-Einträge hinterlegen; keine veralteten festen IPs übernehmen. Domain-Verifikation und TLS abwarten.

**Die sekundären Domains ebenfalls diesem Projekt zuweisen**, damit `src/proxy.ts` den expliziten **301** auf `https://wakpu.ch` ausführt. Pfad und Query bleiben erhalten. Vercels pauschale permanente Redirect-Option kann 308 verwenden; für den geforderten 301 ist die implementierte Proxy-Regel massgeblich. `www.wakpu.ch` wird ebenfalls kanonisiert.

```bash
curl -I 'https://wakppu.ch/versand?quelle=test'
curl -I 'https://www.wakppu.ch/'
curl -I 'https://www.wakpu.ch/'
```

Erwartet: HTTP 301, `Location: https://wakpu.ch/…` mit erhaltenem Pfad/Query. Kein Redirect-Loop auf `wakpu.ch`.

## 10. Vor echtem Verkauf

- Echten Lieferanten auswählen; tatsächliche Produktbeschaffenheit, Varianten, Wiederverwendung, Alters-/Sicherheitshinweise und Nachweise prüfen. Keine Material-/Zertifizierungsclaims erfinden. `verified_claims` nur mit belegten Inhalten aktivieren.
- Namen/Firma, Adresse, Kontakt, definitive Versandzeiten, Versandursprung, Kosten und mögliche Importabwicklung festlegen. Nur berechtigte Schweizer-Shop-Angabe aktivieren.
- AGB und Datenschutzerklärung im Admin durch freigegebene Inhalte ersetzen; Datenflüsse und gegebenenfalls Auslandsübermittlungen berücksichtigen. Rechtstextentwürfe sind keine abschliessende rechtliche Prüfung. Erst danach `legal_ready=true`.
- Tatsächliche Produktfotos/-videos einsetzen oder Visualisierung abgleichen. Dokumentation unter `docs/ASSETS.md`.
- Echten Provider implementieren und testen, Supplier-SKUs zuordnen, verbindliche Gesamtkosten vor Übermittlung prüfen. Anleitung `docs/FULFILLMENT_PROVIDER.md`. CJ/private Agent werfen bis zur Implementierung klare Konfigurationsfehler und machen keine erfundenen API-Aufrufe.
- In der jetzigen Version blockiert Live-Stripe mit Mock-Provider den Checkout. Stripe-Testmodus + Mock ist vollständig vorgesehen. Automatisches echtes Fulfillment zusätzlich erst mit `fulfillment_enabled=true` und sinnvoller Kostenobergrenze.
- Supportempfang, Backups, Monitoring von fehlgeschlagenen Jobs, Vercel Firewall/Rate-Limits und die tatsächliche Ende-zu-Ende-Bestellung prüfen.

Relevante Primärquellen: [SECO zu Betreiberangaben und Preisangaben](https://www.kmu.admin.ch/de/die-gesetze-der-schweiz-und-der-eu), [EDÖB zu Auslandsübermittlungen](https://www.edoeb.admin.ch/de/bekanntgabe-von-personendaten-ins-ausland), [Stripe Webhooks](https://docs.stripe.com/webhooks), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Resend Idempotenz](https://resend.com/docs/dashboard/emails/idempotency-keys), [Vercel Cron](https://vercel.com/docs/cron-jobs).

## 11. Qualität prüfen

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
# In einem zweiten Terminal, gegen den laufenden lokalen Server:
npm run test:browser
```

Browser-Prüfungen verwenden Playwright. Falls noch kein Browser installiert ist: `npx playwright install chromium`. Sie prüfen die geforderten Breiten 375, 390, 430, 768, 1024, 1440 und 1920 Pixel, Navigation und Warenkorb. Lighthouse >90 ist ein Ziel und muss am fertigen Deployment mit tatsächlichen Medien gemessen werden; es wird nicht ungeprüft behauptet.

## Struktur

- `src/app`: öffentliche Seiten, Bestellstatus, Admin, Checkout/Webhook/Cron.
- `src/components`: Hero, Produktdarstellung, Cart Drawer, Inhaltsbereiche, Navigation.
- `src/lib`: serverseitige Supabase-/Stripe-/Resend-Clients, Auth, Zod-Validierung, Bestellzugriff, Outbox und Fulfillment.
- `supabase`: Migration und Seed.
- `tests`: Datenbanktransaktionen, Validierung, Zugriffstokens, Fulfillment-Sicherheit und Browser-Prüfungen.
- `docs`: Lieferantenintegration, Medien und spätere Consent-basierte Analytics.

Alle kundenrelevanten Angaben sind konfigurierbar. Keine Fake-Reviews, erfundenen Lieferzeiten oder behaupteten Zertifizierungen; keine Analyse-Skripte in V1.

### Warenkorb-Browsertest mit isolierten Seed-Daten

Der öffentliche Shop verwendet ausschliesslich Supabase. Nur die Browser-Testumgebung kann einen lokalen, schreibgeschützten Supabase-HTTP-Ersatz verwenden. Dieser lädt echte Migration und Seed in eine vergängliche PostgreSQL-Datenbank. Es werden keine Provider kontaktiert, Checkout wird im Browser-Test abgefangen.

Zuerst den gewöhnlichen Dev-Server beenden. In drei Terminals mit Node 22:

```bash
# Terminal 1
node tests/catalog-fixture.mjs
```

```bash
# Terminal 2 – ausschliesslich lokale Testwerte, niemals Vercel-Production!
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54322 \
SUPABASE_SERVICE_ROLE_KEY=fixture-only-key \
NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-only-key npm run dev -- --hostname 127.0.0.1
```

```bash
# Terminal 3
npm run test:cart
```

Anschliessend beide Server beenden und den normalen Shop mit `npm run dev` starten. Die Fixture-Werte werden nicht in `.env.local` geschrieben. `npm run test:http` prüft Origin-/Body-Limits, Webhook-/Cron-Abweisung, geschützte Bestellungen, Admin-Schutz und alle drei 301-Domain-Weiterleitungen gegen den laufenden lokalen Shop.
