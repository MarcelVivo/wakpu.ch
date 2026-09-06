import assert from "node:assert/strict";
import test from "node:test";
import { isEmailRetryWindowOpen, mayRetrySupplier, validateQuote } from "../src/lib/fulfillment/safety";
import { FulfillmentProviderError, type FulfillmentQuote } from "../src/lib/fulfillment/types";
import { renderOrderEmail, safeHttpUrl, type OrderEmailData } from "../src/lib/resend/templates";

const now = Date.UTC(2026, 8, 6, 12);
const quote: FulfillmentQuote = { quoteId: "approved-quote", currency: "CHF", totalCostCents: 900, expiresAt: new Date(now + 60_000).toISOString() };

test("supplier cost limit is inclusive and invalid/expired offers fail closed", () => {
  assert.doesNotThrow(() => validateQuote(quote, 900, now));
  assert.throws(() => validateQuote(quote, 899, now), /Limit/);
  assert.throws(() => validateQuote(quote, -1, now), /ungültig/);
  assert.throws(() => validateQuote({ ...quote, totalCostCents: Number.NaN }, 1000, now));
  assert.throws(() => validateQuote({ ...quote, totalCostCents: 900.5 }, 1000, now));
  assert.throws(() => validateQuote({ ...quote, expiresAt: new Date(now).toISOString() }, 1000, now));
  assert.throws(() => validateQuote({ ...quote, currency: "EUR" as "CHF" }, 1000, now));
});

test("unknown supplier outcome never retries a non-idempotent provider", () => {
  const unknown = new FulfillmentProviderError("connection dropped", "unknown_outcome");
  const transient = new FulfillmentProviderError("temporary error", "transient");
  assert.equal(mayRetrySupplier(unknown, true, false), false);
  assert.equal(mayRetrySupplier(transient, true, false), false);
  assert.equal(mayRetrySupplier(new Error("unclassified"), true, false), false);
  assert.equal(mayRetrySupplier(new Error("database unavailable before submission"), false, false), true);
  assert.equal(mayRetrySupplier(unknown, true, true), true);
  assert.equal(mayRetrySupplier(transient, false, false), true);
  assert.equal(mayRetrySupplier(new FulfillmentProviderError("invalid SKU", "permanent"), false, true), false);
});

test("email retries stop before Resend's 24-hour idempotency retention expires", () => {
  assert.equal(isEmailRetryWindowOpen(null, now), true);
  assert.equal(isEmailRetryWindowOpen(new Date(now - 22 * 60 * 60_000).toISOString(), now), true);
  assert.equal(isEmailRetryWindowOpen(new Date(now - 23 * 60 * 60_000).toISOString(), now), false);
  assert.equal(isEmailRetryWindowOpen(new Date(now - 24 * 60 * 60_000).toISOString(), now), false);
  assert.equal(isEmailRetryWindowOpen("broken-timestamp", now), false);
  assert.equal(isEmailRetryWindowOpen(new Date(now + 60_000).toISOString(), now), false);
});

test("email templates escape customer and supplier content and reject executable URLs", () => {
  const data: OrderEmailData = {
    orderNumber: "WK-10001", firstName: '<img src=x onerror="alert(1)">', totalCents: 990, shippingCents: 0,
    statusUrl: "https://wakpu.ch/bestellung/WK-10001?token=secret&test=1", supportEmail: "support@example.com", shippingText: "Wird vor Bestellstart festgelegt.",
    items: [{ name: "WAKPU <script>alert(1)</script>", quantity: 1, totalCents: 990 }],
    trackingNumber: '<svg onload="alert(1)">', trackingUrl: "javascript:alert(1)", mock: true,
  };
  const email = renderOrderEmail("order_confirmation", data);
  assert.match(email.html, /&lt;img/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script|<img|javascript:/);
  assert.match(email.html, /token=secret&amp;test=1/);
  assert.match(email.text, /Testmodus/);
  assert.match(email.text, /CHF 9.90/);
  assert.equal(safeHttpUrl("data:text/html,<script>"), null);
  assert.equal(safeHttpUrl("https://tracking.example.com/123"), "https://tracking.example.com/123");
});
