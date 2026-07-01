import type { GenerateRequest, GenerateResult, ModelAdapter } from "./types.ts";

type FetchLike = typeof fetch;

export interface RuntimeModelProvider {
  providerId: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function messagesFromRequest(request: GenerateRequest) {
  return [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userPrompt },
  ];
}

function requireApiKey(apiKey: string | null | undefined, providerId: string) {
  if (!apiKey) {
    throw new Error(`${providerId} provider requires an API key.`);
  }
  return apiKey;
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  return text || `${response.status} ${response.statusText}`;
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  private readonly provider: RuntimeModelProvider;
  private readonly fetchImpl: FetchLike;

  constructor(provider: RuntimeModelProvider, fetchImpl: FetchLike = fetch) {
    this.provider = provider;
    this.fetchImpl = fetchImpl;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const baseUrl = this.provider.baseUrl || "https://api.openai.com/v1";
    const apiKey = requireApiKey(this.provider.encryptedApiKey, this.provider.providerId);
    const response = await this.fetchImpl(joinUrl(baseUrl, "/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: messagesFromRequest(request),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Model request failed: ${await readError(response)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Model response did not include message content.");
    }

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
  private readonly fetchImpl: FetchLike;

  constructor(provider: RuntimeModelProvider, fetchImpl: FetchLike = fetch) {
    this.provider = provider;
    this.fetchImpl = fetchImpl;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const baseUrl = this.provider.baseUrl || "https://api.anthropic.com";
    const apiKey = requireApiKey(this.provider.encryptedApiKey, "claude");
    const response = await this.fetchImpl(joinUrl(baseUrl, "/v1/messages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens ?? 2400,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude request failed: ${await readError(response)}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) {
      throw new Error("Claude response did not include text content.");
    }

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
  private readonly fetchImpl: FetchLike;

  constructor(provider: RuntimeModelProvider, fetchImpl: FetchLike = fetch) {
    this.provider = provider;
    this.fetchImpl = fetchImpl;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const baseUrl = this.provider.baseUrl || "http://localhost:11434";
    const response = await this.fetchImpl(joinUrl(baseUrl, "/api/chat"), {
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

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${await readError(response)}`);
    }

    const payload = (await response.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const text = payload.message?.content?.trim();
    if (!text) {
      throw new Error("Ollama response did not include message content.");
    }

    return {
      text,
      usage: {
        inputTokens: payload.prompt_eval_count ?? 0,
        outputTokens: payload.eval_count ?? 0,
      },
    };
  }
}
