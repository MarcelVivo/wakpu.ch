/** Supabase schema contract. Regenerate with the Supabase CLI after migrations. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus = "pending" | "paid" | "fulfillment_pending" | "fulfillment_submitted" | "processing" | "shipped" | "delivered" | "manual_review" | "cancelled" | "refunded";
export type FulfillmentStatus = "not_started" | "pending" | "submitted" | "processing" | "shipped" | "delivered" | "failed" | "manual_review";
export type JobKind = "fulfillment" | "order_confirmation" | "shipping_confirmation" | "tracking_update" | "fulfillment_error" | "refund_confirmation";
export type EmailKind = Exclude<JobKind, "fulfillment">;
type Timestamps = { created_at: string; updated_at: string };

export type Product = Timestamps & {
  id: string; name: string; slug: string; description: string; short_description: string;
  active: boolean; featured: boolean; badge: string | null; image_url: string | null; display_order: number;
};
export type ProductVariant = Timestamps & {
  id: string; product_id: string; sku: string; name: string; price_chf_cents: number;
  supplier_sku: string | null; active: boolean; stock_mode: "available" | "preorder" | "out_of_stock";
};
export type SiteSettings = Timestamps & {
  id: boolean; fulfillment_enabled: boolean; max_supplier_order_cost_cents: number;
  shop_maintenance: boolean; default_shipping_text: string; shipping_origin_text: string;
  shipping_cost_cents: number; support_email: string; business_name: string;
  business_address: string; business_postal_city: string; business_country: string;
  product_safety_text: string; product_use_text: string; instagram_url: string | null;
  tiktok_url: string | null; swiss_shop_verified: boolean; legal_ready: boolean;
  legal_terms: string; privacy_notice: string;
};
export type PublicSiteSettings = Pick<SiteSettings, "id" | "shop_maintenance" | "default_shipping_text" | "shipping_origin_text" | "shipping_cost_cents" | "support_email" | "business_name" | "business_address" | "business_postal_city" | "business_country" | "product_safety_text" | "product_use_text" | "instagram_url" | "tiktok_url" | "swiss_shop_verified" | "legal_terms" | "privacy_notice">;
export type VerifiedClaim = Timestamps & {
  id: string; title: string; description: string; active: boolean;
  evidence_url: string | null; verified_at: string | null; display_order: number;
};
export type Order = Timestamps & {
  id: string; order_number: string; checkout_request_id: string | null; cart_fingerprint: string | null;
  email: string | null; first_name: string | null; last_name: string | null; phone: string | null;
  shipping_address_line1: string | null; shipping_address_line2: string | null;
  shipping_postal_code: string | null; shipping_city: string | null; shipping_country: "CH" | null;
  currency: "chf"; subtotal_cents: number; shipping_cents: number; total_cents: number;
  payment_status: PaymentStatus; order_status: OrderStatus; stripe_checkout_session_id: string | null;
  stripe_checkout_params: Json | null; stripe_payment_intent_id: string | null; fulfillment_status: FulfillmentStatus;
};
export type OrderItem = {
  id: string; order_id: string; product_id: string | null; variant_id: string | null;
  sku: string; product_name: string; variant_name: string; quantity: number;
  unit_price_cents: number; total_price_cents: number; supplier_sku: string | null; created_at: string;
};
export type Payment = Timestamps & {
  id: string; order_id: string; provider: "stripe"; stripe_payment_intent_id: string;
  stripe_checkout_session_id: string | null; amount_cents: number; amount_refunded_cents: number;
  currency: "chf"; status: PaymentStatus;
};
export type FulfillmentOrder = Timestamps & {
  id: string; order_id: string; provider: string; provider_order_id: string | null;
  idempotency_key: string; status: "pending" | "submitting" | "submitted" | "processing" | "shipped" | "delivered" | "failed" | "manual_review" | "cancelled";
  attempt_count: number; last_error: string | null; supplier_cost_cents: number | null;
  tracking_number: string | null; tracking_url: string | null; next_attempt_at: string | null;
  locked_until: string | null; submission_started_at: string | null;
};
export type Shipment = Timestamps & {
  id: string; order_id: string; fulfillment_order_id: string; carrier: string;
  tracking_number: string; tracking_url: string | null;
  status: "pending" | "shipped" | "in_transit" | "delivered" | "exception";
  shipped_at: string | null; delivered_at: string | null;
};
export type WebhookEvent = {
  id: string; provider: string; event_id: string; event_type: string;
  order_id: string | null; processed_at: string;
};
export type Job = Timestamps & {
  id: string; kind: JobKind; order_id: string; payload: Json;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: number; max_attempts: number; run_after: string;
  locked_at: string | null; locked_until: string | null; locked_by: string | null;
  last_error: string | null; dedupe_key: string;
};
export type EmailEvent = Timestamps & {
  id: string; order_id: string; dedupe_key: string; event_type: EmailKind; recipient: string;
  resend_email_id: string | null; status: "pending" | "sending" | "sent" | "failed" | "manual_review";
  attempt_count: number; next_attempt_at: string | null; locked_until: string | null;
  first_attempt_at: string | null; sent_at: string | null; last_error: string | null; payload: Json;
};
export type AdminLog = {
  id: string; admin_user_id: string | null; action: string; entity_type: string;
  entity_id: string | null; details: Json; created_at: string;
};

type Relationship = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };
type Table<Row, Required extends keyof Row = never, Relations extends Relationship[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relations;
};
type OrderRelation<Name extends string, One extends boolean = false> = {
  foreignKeyName: Name; columns: ["order_id"]; isOneToOne: One; referencedRelation: "orders"; referencedColumns: ["id"];
};

export type Database = {
  public: {
    Tables: {
      products: Table<Product, "name" | "slug">;
      product_variants: Table<ProductVariant, "product_id" | "sku" | "price_chf_cents", [{ foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] }]>;
      site_settings: Table<SiteSettings>;
      verified_claims: Table<VerifiedClaim, "title">;
      orders: Table<Order, "subtotal_cents" | "total_cents">;
      order_items: Table<OrderItem, "order_id" | "sku" | "product_name" | "quantity" | "unit_price_cents" | "total_price_cents", [OrderRelation<"order_items_order_id_fkey">, { foreignKeyName: "order_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "order_items_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] }]>;
      payments: Table<Payment, "order_id" | "stripe_payment_intent_id" | "amount_cents" | "status", [OrderRelation<"payments_order_id_fkey", true>]>;
      fulfillment_orders: Table<FulfillmentOrder, "order_id" | "provider" | "idempotency_key", [OrderRelation<"fulfillment_orders_order_id_fkey", true>]>;
      shipments: Table<Shipment, "order_id" | "fulfillment_order_id" | "carrier" | "tracking_number", [OrderRelation<"shipments_order_id_fkey">, { foreignKeyName: "shipments_fulfillment_order_id_fkey"; columns: ["fulfillment_order_id"]; isOneToOne: false; referencedRelation: "fulfillment_orders"; referencedColumns: ["id"] }]>;
      webhook_events: Table<WebhookEvent, "provider" | "event_id" | "event_type", [OrderRelation<"webhook_events_order_id_fkey">]>;
      jobs: Table<Job, "kind" | "order_id" | "dedupe_key", [OrderRelation<"jobs_order_id_fkey">]>;
      email_events: Table<EmailEvent, "order_id" | "dedupe_key" | "event_type" | "recipient", [OrderRelation<"email_events_order_id_fkey">]>;
      admin_logs: Table<AdminLog, "action" | "entity_type">;
    };
    Views: { site_public_settings: { Row: PublicSiteSettings; Relationships: [] } };
    Functions: {
      create_pending_order: { Args: { p_items: Json; p_request_id?: string; p_cart_fingerprint?: string }; Returns: Json };
      freeze_checkout_params: { Args: { p_order_id: string; p_params: Json }; Returns: Json };
      finalize_paid_order: { Args: { p_event_id: string; p_order_id: string; p_session_id: string; p_payment_intent_id: string; p_amount_total: number; p_currency: string; p_customer: Json }; Returns: Json };
      record_payment_event: { Args: { p_event_id: string; p_event_type: string; p_payment_intent_id: string; p_amount_refunded?: number; p_order_id?: string }; Returns: Json };
      claim_jobs: { Args: { p_worker_id: string; p_limit?: number; p_lease_seconds?: number; p_kinds?: string[] }; Returns: Job[] };
      complete_job: { Args: { p_job_id: string; p_worker_id: string }; Returns: boolean };
      fail_job: { Args: { p_job_id: string; p_worker_id: string; p_error: string }; Returns: boolean };
      park_job: { Args: { p_job_id: string; p_worker_id: string; p_error: string }; Returns: boolean };
      defer_job: { Args: { p_job_id: string; p_worker_id: string; p_seconds: number }; Returns: boolean };
      finish_fulfillment: { Args: { p_job_id: string; p_worker_id: string; p_fulfillment_id: string; p_provider_order_id: string; p_status: string; p_cost_cents: number }; Returns: boolean };
      dashboard_metrics: { Args: Record<string, never>; Returns: Json };
      admin_update_product: { Args: { p_product_id: string; p_variant_id: string; p_name: string; p_description: string; p_short_description: string; p_active: boolean; p_featured: boolean; p_sku: string; p_supplier_sku: string | null; p_price_chf_cents: number; p_stock_mode: string }; Returns: boolean };
      begin_fulfillment: { Args: { p_job_id: string; p_worker_id: string; p_fulfillment_id: string; p_quote_cost_cents: number; p_idempotent_create: boolean; p_quote_expires_at?: string | null }; Returns: boolean };
      retry_fulfillment: { Args: { p_order_id: string; p_provider: string; p_idempotent_create: boolean }; Returns: boolean };
      commit_shipment: { Args: { p_fulfillment_id: string; p_tracking_number: string; p_tracking_url: string | null; p_carrier: string | null; p_status: string; p_shipped_at: string | null; p_delivered_at: string | null }; Returns: boolean };
      begin_email: { Args: { p_job_id: string; p_worker_id: string; p_event_id: string }; Returns: boolean };
      finish_email: { Args: { p_job_id: string; p_worker_id: string; p_event_id: string; p_resend_email_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
