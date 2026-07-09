import { CredentialCryptoError, decodeStoredApiKey } from "./credentialCrypto.ts";
import {
  ModelGatewayError,
  requestModelJson,
  type ModelGatewayErrorCategory,
  type ModelRequestTransport,
} from "./requestTransport.ts";
import { getProviderDefaultBaseUrl } from "./providerDefaults.ts";
import type { GenerateRequest, GenerateResult, ModelAdapter } from "./types.ts";

export { ModelGatewayError };
export type { ModelGatewayErrorCategory, ModelRequestTransport };

interface AdapterDependencies {
  requestImpl: ModelRequestTransport;
}

export interface RuntimeModelProvider {
  providerId: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
}

function messagesFromRequest(request: GenerateRequest) {
  return [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userPrompt },
  ];
}

async function requireApiKey(value: string | null | undefined) {
  if (!value) throw new ModelGatewayError("missing_api_key");
  try {
    return (await decodeStoredApiKey(value)).apiKey;
  } catch (error) {
    if (error instanceof CredentialCryptoError && error.code === "credential_secret_invalid") {
      throw new ModelGatewayError("credential_configuration_error");
    }
    throw new ModelGatewayError("credential_error");
  }
}

function payloadFrom<T>(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelGatewayError("invalid_response");
  }
  return value as T;
}

function adapterTransport(dependencies?: typeof fetch | AdapterDependencies) {
  // Legacy fetch injection is ignored because fetch would perform a second DNS resolution.
  return dependencies && typeof dependencies === "object"
    ? dependencies.requestImpl
    : requestModelJson;
}

function openAICompatibleBaseUrl(provider: RuntimeModelProvider) {
  const configuredBaseUrl = provider.baseUrl?.trim();
  if (configuredBaseUrl) return configuredBaseUrl;

  const defaultBaseUrl = getProviderDefaultBaseUrl(provider.providerId);
  if (!defaultBaseUrl) throw new ModelGatewayError("invalid_endpoint");
  return defaultBaseUrl;
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  private readonly provider: RuntimeModelProvider;
  private readonly requestImpl: ModelRequestTransport;

  constructor(provider: RuntimeModelProvider, dependencies?: typeof fetch | AdapterDependencies) {
    this.provider = provider;
    this.requestImpl = adapterTransport(dependencies);
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const response = await this.requestImpl({
      baseUrl: openAICompatibleBaseUrl(this.provider),
      path: "/chat/completions",
      providerId: this.provider.providerId,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await requireApiKey(this.provider.encryptedApiKey)}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: messagesFromRequest(request),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
    });
    const payload = payloadFrom<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    }>(response.payload);
    const text = (Array.isArray(payload.choices) ? payload.choices : [])[0]?.message?.content?.trim();
    if (!text) throw new ModelGatewayError("invalid_response");
    return {
      text,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
      },
    };
  }
}

export class AnthropicMessagesAdapter implements ModelAdapter {
  private readonly provider: RuntimeModelProvider;
  private readonly requestImpl: ModelRequestTransport;

  constructor(provider: RuntimeModelProvider, dependencies?: typeof fetch | AdapterDependencies) {
    this.provider = provider;
    this.requestImpl = adapterTransport(dependencies);
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const response = await this.requestImpl({
      baseUrl: this.provider.baseUrl || "https://api.anthropic.com",
      path: "/v1/messages",
      providerId: this.provider.providerId,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": await requireApiKey(this.provider.encryptedApiKey),
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens ?? 2400,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userPrompt }],
      }),
    });
    const payload = payloadFrom<{
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>(response.payload);
    const text = (Array.isArray(payload.content) ? payload.content : [])
      .filter((block): block is { type: string; text?: string } => Boolean(block) && typeof block === "object")
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) throw new ModelGatewayError("invalid_response");
    return {
      text,
      usage: {
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      },
    };
  }
}

export class OllamaAdapter implements ModelAdapter {
  private readonly provider: RuntimeModelProvider;
  private readonly requestImpl: ModelRequestTransport;

  constructor(provider: RuntimeModelProvider, dependencies?: typeof fetch | AdapterDependencies) {
    this.provider = provider;
    this.requestImpl = adapterTransport(dependencies);
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const response = await this.requestImpl({
      baseUrl: this.provider.baseUrl || "http://localhost:11434",
      path: "/api/chat",
      providerId: "ollama",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        stream: false,
        messages: messagesFromRequest(request),
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
        },
      }),
    });
    const payload = payloadFrom<{
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    }>(response.payload);
    const text = payload.message?.content?.trim();
    if (!text) throw new ModelGatewayError("invalid_response");
    return {
      text,
      usage: {
        inputTokens: payload.prompt_eval_count ?? 0,
        outputTokens: payload.eval_count ?? 0,
      },
    };
  }
}
