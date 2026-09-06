import "server-only";
import { CjFulfillmentProvider } from "./cj-provider";
import { MockFulfillmentProvider } from "./mock-provider";
import { PrivateAgentFulfillmentProvider } from "./private-agent-provider";
import { FulfillmentProviderError, type FulfillmentProvider } from "./types";

export function getFulfillmentProvider(name = process.env.FULFILLMENT_PROVIDER ?? "mock"): FulfillmentProvider {
  switch (name) {
    case "mock": return new MockFulfillmentProvider();
    case "cj": return new CjFulfillmentProvider();
    case "private_agent": return new PrivateAgentFulfillmentProvider();
    default: throw new FulfillmentProviderError("Unbekannter Fulfillment-Provider.", "permanent");
  }
}
