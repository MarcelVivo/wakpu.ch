import { FulfillmentProviderError, type FulfillmentQuote } from "./types";

export function validateQuote(quote: FulfillmentQuote, maximumCents: number, now = Date.now()): void {
  if (!quote.quoteId || quote.currency !== "CHF" || !Number.isSafeInteger(quote.totalCostCents) || quote.totalCostCents < 0 ||
    !Number.isSafeInteger(maximumCents) || maximumCents < 0 || !Number.isFinite(Date.parse(quote.expiresAt)) || Date.parse(quote.expiresAt) <= now) {
    throw new FulfillmentProviderError("Lieferantenangebot ungültig. Manuelle Prüfung erforderlich.", "permanent");
  }
  if (quote.totalCostCents > maximumCents) {
    throw new FulfillmentProviderError("Lieferantenkosten überschreiten das konfigurierte Limit.", "permanent");
  }
}

export function mayRetrySupplier(error: unknown, submissionStarted: boolean, idempotentCreate: boolean): boolean {
  if (!(error instanceof FulfillmentProviderError)) return !submissionStarted || idempotentCreate;
  if (error.kind === "permanent") return false;
  if (!submissionStarted) return true;
  // A network failure after submission can mean that the supplier accepted it.
  return idempotentCreate;
}

/** Resend retains idempotency keys for 24 hours; use a conservative 23-hour window. */
export function isEmailRetryWindowOpen(firstAttemptAt: string | null, now = Date.now()): boolean {
  if (!firstAttemptAt) return true;
  const firstAttempt = Date.parse(firstAttemptAt);
  return Number.isFinite(firstAttempt) && firstAttempt <= now && now - firstAttempt < 23 * 60 * 60_000;
}
