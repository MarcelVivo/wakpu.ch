import "server-only";
import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  FulfillmentProviderError,
  type CreateFulfillmentOrderInput,
  type CreateFulfillmentOrderResult,
  type FulfillmentOrderResult,
  type FulfillmentProvider,
  type FulfillmentQuote,
  type TrackingResult,
} from "./types";

/** No external request and no supplier purchase: this provider is a test simulator. */
export class MockFulfillmentProvider implements FulfillmentProvider {
  readonly name = "mock" as const;
  readonly idempotentCreate = true;

  async quoteOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentQuote> {
    if (input.items.some((item) => !item.supplierSku.startsWith("MOCK-"))) {
      throw new FulfillmentProviderError("Mock-Modus benötigt MOCK- Lieferanten-SKUs.", "permanent");
    }
    return {
      quoteId: `mock-quote:${input.orderId}`,
      currency: "CHF",
      totalCostCents: 0,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }

  async createOrder(input: CreateFulfillmentOrderInput, quote: FulfillmentQuote): Promise<CreateFulfillmentOrderResult> {
    if (quote.quoteId !== `mock-quote:${input.orderId}` || quote.totalCostCents !== 0 || Date.parse(quote.expiresAt) <= Date.now()) {
      throw new FulfillmentProviderError("Mock-Angebot ist ungültig oder abgelaufen.", "permanent");
    }
    const stableId = createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 20).toUpperCase();
    return { providerOrderId: `MOCK-${stableId}`, status: "processing", supplierCostCents: 0 };
  }

  async getOrder(providerOrderId: string): Promise<FulfillmentOrderResult> {
    const { data, error } = await getAdminSupabase().from("fulfillment_orders")
      .select("status").eq("provider", "mock").eq("provider_order_id", providerOrderId).single();
    if (error || !data) throw new FulfillmentProviderError("Mock-Bestellung nicht gefunden.", "permanent");
    const status = data.status === "delivered" ? "delivered" : data.status === "shipped" ? "shipped" : "processing";
    return { providerOrderId, status };
  }

  async getTracking(providerOrderId: string): Promise<TrackingResult> {
    const db = getAdminSupabase();
    const { data: fulfillment, error } = await db.from("fulfillment_orders")
      .select("id").eq("provider", "mock").eq("provider_order_id", providerOrderId).single();
    if (error || !fulfillment) throw new FulfillmentProviderError("Mock-Bestellung nicht gefunden.", "permanent");
    const { data, error: shipmentError } = await db.from("shipments").select("*")
      .eq("fulfillment_order_id", fulfillment.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (shipmentError) throw new FulfillmentProviderError("Mock-Sendung konnte nicht geladen werden.", "transient");
    return {
      carrier: data?.carrier ?? null,
      trackingNumber: data?.tracking_number ?? null,
      trackingUrl: data?.tracking_url ?? null,
      status: data?.status === "delivered" ? "delivered" : data ? "shipped" : "pending",
      shippedAt: data?.shipped_at ?? null,
      deliveredAt: data?.delivered_at ?? null,
    };
  }
}
