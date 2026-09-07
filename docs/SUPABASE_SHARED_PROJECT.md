# WAKPU in `marcelspahr-ch` einrichten

Diese Anleitung richtet WAKPU erstmals im bereits bestehenden Supabase-Projekt ein. Alle Shop-Tabellen, Funktionen und die Bestellnummern-Sequenz liegen im eigenen Schema `wakpu`. Die vorhandenen Tabellen für Kunden, Rechnungen und andere Anwendungen bleiben in `public`.

## 1. Datenbank anlegen

Im Supabase-Dashboard oben das Projekt **marcelspahr-ch** und den gewünschten Branch prüfen.

1. Links **SQL Editor** öffnen und eine neue Abfrage erstellen.
2. Den vollständigen Inhalt von [202609060001_initial_shop.sql](../supabase/migrations/202609060001_initial_shop.sql) kopieren und ausführen. Der Anfang enthält `create schema wakpu;`. Die Datei läuft als eine Transaktion.
3. Nach erfolgreichem Abschluss eine weitere Abfrage mit dem vollständigen Inhalt von [seed.sql](../supabase/seed.sql) ausführen.
4. Im **Table Editor** das Schema von `public` auf `wakpu` umstellen. Dort sollten 13 Tabellen und die Ansicht `site_public_settings` vorhanden sein. `products` und `product_variants` enthalten jeweils drei Einträge.

Die Initialmigration wird genau einmal ausgeführt. Bei `schema "wakpu" already exists` den vorhandenen Stand prüfen; kein Schema löschen und keine Datenbank zurücksetzen. Eine ältere WAKPU-Installation im Schema `public` wird durch diese Datei nicht verschoben. Die Seed-Datei darf wiederholt werden und setzt bestehende Preise oder Einstellungen nicht zurück.

Nach dem Seed bleiben Bestellungen pausiert (`shop_maintenance=true`), echtes Fulfillment aus (`fulfillment_enabled=false`) und die Verkaufsfreigabe aus (`legal_ready=false`). Die vorhandenen Produktpreise müssen vor Freigabe fachlich bestätigt werden.

## 2. Schema für die Anwendung verfügbar machen

In den Projekteinstellungen den Bereich **Data API / API settings** öffnen. In **Exposed schemas** den Eintrag `wakpu` ergänzen und speichern. Vorhandene Einträge wie `public` beibehalten, damit andere Anwendungen weiter funktionieren. Die eingeschränkten Datenbankrechte sind in der Migration bereits enthalten; keine pauschalen `GRANT ALL` für Browserrollen hinzufügen.

Die Website wählt `wakpu` fest in den Supabase-Clients aus. Ein eigenes zusätzliches Environment-Feld ist dafür nicht nötig. Supabase beschreibt die API-Auswahl unter [Using Custom Schemas](https://supabase.com/docs/guides/api/using-custom-schemas).

## 3. WAKPU verbinden

Die folgenden Werte des **bestehenden** Supabase-Projekts in den WAKPU-Environment-Variablen lokal und/oder in Vercel hinterlegen:

| Name | Wert |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Projekt-URL von `marcelspahr-ch` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key dieses Projekts |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key, nur serverseitig |
| `NEXT_PUBLIC_SITE_URL` | Die tatsächlich aufgerufene WAKPU-Adresse |
| `ADMIN_EMAIL` | E-Mail des eigenen bestätigten Supabase-Auth-Kontos |

Aktuell ist die veröffentlichte Adresse `https://wakpu-ch.vercel.app`. Lokal muss die URL zur Browseradresse passen, z. B. `http://127.0.0.1:3000`. `https://wakpu.ch` erst verwenden, wenn diese Domain für WAKPU eingerichtet ist. Nach Änderungen an öffentlichen Environment-Werten lokal neu starten und in Vercel neu deployen.

Ein bestehendes bestätigtes eigenes Auth-Konto kann für den WAKPU-Admin verwendet werden. Andere angemeldete Benutzer erhalten durch die Anmeldung keine WAKPU-Adminrechte; WAKPU prüft zusätzlich die exakt hinterlegte `ADMIN_EMAIL`. Die allgemeinen Auth-Einstellungen, Weiterleitungs-URLs, E-Mail-Vorlagen und bestehenden Benutzer des gemeinsamen Projekts nicht ersetzen. Falls eine zusätzliche Weiterleitungs-URL benötigt wird, diese ergänzen.

## 4. Prüfen und weiter einrichten

- Bestehende Anwendungen prüfen: öffentliche Seiten, Anmeldung und relevante Funktionen.
- In WAKPU `/admin/login`, den Produktkatalog und die Shop-Einstellungen prüfen.
- In Supabase CPU, Speicher, Datenbankgrösse und Verbindungen unter realer Nutzung prüfen. Die Tabellenübersicht allein belegt keine ausreichende Kapazität.
- Stripe-Testschlüssel, Webhook, Resend und die übrigen Werte gemäss [README](../README.md) ergänzen und den Bestellablauf im Testmodus durchspielen.

Das Schema trennt Namen und erlaubt eigene Tabellenrechte. Rechenleistung, Auth-Benutzer, Auth-Einstellungen, Backups und Projektverfügbarkeit bleiben gemeinsam. Auch der Service-Role-Key gilt für das ganze Projekt und ist nicht auf `wakpu` beschränkt. Die lokalen Regressionstests prüfen WAKPU-Rechte und den unveränderten Bestand anhand einer separaten Testdatenbank; sie ersetzen keine Prüfung der tatsächlichen Projektkonfiguration.
