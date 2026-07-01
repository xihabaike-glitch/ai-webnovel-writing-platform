"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModelProviderId } from "@/lib/model-gateway/types";

interface ProviderOptionView {
  providerId: ModelProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  note: string;
}

interface ProviderView {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
}

interface DraftProvider {
  id?: string;
  providerId: ModelProviderId;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: string;
}

function draftFromOption(option: ProviderOptionView, existing?: ProviderView): DraftProvider {
  return {
    id: existing?.id,
    providerId: option.providerId,
    displayName: existing?.displayName ?? option.displayName,
    baseUrl: existing?.baseUrl ?? option.defaultBaseUrl,
    apiKey: "",
    defaultModel: existing?.defaultModel ?? option.defaultModel,
    enabled: existing?.enabled ?? option.providerId === "mock",
    maxContextTokens: existing?.maxContextTokens ? String(existing.maxContextTokens) : "",
  };
}

export function ModelProviderSettings({
  options,
  providers,
}: {
  options: ProviderOptionView[];
  providers: ProviderView[];
}) {
  const router = useRouter();
  const existingByProvider = useMemo(
    () => new Map(providers.map((provider) => [provider.providerId, provider])),
    [providers],
  );
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId>(options[0]?.providerId ?? "mock");
  const selectedOption = options.find((option) => option.providerId === selectedProviderId) ?? options[0];
  const existing = existingByProvider.get(selectedProviderId);
  const [draft, setDraft] = useState<DraftProvider>(() => draftFromOption(selectedOption, existing));
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function selectProvider(providerId: ModelProviderId) {
    const option = options.find((item) => item.providerId === providerId) ?? options[0];
    setSelectedProviderId(providerId);
    setDraft(draftFromOption(option, existingByProvider.get(providerId)));
    setMessage(null);
  }

  async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/model-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          baseUrl: draft.baseUrl.trim(),
          apiKey: draft.apiKey.trim() || undefined,
          defaultModel: draft.defaultModel.trim(),
          maxContextTokens: draft.maxContextTokens ? Number(draft.maxContextTokens) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("保存模型配置失败。");
      }

      const payload = (await response.json()) as { provider: ProviderView };
      setMessage("已保存模型配置");
      setDraft((current) => ({ ...current, id: payload.provider.id, apiKey: "" }));
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存模型配置失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
      <nav className="grid content-start gap-2">
        {options.map((option) => {
          const provider = existingByProvider.get(option.providerId);
          const isSelected = option.providerId === selectedProviderId;
          return (
            <button
              className={`rounded-md border px-3 py-3 text-left text-sm ${isSelected ? "border-slate-950 bg-white" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
              key={option.providerId}
              onClick={() => selectProvider(option.providerId)}
              type="button"
            >
              <div className="font-medium text-slate-950">{option.displayName}</div>
              <div className="mt-1 text-xs text-slate-500">
                {provider?.enabled ? "已启用" : "未启用"} · {provider?.hasApiKey || !option.requiresApiKey ? "可调用" : "缺少 Key"}
              </div>
            </button>
          );
        })}
      </nav>
      <form className="grid gap-4 rounded-md border border-slate-200 bg-white p-4" onSubmit={saveProvider}>
        <div>
          <h2 className="font-medium">{selectedOption.displayName}</h2>
          <p className="mt-1 text-sm text-slate-600">{selectedOption.note}</p>
        </div>
        <label className="grid gap-1 text-sm">
          显示名称
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
            value={draft.displayName}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Base URL
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
            placeholder={selectedOption.defaultBaseUrl || "https://your-gateway.example/v1"}
            value={draft.baseUrl}
          />
        </label>
        <label className="grid gap-1 text-sm">
          模型名
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setDraft((current) => ({ ...current, defaultModel: event.target.value }))}
            placeholder={selectedOption.defaultModel || "provider-model-name"}
            value={draft.defaultModel}
          />
        </label>
        <label className="grid gap-1 text-sm">
          API Key
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
            placeholder={existing?.hasApiKey ? "已保存，留空则不覆盖" : selectedOption.requiresApiKey ? "请输入 API Key" : "无需填写"}
            type="password"
            value={draft.apiKey}
          />
        </label>
        <label className="grid gap-1 text-sm">
          上下文上限
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            inputMode="numeric"
            onChange={(event) => setDraft((current) => ({ ...current, maxContextTokens: event.target.value }))}
            placeholder="例如 128000"
            value={draft.maxContextTokens}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
            type="checkbox"
          />
          启用这个模型配置
        </label>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "保存中" : "保存配置"}
          </button>
          {message ? <span className="text-sm text-slate-600">{message}</span> : null}
        </div>
      </form>
    </div>
  );
}
