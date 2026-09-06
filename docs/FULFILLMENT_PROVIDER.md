# Fulfillment-Provider anbinden

Der Shop kann Zahlungen, Bestellungen und E-Mails unabhängig vom späteren Lieferanten verarbeiten. `FULFILLMENT_PROVIDER=mock` ist vollständig implementiert. `cj` und `private_agent` sind absichtlich gesperrte Integrationsgerüste: Sie enthalten keine erfundenen Endpoints und lösen keine Lieferantenbestellungen aus.

## Komponenten und Ablauf

- `src/lib/fulfillment/types.ts`: gemeinsamer Vertrag für Angebote, Aufträge und Tracking.
- `provider-factory.ts`: Auswahl über `FULFILLMENT_PROVIDER`.
- `mock-provider.ts`: reproduzierbare Testreferenz, keine externen Aufrufe und keine Lieferantenkosten.
- `src/lib/services/fulfillment.ts`: Validierung, Kostengrenze, Übermittlung, Wiederholungen, Tracking und Admin-Aktionen.
- `src/lib/services/email.ts`: dauerhafte E-Mail-Warteschlange über Resend.
- `supabase/migrations/202609060001_initial_shop.sql`: Aufträge, einmalige Schlüssel und atomare Worker-Reservierungen.

Nur ein signierter Stripe-Webhook bestätigt eine Zahlung. Die Datenbank schreibt dabei atomar den Fulfillment-Auftrag in `jobs` und die Bestellbestätigung in die E-Mail-Warteschlange. Worker lesen ausschliesslich bezahlte Bestellungen und reservieren Aufträge über `claim_jobs` mit `FOR UPDATE SKIP LOCKED`. Die Reservierung läuft nach fünf Minuten ab. Fehlgeschlagene Versuche werden mit exponentieller Wartezeit und maximal fünf Versuchen wiederholt. Eine abgeschlossene oder bereits extern angelegte Bestellung wird nicht nochmals übermittelt.

`site_settings.fulfillment_enabled` ist initial `false`. Solange es ausgeschaltet bleibt, werden weder Mock-Aufträge noch echte Bestellungen, Tracking-Abgleiche oder Versandsimulationen ausgeführt. Der Shop kann Bestellbestätigungen weiterhin aus der separaten Warteschlange versenden. Eine administrative Markierung zur Prüfung bleibt möglich.

## Vertrag eines echten Providers

Jeder Adapter implementiert `FulfillmentProvider`:

| Methode | Eingabe | Ergebnis |
| --- | --- | --- |
| `quoteOrder(input)` | Bestellung, Lieferadresse, Lieferanten-SKU und Anzahl | Verbindliche Angebots-ID, Gesamtkosten in CHF-Rappen, Ablaufzeit |
| `createOrder(input, quote)` | Dieselbe Bestellung, stabiler Idempotenzschlüssel und gültiges Angebot | Externe Auftrags-ID, normalisierter Status, bestätigte Gesamtkosten |
| `getOrder(providerOrderId)` | Externe Auftrags-ID | `submitted`, `processing`, `shipped`, `delivered` oder `cancelled` |
| `getTracking(providerOrderId)` | Externe Auftrags-ID | Carrier, Trackingnummer, HTTPS-URL, Versand-/Zustellzeitpunkt |
| `cancelOrder(providerOrderId)` | Optional: externe Auftrags-ID | Bestätigung, ob tatsächlich storniert wurde |

Die Lieferadresse enthält Vorname, Nachname, Strasse, optionalen Adresszusatz, vierstellige Schweizer Postleitzahl, Ort, Land `CH`, E-Mail und optional Telefon. Die Artikel enthalten die **Lieferanten-SKU als Bestellsnapshot** und Anzahl. Ein Bundle besitzt eine eigene Lieferanten-SKU; der Lieferant muss deren Packungsgrösse kennen. Produktnamen und Verkaufspreise sind keine Einkaufsanweisung.

