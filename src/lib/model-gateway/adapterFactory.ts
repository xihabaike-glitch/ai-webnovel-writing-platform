import { AnthropicMessagesAdapter, OllamaAdapter, OpenAICompatibleAdapter } from "./adapters.ts";
import { MockAdapter } from "./mockAdapter.ts";
import type { ModelAdapter, ModelProviderId } from "./types.ts";

export interface AdapterProvider {
  providerId: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
}

export function createModelAdapter(provider: AdapterProvider, fetchImpl: typeof fetch = fetch): ModelAdapter {
  const providerId = provider.providerId as ModelProviderId;
  if (providerId === "mock") return new MockAdapter();
  if (providerId === "claude") return new AnthropicMessagesAdapter(provider, fetchImpl);
  if (providerId === "ollama") return new OllamaAdapter(provider, fetchImpl);
  return new OpenAICompatibleAdapter(provider, fetchImpl);
}
