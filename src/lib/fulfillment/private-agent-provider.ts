import "server-only";
import { FulfillmentProviderError, type CreateFulfillmentOrderInput, type CreateFulfillmentOrderResult, type FulfillmentOrderResult, type FulfillmentProvider, type FulfillmentQuote, type TrackingResult } from "./types";

/** No endpoint is assumed: agree on authentication, quotes and deduplication with the agent first. */
export class PrivateAgentFulfillmentProvider implements FulfillmentProvider {
  readonly name = "private_agent" as const;
  readonly idempotentCreate = false;
  private unavailable(): never {
    throw new FulfillmentProviderError("Private-Agent-Integration ist noch nicht eingerichtet. Keine Lieferantenbestellung ausgelöst.", "permanent");
  }
  async quoteOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentQuote> { void input; return this.unavailable(); }
  async createOrder(input: CreateFulfillmentOrderInput, quote: FulfillmentQuote): Promise<CreateFulfillmentOrderResult> { void input; void quote; return this.unavailable(); }
  async getOrder(providerOrderId: string): Promise<FulfillmentOrderResult> { void providerOrderId; return this.unavailable(); }
  async getTracking(providerOrderId: string): Promise<TrackingResult> { void providerOrderId; return this.unavailable(); }
}
