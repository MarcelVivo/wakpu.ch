export type ProviderName = "mock" | "cj" | "private_agent";
export type ProviderOrderStatus = "submitted" | "processing" | "shipped" | "delivered" | "cancelled";

export interface FulfillmentAddress {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: "CH";
  email: string;
  phone?: string;
}

export interface CreateFulfillmentOrderInput {
  orderId: string;
  orderNumber: string;
  /** Stable for the life of this order, including manual retries. */
  idempotencyKey: string;
  shippingAddress: FulfillmentAddress;
  items: { supplierSku: string; quantity: number }[];
  currency: "CHF";
}

export interface FulfillmentQuote {
  quoteId: string;
  currency: "CHF";
  /** Total including delivery, taxes and all supplier fees. Never a partial estimate. */
  totalCostCents: number;
  expiresAt: string;
}

export interface CreateFulfillmentOrderResult {
  providerOrderId: string;
  status: ProviderOrderStatus;
  supplierCostCents: number;
}

export interface FulfillmentOrderResult {
  providerOrderId: string;
  status: ProviderOrderStatus;
}

export interface TrackingResult {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: "pending" | "shipped" | "delivered";
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface CancelOrderResult { cancelled: boolean }

export interface FulfillmentProvider {
  readonly name: ProviderName;
  /** Must cover concurrent calls and retries for the complete lifetime of an order. */
  readonly idempotentCreate: boolean;
  quoteOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentQuote>;
  createOrder(input: CreateFulfillmentOrderInput, quote: FulfillmentQuote): Promise<CreateFulfillmentOrderResult>;
  getOrder(providerOrderId: string): Promise<FulfillmentOrderResult>;
  getTracking(providerOrderId: string): Promise<TrackingResult>;
  cancelOrder?(providerOrderId: string): Promise<CancelOrderResult>;
}

/** Classify supplier errors without exposing raw API response bodies or customer data. */
export class FulfillmentProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "transient" | "permanent" | "unknown_outcome",
  ) { super(message); this.name = "FulfillmentProviderError"; }
}
