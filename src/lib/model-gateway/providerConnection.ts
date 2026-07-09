import { createModelAdapter } from "./adapterFactory.ts";
import { ModelGatewayError, type ModelGatewayErrorCategory } from "./requestTransport.ts";
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
  errorCategory: ModelGatewayErrorCategory | null;
  errorMessage: string | null;
  repairHint: string | null;
}

function repairHintFromError(error: ModelGatewayError, provider: ProviderConnectionInput) {
  if (error.category === "credential_configuration_error") {
    return "配置有效的 MODEL_CREDENTIAL_SECRET（解码后必须为 32 字节），再重新测试。";
  }
  if (error.category === "missing_api_key" || error.category === "credential_error"
    || (error.category === "upstream_http_error" && (error.status === 401 || error.status === 403))) {
    return "补充或更换 API Key，并确认 Key 拥有当前模型的调用权限。";
  }
  if (error.category === "upstream_http_error" && error.status === 404) {
    return "检查模型名是否存在，并确认 Base URL 指向正确的模型服务。";
  }
  if (error.category === "request_timeout") {
    return "模型服务响应超时，先降低网络延迟，或检查本地/网关服务是否可达。";
  }
  if (error.category === "network_error" || error.category === "invalid_endpoint") {
    return provider.providerId === "ollama"
      ? "Ollama 仅支持本机 localhost、127.0.0.1、::1、host.docker.internal，或公共 HTTPS 地址。"
      : "检查 Base URL、网络代理和服务商域名是否可访问。";
  }
  return "根据错误信息修正模型名、Base URL、Key 或服务商权限后重新测试。";
}

export async function testModelProviderConnection(
  provider: ProviderConnectionInput,
  options: {
    now?: () => Date;
  } = {},
): Promise<ProviderConnectionResult> {
  const startedAt = Date.now();
  const now = options.now ?? (() => new Date());
  const testedAt = now().toISOString();

  try {
    const adapter = createModelAdapter(provider);
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
      errorCategory: null,
      errorMessage: null,
      repairHint: null,
    };
  } catch (caught) {
    const error = caught instanceof ModelGatewayError ? caught : new ModelGatewayError("network_error");
    return {
      ok: false,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      testedAt,
      sampleText: null,
      usage: null,
      errorCategory: error.category,
      errorMessage: error.message,
      repairHint: repairHintFromError(error, provider),
    };
  }
}
