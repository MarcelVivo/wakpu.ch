import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getFulfillmentProvider } from "@/lib/fulfillment/provider-factory";
import { FulfillmentProviderError, type CreateFulfillmentOrderInput, type TrackingResult } from "@/lib/fulfillment/types";
import { mayRetrySupplier, validateQuote } from "@/lib/fulfillment/safety";
import { safeHttpUrl } from "@/lib/resend/templates";
import { claimJobs, deferJob, enqueueEmail, failJob, finishJob, type WorkerJob } from "./job-queue";

const addressSchema = z.object({
  firstName: z.string().min(1).max(200), lastName: z.string().max(200),
  line1: z.string().min(1).max(300), line2: z.string().max(300).optional(),
  postalCode: z.string().regex(/^\d{4}$/), city: z.string().min(1).max(200), country: z.literal("CH"),
  email: z.email(), phone: z.string().max(80).optional(),
});
const supplierItemsSchema = z.array(z.object({ supplierSku: z.string().trim().min(1).max(200), quantity: z.number().int().positive().max(100) })).min(1).max(100);

async function fulfillmentSettings() {
  const { data, error } = await getAdminSupabase().from("site_settings")
    .select("fulfillment_enabled,max_supplier_order_cost_cents").eq("id", true).single();
  if (error || !data) throw new Error("Fulfillment-Einstellungen sind nicht verfügbar.");
  return data as { fulfillment_enabled: boolean; max_supplier_order_cost_cents: number };
}

function supplierErrorMessage(error: unknown): string {
  // Provider adapters must supply sanitised messages, never raw response bodies or customer data.
  return error instanceof FulfillmentProviderError ? error.message.slice(0, 500) : "Fulfillment konnte nicht sicher abgeschlossen werden. Details bitte beim Provider prüfen.";
}

