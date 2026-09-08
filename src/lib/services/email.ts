import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getResend, isEmailConfigured } from "@/lib/resend/client";
import { renderOrderEmail, type EmailKind } from "@/lib/resend/templates";
import { isEmailRetryWindowOpen } from "@/lib/fulfillment/safety";
import { buildOrderStatusUrl } from "./order-access";
import { claimJobs, deferJob, failJob, finishJob, type WorkerJob } from "./job-queue";
import { isLocale } from "@/i18n/locales";
import { adminEmails } from "@/lib/auth/admin";

const emailKinds: EmailKind[] = ["order_confirmation", "shipping_confirmation", "tracking_update", "fulfillment_error", "refund_confirmation"];
const messageSchema = z.object({ from: z.string().min(3), to: z.union([z.email(), z.array(z.email()).min(1)]), subject: z.string().min(1), html: z.string().min(1), text: z.string().min(1) });

async function emailSnapshot(job: WorkerJob): Promise<z.infer<typeof messageSchema> | null> {
  const db = getAdminSupabase();
  const { data: order, error } = await db.from("orders").select("*,order_items(*)").eq("id", job.order_id).single();
  if (error || !order) throw new Error("Bestellung für E-Mail nicht verfügbar.");
  const { data: settings, error: settingsError } = await db.from("site_settings").select("support_email,default_shipping_text").eq("id", true).single();
  if (settingsError || !settings) throw new Error("E-Mail-Einstellungen nicht verfügbar.");
  const admin = job.kind === "fulfillment_error";
  const recipient = admin ? adminEmails() : order.email;
  if (!recipient || (Array.isArray(recipient) ? !recipient.length : !z.email().safeParse(recipient).success)) return null;
  const locale = admin ? "de" : (isLocale(order.locale) ? order.locale : "de");
  const contents = renderOrderEmail(job.kind as EmailKind, {
    orderNumber: order.order_number, firstName: admin ? "" : order.first_name ?? "",
    totalCents: order.total_cents, shippingCents: order.shipping_cents,
    statusUrl: admin ? new URL(`/dashboard/orders/${order.id}`, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString() : buildOrderStatusUrl(order),
    supportEmail: settings.support_email ?? "", shippingText: settings.default_shipping_text ?? "", locale,
    items: admin ? [] : (order.order_items ?? []).map((item: { product_name: string; quantity: number; total_price_cents: number }) => ({ name: item.product_name, quantity: item.quantity, totalCents: item.total_price_cents })),
    trackingNumber: typeof job.payload.tracking_number === "string" ? job.payload.tracking_number : null,
    trackingUrl: typeof job.payload.tracking_url === "string" ? job.payload.tracking_url : null,
    carrier: typeof job.payload.carrier === "string" ? job.payload.carrier : null,
    refundAmountCents: typeof job.payload.amount_refunded_cents === "number" ? job.payload.amount_refunded_cents : undefined,
    mock: (process.env.FULFILLMENT_PROVIDER ?? "mock") === "mock" && job.kind !== "refund_confirmation" && !admin,
  });
  return messageSchema.parse({ from: process.env.RESEND_FROM_EMAIL, to: recipient, ...contents });
}

async function processEmailJob(job: WorkerJob): Promise<"sent" | "deferred" | "failed"> {
  const db = getAdminSupabase();
  try {
    const { data: existing, error: existingError } = await db.from("email_events").select("*").eq("dedupe_key", job.dedupe_key).maybeSingle();
    if (existingError) throw new Error("E-Mail-Status konnte nicht geprüft werden.");
    if (existing?.status === "sent") { await finishJob(job); return "sent"; }
    if (existing?.status === "manual_review") { await failJob(job, "E-Mail benötigt manuelle Prüfung.", true); return "failed"; }
    if (!isEmailRetryWindowOpen(existing?.first_attempt_at ?? null)) {
      await failJob(job, "E-Mail-Ausgang nach abgelaufenem Deduplizierungsfenster unklar. Manuelle Prüfung erforderlich.", true);
      return "failed";
    }
    const snapshot = existing ? messageSchema.parse(existing.payload) : await emailSnapshot(job);
    if (!snapshot) { await deferJob(job, 3600); return "deferred"; }
    if (!existing) {
      const { error: insertError } = await db.from("email_events").upsert({
        order_id: job.order_id, dedupe_key: job.dedupe_key, event_type: job.kind,
        recipient: Array.isArray(snapshot.to) ? snapshot.to.join(", ") : snapshot.to, payload: snapshot, status: "pending",
      }, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (insertError) throw new Error("E-Mail konnte nicht im Versandjournal gespeichert werden.");
    }
    const { data: event, error: eventError } = await db.from("email_events").select("*").eq("dedupe_key", job.dedupe_key).single();
    if (eventError || !event) throw new Error("E-Mail-Versandjournal konnte nicht geladen werden.");
    if (event.status === "sent") { await finishJob(job); return "sent"; }
    const message = messageSchema.parse(event.payload); // Always reuse the original request, including its recipient.
    const { data: started, error: startError } = await db.rpc("begin_email", {
      p_job_id: job.id, p_worker_id: job.locked_by, p_event_id: event.id,
    });
    if (startError || !started) throw new Error("E-Mail-Versand konnte nicht sicher reserviert werden.");
    const response = await getResend().emails.send(message, { idempotencyKey: `wakpu/${job.id}` });
    if (response.error) {
      const status = response.error.statusCode;
      const permanent = typeof status === "number" && status >= 400 && status < 500 && ![408, 409, 429].includes(status);
      const safeError = `Resend-Versand fehlgeschlagen${status ? ` (HTTP ${status})` : ""}.`;
      await failJob(job, safeError, permanent);
      return "failed";
    }
    if (!response.data?.id) throw new Error("Resend-Antwort ohne Versandreferenz.");
    const { data: finished, error: sentError } = await db.rpc("finish_email", {
      p_job_id: job.id, p_worker_id: job.locked_by, p_event_id: event.id, p_resend_email_id: response.data.id,
    });
    if (sentError || !finished) throw new Error("E-Mail wurde gesendet; Versandreferenz konnte nicht sicher gespeichert werden.");
    return "sent";
  } catch {
    const safeError = "E-Mail-Versand konnte nicht sicher abgeschlossen werden. Erneuter Versuch mit identischem Idempotenzschlüssel.";
    await failJob(job, safeError);
    return "failed";
  }
}

/** Outbox only: messages are sent by an authorised server worker, never by page views. */
export async function processEmailJobs(): Promise<{ sent: number; deferred: number; failed: number; configured: boolean }> {
  const counts = { sent: 0, deferred: 0, failed: 0, configured: isEmailConfigured() };
  if (!counts.configured) return counts;
  const jobs = await claimJobs(`email:${randomUUID()}`, emailKinds);
  for (const job of jobs) counts[await processEmailJob(job)]++;
  return counts;
}
