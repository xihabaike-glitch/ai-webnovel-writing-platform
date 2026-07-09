import { providerOptions } from "./providerDefaults.ts";

export const CREDENTIAL_REENTRY_API_ERROR = {
  error: "更改供应商或接口域名后，请重新输入 API Key。",
  errorCategory: "credential_reentry_required",
  repairHint: "重新输入当前供应商和接口域名对应的 API Key，或明确清空该凭据。",
} as const;

export const CREDENTIAL_REUSE_CONFLICT_API_ERROR = {
  error: "模型凭据已被其他保存操作更新，请重新加载后再试。",
  errorCategory: "credential_reuse_conflict",
  repairHint: "重新加载当前供应商配置，再决定是否保留或重新输入 API Key。",
} as const;

export interface ProviderCredentialTarget {
  providerId: string;
  baseUrl?: string | null;
}

export function providerRequiresApiKey(providerId: string) {
  return providerOptions.find((option) => option.providerId === providerId)?.requiresApiKey ?? true;
}

export function normalizedProviderOrigin(providerId: string, baseUrl: string | null | undefined) {
  const configured = baseUrl?.trim();
  const effectiveBaseUrl = configured
    || providerOptions.find((option) => option.providerId === providerId)?.defaultBaseUrl;
  if (!effectiveBaseUrl) return null;

  try {
    const url = new URL(effectiveBaseUrl);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function canReuseStoredProviderCredential(
  existing: ProviderCredentialTarget,
  next: ProviderCredentialTarget,
) {
  if (existing.providerId !== next.providerId) return false;
  const existingOrigin = normalizedProviderOrigin(existing.providerId, existing.baseUrl);
  const nextOrigin = normalizedProviderOrigin(next.providerId, next.baseUrl);
  return Boolean(existingOrigin && nextOrigin && existingOrigin === nextOrigin);
}