async function processFulfillmentJob(job: WorkerJob): Promise<"completed" | "deferred" | "failed"> {
  const db = getAdminSupabase();
  let submissionStarted = false;
  let idempotentCreate = false;
  try {
    const settings = await fulfillmentSettings();
    if (!settings.fulfillment_enabled) { await deferJob(job); return "deferred"; }
    const { data: order, error: orderError } = await db.from("orders").select("*,order_items(*)").eq("id", job.order_id).single();
    if (orderError || !order) throw new FulfillmentProviderError("Bestellung fehlt.", "permanent");
    if (order.payment_status !== "paid" || ["cancelled", "refunded"].includes(order.order_status)) {
      await finishJob(job); return "completed";
    }
    const provider = getFulfillmentProvider();
    idempotentCreate = provider.idempotentCreate;
    const idempotencyKey = `wakpu-order:${order.id}`;
    const { error: insertError } = await db.from("fulfillment_orders").upsert({
      order_id: order.id, provider: provider.name, idempotency_key: idempotencyKey, status: "pending",
    }, { onConflict: "order_id", ignoreDuplicates: true });
    if (insertError) throw new Error("Fulfillment-Auftrag konnte nicht erstellt werden.");
    const { data: fulfillment, error: fulfillmentError } = await db.from("fulfillment_orders").select("*").eq("order_id", order.id).single();
    if (fulfillmentError || !fulfillment) throw new Error("Fulfillment-Auftrag konnte nicht geladen werden.");
    if (fulfillment.provider_order_id) { await finishJob(job); return "completed"; }
    if (fulfillment.provider !== provider.name) throw new FulfillmentProviderError("Providerwechsel bei bestehendem Auftrag muss manuell geprüft werden.", "permanent");
    if (fulfillment.status === "manual_review") throw new FulfillmentProviderError("Auftrag wartet auf manuelle Prüfung.", "permanent");
    if (fulfillment.submission_started_at && !provider.idempotentCreate) {
      throw new FulfillmentProviderError("Eine frühere Übermittlung hat einen unbekannten Ausgang. Vor erneutem Versand beim Lieferanten prüfen.", "permanent");
    }
    const address = addressSchema.safeParse({
      firstName: order.first_name, lastName: order.last_name, line1: order.shipping_address_line1,
      line2: order.shipping_address_line2 ?? undefined, postalCode: order.shipping_postal_code,
      city: order.shipping_city, country: order.shipping_country, email: order.email, phone: order.phone ?? undefined,
    });
    const items = supplierItemsSchema.safeParse((order.order_items ?? []).map((item: { supplier_sku: string | null; quantity: number }) => ({ supplierSku: item.supplier_sku, quantity: item.quantity })));
    if (!address.success || !items.success) throw new FulfillmentProviderError("Lieferadresse oder Lieferanten-SKUs fehlen bzw. sind ungültig.", "permanent");
    if (provider.name !== "mock" && items.data.some((item) => item.supplierSku.startsWith("MOCK-"))) {
      throw new FulfillmentProviderError("Mock-SKUs dürfen nicht an einen echten Lieferanten gesendet werden.", "permanent");
    }
    const input: CreateFulfillmentOrderInput = {
      orderId: order.id, orderNumber: order.order_number, idempotencyKey: fulfillment.idempotency_key,
      shippingAddress: address.data, items: items.data, currency: "CHF",
    };
    const quote = await provider.quoteOrder(input);
    validateQuote(quote, settings.max_supplier_order_cost_cents);
    // Recheck mutable safety settings and payment immediately before the external side effect.
    const freshSettings = await fulfillmentSettings();
    if (!freshSettings.fulfillment_enabled) { await deferJob(job); return "deferred"; }
    validateQuote(quote, freshSettings.max_supplier_order_cost_cents);
    const { data: started, error: startError } = await db.rpc("begin_fulfillment", {
      p_job_id: job.id, p_worker_id: job.locked_by, p_fulfillment_id: fulfillment.id,
      p_quote_cost_cents: quote.totalCostCents, p_idempotent_create: provider.idempotentCreate,
      p_quote_expires_at: quote.expiresAt,
    });
    if (startError || !started) {
      if (!(await fulfillmentSettings()).fulfillment_enabled) { await deferJob(job); return "deferred"; }
      throw new FulfillmentProviderError("Bestellung oder Reservierung ist nicht mehr zur Übermittlung freigegeben.", "permanent");
    }
    submissionStarted = true;
    const result = await provider.createOrder(input, quote);
    if (!result.providerOrderId || result.providerOrderId.length > 200 || !Number.isSafeInteger(result.supplierCostCents) || result.supplierCostCents < 0 || result.status === "cancelled") {
      throw new FulfillmentProviderError("Lieferantenantwort muss manuell geprüft werden.", "unknown_outcome");
    }
    const { data: finished, error: finishError } = await db.rpc("finish_fulfillment", {
      p_job_id: job.id, p_worker_id: job.locked_by, p_fulfillment_id: fulfillment.id,
      p_provider_order_id: result.providerOrderId, p_status: result.status, p_cost_cents: result.supplierCostCents,
    });
    if (finishError || !finished) throw new FulfillmentProviderError("Lieferantenantwort konnte nicht sicher gespeichert werden.", "unknown_outcome");
    if (result.supplierCostCents > freshSettings.max_supplier_order_cost_cents || result.supplierCostCents !== quote.totalCostCents) {
      // finish_fulfillment persists the reference AND manual-review state
      // atomically when confirmed costs differ from the binding quote/limit.
      return "failed";
    }
    return "completed";
  } catch (error) {
    const message = supplierErrorMessage(error);
    const retry = mayRetrySupplier(error, submissionStarted, idempotentCreate);
    // The RPC fences all failure writes by the live worker lease. A stale worker
    // must never overwrite a newer supplier reference or state.
    await failJob(job, message, !retry);
    return "failed";
  }
}

export async function processFulfillmentJobs(): Promise<{ completed: number; deferred: number; failed: number; enabled: boolean }> {
  const counts = { completed: 0, deferred: 0, failed: 0, enabled: false };
  if (!(await fulfillmentSettings()).fulfillment_enabled) return counts;
  counts.enabled = true;
  const jobs = await claimJobs(`fulfillment:${randomUUID()}`, ["fulfillment"]);
  for (const job of jobs) counts[await processFulfillmentJob(job)]++;
  return counts;
}

