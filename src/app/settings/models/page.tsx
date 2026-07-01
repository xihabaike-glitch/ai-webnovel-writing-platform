import { AppShell } from "@/components/app-shell/AppShell";
import { ModelProviderSettings } from "@/components/settings/ModelProviderSettings";
import { prisma } from "@/lib/db/prisma";
import { providerOptions } from "@/lib/model-gateway/providerDefaults";

function maskProvider(provider: {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
}) {
  return {
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    baseUrl: provider.baseUrl,
    hasApiKey: Boolean(provider.encryptedApiKey),
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    maxContextTokens: provider.maxContextTokens,
  };
}

export default async function ModelSettingsPage() {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">模型设置</h1>
      <p className="mt-1 text-sm text-slate-600">配置 Claude、DeepSeek、Kimi、GPT、兼容网关或本地 Ollama。</p>
      <ModelProviderSettings options={providerOptions} providers={providers.map(maskProvider)} />
    </AppShell>
  );
}
