import { createModelAdapter } from "./adapterFactory.ts";
import type { ModelProviderId } from "./types.ts";

export interface ProviderConnectionInput {
  providerId: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
  defaultModel: string;
}

export interface ProviderConnectionResult {
  ok: boolean;
  status: "connected" | "failed";
  latencyMs: number;
  testedAt: string;
  sampleText: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  errorMessage: string | null;
  repairHint: string | null;
}

function createTimeoutFetch(timeoutMs: number, fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
}

function repairHintFromError(error: Error, provider: ProviderConnectionInput) {
  const message = error.message.toLowerCase();
  if (message.includes("api key") || message.includes("401") || message.includes("403") || message.includes("unauthorized")) {
    return "补充或更换 API Key，并确认 Key 拥有当前模型的调用权限。";
  }
  if (message.includes("404") || message.includes("not found") || message.includes("model")) {
    return "检查模型名是否存在，并确认 Base URL 指向正确的模型服务。";
  }
  if (message.includes("abort") || message.includes("timeout") || message.includes("timed out")) {
    return "模型服务响应超时，先降低网络延迟，或检查本地/网关服务是否可达。";
  }
  if (message.includes("fetch failed") || message.includes("econnrefused") || message.includes("enotfound")) {
    return provider.providerId === "ollama"
      ? "检查 Ollama 是否已启动，以及 Base URL 是否为 http://localhost:11434。"
      : "检查 Base URL、网络代理和服务商域名是否可访问。";
  }
  return "根据错误信息修正模型名、Base URL、Key 或服务商权限后重新测试。";
}

export async function testModelProviderConnection(
  provider: ProviderConnectionInput,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    now?: () => Date;
  } = {},
): Promise<ProviderConnectionResult> {
  const startedAt = Date.now();
  const now = options.now ?? (() => new Date());
  const testedAt = now().toISOString();

  try {
    const adapter = createModelAdapter(
      provider,
      createTimeoutFetch(options.timeoutMs ?? 12000, options.fetchImpl ?? fetch),
    );
    const result = await adapter.generate({
      providerId: provider.providerId as ModelProviderId,
      model: provider.defaultModel,
      systemPrompt: "你是 AI 写作平台的模型连通性测试器。请用极短文本确认服务可用。",
      userPrompt: "请只回复一句：模型连接正常。",
      temperature: 0,
      maxTokens: 32,
    });

    return {
      ok: true,
      status: "connected",
      latencyMs: Date.now() - startedAt,
      testedAt,
      sampleText: result.text.slice(0, 200),
      usage: result.usage
        ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        }
        : null,
      errorMessage: null,
      repairHint: null,
    };
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error("模型测试失败。");
    return {
      ok: false,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      testedAt,
      sampleText: null,
      usage: null,
      errorMessage: error.message,
      repairHint: repairHintFromError(error, provider),
    };
  }
}