async function saveTracking(fulfillment: { id: string; order_id: string; tracking_number: string | null }, tracking: TrackingResult): Promise<void> {
  if (!tracking.trackingNumber || tracking.status === "pending") return;
  if (tracking.trackingNumber.length > 200) throw new Error("Ungültige Sendungsnummer.");
  const trackingUrl = safeHttpUrl(tracking.trackingUrl);
  const { data, error } = await getAdminSupabase().rpc("commit_shipment", {
    p_fulfillment_id: fulfillment.id, p_tracking_number: tracking.trackingNumber, p_tracking_url: trackingUrl,
    p_carrier: tracking.carrier?.slice(0, 100) ?? null, p_status: tracking.status,
    p_shipped_at: tracking.shippedAt ?? new Date().toISOString(), p_delivered_at: tracking.deliveredAt,
  });
  if (error || !data) throw new Error("Sendung konnte nicht freigegeben oder gespeichert werden.");
}

export async function syncFulfillment(): Promise<{ synced: number; failed: number; enabled: boolean }> {
  const counts = { synced: 0, failed: 0, enabled: false };
  if (!(await fulfillmentSettings()).fulfillment_enabled) return counts;
  counts.enabled = true;
  const db = getAdminSupabase();
  const { data, error } = await db.from("fulfillment_orders").select("*")
    .in("status", ["submitted", "processing", "shipped"]).not("provider_order_id", "is", null)
    .order("updated_at", { ascending: true }).limit(25);
  if (error) throw new Error("Fulfillment-Aufträge konnten nicht geladen werden.");
  for (const fulfillment of data ?? []) {
    if (!(await fulfillmentSettings()).fulfillment_enabled) break;
    try {
      const provider = getFulfillmentProvider(fulfillment.provider);
      if (provider.name === "mock") continue; // Mock transitions only via the explicit admin action.
      const status = await provider.getOrder(fulfillment.provider_order_id);
      if (status.status === "cancelled") {
        await markManualReview(fulfillment.order_id, "Lieferant meldet eine stornierte Bestellung.");
      } else {
        const tracking = await provider.getTracking(fulfillment.provider_order_id);
        await saveTracking(fulfillment, tracking);
        if (tracking.status === "pending") {
          const terminalWithoutTracking = status.status === "shipped" || status.status === "delivered";
          const { error: updateError } = await db.from("fulfillment_orders").update({
            status: terminalWithoutTracking ? fulfillment.status : status.status,
            last_error: terminalWithoutTracking ? "Lieferant meldet Versand ohne Sendungsinformationen. Abgleich wird wiederholt." : null,
          }).eq("id", fulfillment.id).eq("updated_at", fulfillment.updated_at);
          if (updateError) throw new Error("Lieferantenstatus konnte nicht gespeichert werden.");
        }
      }
      counts.synced++;
    } catch {
      counts.failed++;
      const { error: updateError } = await db.from("fulfillment_orders").update({ last_error: "Tracking-Abgleich fehlgeschlagen. Wird beim nächsten Lauf erneut geprüft." }).eq("id", fulfillment.id).eq("updated_at", fulfillment.updated_at);
      if (updateError) throw new Error("Tracking-Fehler konnte nicht gespeichert werden.");
    }
  }
  return counts;
}