Die Kostengrenze wird **vor** `createOrder` kontrolliert. `quoteOrder` muss den gesamten Einkauf einschliesslich Versand, Gebühren und gegebenenfalls Steuern abdecken. Unbekannte Kosten, fremde Währung, abgelaufene Angebote oder Kosten über `max_supplier_order_cost_cents` stoppen die Übermittlung und verlangen eine manuelle Prüfung. Bei einem Anbieter ohne verbindliche Gesamtkosten-Offerte ist automatische Übermittlung erst nach einer belastbaren Alternative freizugeben. Liefert der Anbieter nach Annahme abweichende Kosten, bleibt seine Auftragsreferenz gespeichert und der Auftrag wird zur Prüfung markiert; eine bereits erfolgte Bestellung lässt sich dadurch nicht rückgängig machen.

## Idempotenz und unklarer Ausgang

Der Schlüssel `wakpu-order:<order_uuid>` bleibt über alle Versuche unverändert. `fulfillment_orders.order_id` ist eindeutig. Der Adapter muss diesen Schlüssel an die dokumentierte Dedup-Funktion des Lieferanten weitergeben oder eine gleichwertige, zuverlässig abgeglichene eigene Bestellreferenz verwenden.

`idempotentCreate=true` darf nur gesetzt werden, wenn der Lieferant parallele Anfragen und Wiederholungen über die **gesamte Lebensdauer** der Bestellung dedupliziert. Eine zeitlich befristete API-Garantie allein genügt dafür nicht. Ein blosser lokaler Suchlauf vor `createOrder` verhindert keine Parallelitätsrennen. Implementiere bei Bedarf eine dokumentierte Abfrage anhand der Bestellreferenz und einen Prozess für unklare Resultate.

Vor dem externen Aufruf speichert der Shop `submission_started_at`. Bricht die Verbindung danach bei einem nicht idempotenten Provider ab, bleibt die Bestellung in `manual_review`; der Admin-Button kann sie nicht blind nochmals übermitteln. Zuerst direkt beim Lieferanten klären, ob die Bestellung vorhanden ist, und die externe Referenz zuordnen. Bei vorhandenem `provider_order_id` ist erneute Übermittlung ebenfalls gesperrt. Nach einem Providerwechsel werden bestehende Aufträge nicht stillschweigend beim neuen Anbieter angelegt.

Providerfehler werden als `FulfillmentProviderError` klassifiziert: `transient` vor einer Übermittlung darf wiederholt werden; `permanent` erfordert Prüfung; `unknown_outcome` nach einem Aufruf erfordert verlässliche Idempotenz oder manuelle Prüfung. Keine ungefilterten API-Antworten, Adressen, Tokens oder Zugangsdaten in Fehlermeldungen schreiben. Jeder HTTP-Aufruf braucht einen begrenzten Timeout (empfohlen höchstens 20 Sekunden), kontrollierte Statuszuordnung und validierte Antworten.

Eine Rückerstattung während einer laufenden Übermittlung kann die externe Bestellung nicht automatisch zurücknehmen. Die Datenbank bewahrt die externe Referenz, verhindert das Zurücksetzen auf bezahlt und markiert Fulfillment zur Prüfung. Der Betreiber muss eine eventuelle Lieferantenstornierung kontrollieren.

## CJ oder privaten Agenten ergänzen

1. Lieferantenvertrag, erlaubte Lieferländer, Produkt-/Bundle-SKUs, Lagerbestand, Versandursprung, Gesamtkosten, Lieferzeit und erforderliche Produktnachweise klären.
2. Aktuelle offizielle Dokumentation und Sandbox-Zugang beziehen. Erst danach echte Endpoints, Authentifizierung und Rate Limits implementieren.
3. `cj-provider.ts` oder `private-agent-provider.ts` ausfüllen. Credentials ausschliesslich in serverseitige Environment-Variablen aufnehmen; keine Secrets im Browser oder Repository.
4. Zuerst Angebot, anschliessend Bestellung und Abgleich anhand stabiler Referenz umsetzen. Ohne nachweisbare Idempotenz `idempotentCreate=false` beibehalten.
5. Providerantworten auf lokale Statuswerte abbilden, Kosten in CHF-Rappen prüfen, Tracking-URLs validieren und Storno-/Fehlerfälle testen.
6. Die `MOCK-` Lieferanten-SKUs der Varianten durch bestätigte echte SKUs ersetzen. Die App blockiert Mock-SKUs bei echten Providern.
7. Einen bezahlten Testauftrag mit realistischem Gesamtpreis, Wiederholung, Timeout, Rückerstattung und Tracking in einer Sandbox durchspielen.
8. Den gewünschten Provider konfigurieren, ein sinnvolles Kostenlimit in den Admin-Einstellungen setzen und erst danach `fulfillment_enabled=true` aktivieren.