export async function retryFulfillment(orderId: string): Promise<void> {
  z.uuid().parse(orderId);
  if (!(await fulfillmentSettings()).fulfillment_enabled) throw new Error("Fulfillment ist deaktiviert. Bitte zuerst in den Einstellungen aktivieren.");
  const db = getAdminSupabase();
  const { data: order, error: orderError } = await db.from("orders").select("payment_status,order_status").eq("id", orderId).single();
  if (orderError || !order || order.payment_status !== "paid" || ["shipped", "delivered", "cancelled", "refunded"].includes(order.order_status)) throw new Error("Diese Bestellung kann nicht erneut übermittelt werden.");
  const { data: fulfillment, error } = await db.from("fulfillment_orders").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw new Error("Fulfillment-Auftrag konnte nicht geprüft werden.");
  if (fulfillment?.provider_order_id) throw new Error("Die Bestellung wurde bereits beim Lieferanten erstellt.");
  const provider = getFulfillmentProvider();
  if (fulfillment && (fulfillment.provider !== provider.name || (fulfillment.submission_started_at && !provider.idempotentCreate))) {
    throw new Error("Unklarer Lieferantenstatus. Vor einem erneuten Versuch direkt beim Lieferanten prüfen.");
  }
  const { data: job, error: jobError } = await db.from("jobs").select("id,status,locked_until").eq("dedupe_key", `fulfillment:${orderId}`).maybeSingle();
  if (jobError) throw new Error("Fulfillment-Auftrag konnte nicht geprüft werden.");
  if (job?.status === "processing") throw new Error("Ein Fulfillment-Versuch läuft bereits. Bitte die Verarbeitung abwarten.");
  const { data: queued, error: retryError } = await db.rpc("retry_fulfillment", {
    p_order_id: orderId, p_provider: provider.name, p_idempotent_create: provider.idempotentCreate,
  });
  if (retryError || !queued) throw new Error("Erneuter Versuch konnte nicht freigegeben werden. Bitte den aktuellen Bestell- und Lieferantenstatus prüfen.");
}

export async function markManualReview(orderId: string, reason = "Vom Admin zur manuellen Prüfung markiert."): Promise<void> {
  z.uuid().parse(orderId);
  const db = getAdminSupabase();
  const { error } = await db.from("orders").update({ order_status: "manual_review", fulfillment_status: "manual_review" }).eq("id", orderId).eq("payment_status", "paid");
  if (error) throw new Error("Bestellung konnte nicht zur Prüfung markiert werden.");
  const { error: fulfillmentError } = await db.from("fulfillment_orders").update({ status: "manual_review", last_error: reason.slice(0, 500) }).eq("order_id", orderId);
  if (fulfillmentError) throw new Error("Fulfillment konnte nicht zur Prüfung markiert werden.");
  const { error: jobsError } = await db.from("jobs").update({ status: "failed", locked_by: null, locked_until: null, last_error: reason.slice(0, 500) })
    .eq("order_id", orderId).eq("kind", "fulfillment").eq("status", "pending");
  if (jobsError) throw new Error("Fulfillment-Auftrag konnte nicht gestoppt werden.");
  await enqueueEmail("fulfillment_error", orderId, `fulfillment_error:${orderId}`);
}

export async function simulateShipped(orderId: string): Promise<void> {
  z.uuid().parse(orderId);
  if (getFulfillmentProvider().name !== "mock") throw new Error("Versandsimulation ist nur im Mock-Modus verfügbar.");
  if (!(await fulfillmentSettings()).fulfillment_enabled) throw new Error("Fulfillment ist deaktiviert.");
  const db = getAdminSupabase();
  const { data: order, error: orderError } = await db.from("orders").select("payment_status,order_status").eq("id", orderId).single();
  if (orderError || !order || order.payment_status !== "paid" || ["cancelled", "refunded", "manual_review", "delivered"].includes(order.order_status)) throw new Error("Diese Bestellung ist nicht für einen simulierten Versand freigegeben.");
  const { data, error } = await db.from("fulfillment_orders").select("*").eq("order_id", orderId).eq("provider", "mock").single();
  if (error || !data?.provider_order_id) throw new Error("Zuerst muss Mock-Fulfillment erfolgreich verarbeitet werden.");
  const existing = await getFulfillmentProvider("mock").getTracking(data.provider_order_id);
  await saveTracking(data, {
    carrier: "WAKPU Mock · Testsendung", trackingNumber: `TEST-${data.provider_order_id}`,
    trackingUrl: null, status: "shipped", shippedAt: existing.shippedAt ?? new Date().toISOString(), deliveredAt: null,
  });
}