Ein Wechsel benötigt keine Änderungen an Warenkorb oder Checkout. Neue Credential-Namen müssen in `.env.example` und Deployment-Dokumentation ergänzt werden. Die vorhandenen Skeletons bleiben bis zur tatsächlichen Implementierung explizit nicht funktionsfähig.

## Mock vollständig testen

1. Migration und Seed einspielen; Supabase, Stripe-Testschlüssel, Resend-Testabsender und `ORDER_ACCESS_SECRET` konfigurieren.
2. `FULFILLMENT_PROVIDER=mock` wählen. In den Admin-Einstellungen Fulfillment für den Test aktivieren. Das Kostenlimit darf für Mock `0` sein, weil kein Einkauf stattfindet.
3. Einen Stripe-Testcheckout abschliessen und den signierten Webhook zustellen lassen.
4. Der Worker speichert eine deterministische `MOCK-…` Referenz und den Status `processing`. Webhook erneut zustellen und den Worker mehrfach ausführen: Referenz und Fulfillment-Auftrag bleiben dieselben.
5. Im geschützten Admin-Bereich **Simulate Shipped** wählen. Das speichert `TEST-MOCK-…`, einen klar gekennzeichneten Test-Carrier und `shipped`; es gibt absichtlich keine erfundene öffentliche Tracking-URL.
6. Die Versandmail enthält den signierten Link zur Bestellung. Mock-Kundenmails kennzeichnen den simulierten Versand ausdrücklich. Erneutes Klicken erzeugt keine zweite Versandmail.
7. Unvollständige Lieferanten-SKU, deaktiviertes Fulfillment und ein künstlich überschrittenes Kostenangebot testen. Kein solcher Fall darf eine Supplier-Übermittlung auslösen.

## E-Mail-Warteschlange und Betrieb

Ein E-Mail-Auftrag hat einen eindeutigen `dedupe_key`. `email_events` speichert den ursprünglichen Empfänger, vollständigen Nachrichteninhalt, ersten Versandversuch und die Resend-Referenz. Wiederholungen verwenden denselben Inhalt und denselben Resend-Schlüssel `wakpu/<job_uuid>`. Eine bereits als gesendet gespeicherte Nachricht wird nicht erneut gesendet. Fehlende Resend-Konfiguration lässt die Aufträge unverändert ausstehend; fehlende Admin-Adresse verschiebt nur Admin-Nachrichten.

Resend hält Idempotenzschlüssel 24 Stunden vor. Der Worker stoppt deshalb bereits nach 23 Stunden seit dem ersten Versuch und markiert den Vorgang zur manuellen Prüfung. Bei einem Serverabbruch mit unklarem Resultat zuerst im Resend-Dashboard prüfen, ob die Nachricht versendet wurde. Nicht einfach Journalzeilen löschen oder Schlüssel wechseln. Quelle: [offizielle Resend-Dokumentation zu Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

Der geschützte Cron-Endpoint verarbeitet ausstehende Fulfillment- und E-Mail-Aufträge und synchronisiert offene Lieferantenaufträge. Versand-/Tracking-E-Mails besitzen dauerhafte Schlüssel je Sendungsnummer und Status. Polling und Admin-Wiederholungen können daher dieselbe Versandmail nicht mehrfach einplanen. `fulfillment_orders`, `jobs`, `email_events` und `admin_logs` sind der nachvollziehbare Betriebsverlauf; Fehlerdetails werden Kunden nicht angezeigt.

Bei hohem Volumen Batch-Grösse, Worker-Laufzeit und Cron-Frequenz passend zur Vercel-Laufzeit dimensionieren. Der Startbetrieb verarbeitet maximal fünf reservierte Aufträge pro Worker und 25 Tracking-Aufträge pro Abgleich. Nach bereits bestätigten HTTP-Aufrufen kann kein lokales System allein eine absolute Genau-einmal-Garantie bieten: Lieferant bzw. Resend müssen die dokumentierte Deduplizierung einhalten.
