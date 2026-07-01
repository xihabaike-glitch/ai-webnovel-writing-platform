"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderHealthDashboard, ProviderHealthStatus } from "@/lib/model-gateway/providerHealth";
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

interface RouteOptionView {
  taskType: string;
  label: string;
  description: string;
}

interface RouteView {
  id: string;
  taskType: string;
  primaryProviderConfigId: string | null;
  fallbackProviderConfigId: string | null;
}

interface RouteEffectAuditView {
  summary: {
    routedTaskTypes: number;
    configuredRoutes: number;
    observedTaskTypes: number;
    fallbackTaskCount: number;
    otherTaskCount: number;
    knownCostUsd: number;
  };
  rows: Array<{
    taskType: string;
    label: string;
    primaryProviderName: string;
    fallbackProviderName: string;
    totalTasks: number;
    primaryTasks: number;
    fallbackTasks: number;
    otherTasks: number;
    succeededTasks: number;
    failedTasks: number;
    successRatePercent: number;
    totalTokens: number;
    knownCostUsd: number;
    lastUsedAt: string | null;
    status: "healthy" | "watch" | "unconfigured";
    recommendation: string;
  }>;
  nextActions: string[];
}

interface RouteDraft {
  primaryProviderConfigId: string;
  fallbackProviderConfigId: string;
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

interface ConnectionTestResult {
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

const statusCopy: Record<ProviderHealthStatus, { label: string; className: string }> = {
  ready: { label: "可用", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  warn: { label: "需注意", className: "border-amber-200 bg-amber-50 text-amber-700" },
  blocked: { label: "阻塞", className: "border-rose-200 bg-rose-50 text-rose-700" },
  disabled: { label: "未启用", className: "border-slate-200 bg-slate-50 text-slate-500" },
};

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
  healthDashboard,
  options,
  providers,
  routeEffectAudit,
  routeOptions,
  routes,
}: {
  healthDashboard: ProviderHealthDashboard;
  options: ProviderOptionView[];
  providers: ProviderView[];
  routeEffectAudit: RouteEffectAuditView;
  routeOptions: RouteOptionView[];
  routes: RouteView[];
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
  const [testingProviderId, setTestingProviderId] = useState<ModelProviderId | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [routeDrafts, setRouteDrafts] = useState<Record<string, RouteDraft>>(() => Object.fromEntries(
    routeOptions.map((option) => {
      const route = routes.find((item) => item.taskType === option.taskType);
      return [option.taskType, {
        primaryProviderConfigId: route?.primaryProviderConfigId ?? "",
        fallbackProviderConfigId: route?.fallbackProviderConfigId ?? "",
      }];
    }),
  ));
  const [savingRouteType, setSavingRouteType] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const currentTestResult = testResults[selectedProviderId];

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

  async function testProviderConnection() {
    setTestingProviderId(draft.providerId);
    setMessage(null);

    try {
      const response = await fetch("/api/model-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          providerId: draft.providerId,
          baseUrl: draft.baseUrl.trim(),
          apiKey: draft.apiKey.trim() || undefined,
          defaultModel: draft.defaultModel.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("模型连接测试失败。");
      }

      const payload = (await response.json()) as { result: ConnectionTestResult };
      setTestResults((current) => ({ ...current, [draft.providerId]: payload.result }));
    } catch (caught) {
      setTestResults((current) => ({
        ...current,
        [draft.providerId]: {
          ok: false,
          status: "failed",
          latencyMs: 0,
          testedAt: new Date().toISOString(),
          sampleText: null,
          usage: null,
          errorMessage: caught instanceof Error ? caught.message : "模型连接测试失败。",
          repairHint: "检查模型名、Base URL 和 API Key 后重新测试。",
        },
      }));
    } finally {
      setTestingProviderId(null);
    }
  }

  async function saveRoute(taskType: string) {
    const draftRoute = routeDrafts[taskType] ?? { primaryProviderConfigId: "", fallbackProviderConfigId: "" };
    setSavingRouteType(taskType);
    setRouteMessage(null);
    try {
      const response = await fetch("/api/model-task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          primaryProviderConfigId: draftRoute.primaryProviderConfigId || null,
          fallbackProviderConfigId: draftRoute.fallbackProviderConfigId || null,
        }),
      });
      if (!response.ok) throw new Error("保存模型路由失败。");
      setRouteMessage("模型路由已保存");
      router.refresh();
    } catch (caught) {
      setRouteMessage(caught instanceof Error ? caught.message : "保存模型路由失败。");
    } finally {
      setSavingRouteType(null);
    }
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">体检分</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.score}</div>
            <div className="mt-1 text-xs text-slate-500">
              {healthDashboard.status === "healthy" ? "模型队列健康" : healthDashboard.status === "blocked" ? "存在阻塞项" : "需要补齐配置"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">可用模型</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.readyProviders}</div>
            <div className="mt-1 text-xs text-slate-500">启用 {healthDashboard.summary.enabledProviders} 个</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">缺 Key</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.missingApiKeyProviders}</div>
            <div className="mt-1 text-xs text-slate-500">真实模型调用前必须处理</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">缺上下文</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{healthDashboard.summary.missingContextProviders}</div>
            <div className="mt-1 text-xs text-slate-500">影响长篇任务分配</div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-medium text-slate-950">模型配置体检</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {(healthDashboard.topRisks.length ? healthDashboard.topRisks : ["暂无阻塞风险，可以进入小批量试跑。"]).map((risk) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={risk}>{risk}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-medium text-slate-950">下一步动作</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {healthDashboard.nextActions.map((action) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={action}>{action}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {healthDashboard.rows.map((row) => {
            const status = statusCopy[row.status];
            return (
              <article className="rounded-md border border-slate-200 bg-white p-4" key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-950">{row.displayName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{row.defaultModel || "未填写模型名"}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs ${status.className}`}>{status.label} · {row.score}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">{row.hasApiKey || row.providerId === "mock" || row.providerId === "ollama" ? "Key 就绪" : "缺 Key"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{row.hasBaseUrl ? "Base URL 就绪" : "缺 Base URL"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">上下文 {row.maxContextTokens ? `${row.maxContextTokens.toLocaleString()} tokens` : "未填"}</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">适配任务：{row.taskFit.join(" / ")}</div>
                <div className="mt-2 text-xs text-slate-600">{row.nextAction}</div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">模型路由策略</h2>
            <p className="mt-1 text-sm text-slate-600">给不同 AI 任务指定首选模型和备用模型，未配置时自动使用当前可用模型。</p>
          </div>
          {routeMessage ? <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{routeMessage}</div> : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">已配置</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.configuredRoutes}/{routeEffectAudit.summary.routedTaskTypes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">有样本</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.observedTaskTypes}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">走备用</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.fallbackTaskCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">偏离路由</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.summary.otherTaskCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">路由成本</div>
            <div className="mt-1 text-2xl font-semibold">${routeEffectAudit.summary.knownCostUsd.toFixed(4)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">审计行</div>
            <div className="mt-1 text-2xl font-semibold">{routeEffectAudit.rows.length}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-950">路由下一步</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {routeEffectAudit.nextActions.map((action, index) => (
                <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-950">路由效果审计</div>
            <div className="mt-3 grid gap-2">
              {routeEffectAudit.rows.map((row) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={row.taskType}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">{row.label}</div>
                    <div className="text-xs text-slate-500">{row.status === "healthy" ? "稳定" : row.status === "watch" ? "观察" : "未配置"}</div>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                    <div>首选：{row.primaryProviderName}</div>
                    <div>备用：{row.fallbackProviderName}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-md bg-white px-2 py-1">任务 {row.totalTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">成功率 {row.successRatePercent}%</span>
                    <span className="rounded-md bg-white px-2 py-1">首选 {row.primaryTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">备用 {row.fallbackTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">偏离 {row.otherTasks}</span>
                    <span className="rounded-md bg-white px-2 py-1">${row.knownCostUsd.toFixed(4)}</span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">{row.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {routeOptions.map((option) => {
            const draftRoute = routeDrafts[option.taskType] ?? { primaryProviderConfigId: "", fallbackProviderConfigId: "" };
            return (
              <div className="rounded-md border border-slate-200 p-3" key={option.taskType}>
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
                  <div>
                    <div className="font-medium text-slate-950">{option.label}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                  </div>
                  <label className="grid gap-1 text-sm">
                    首选模型
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2"
                      onChange={(event) => setRouteDrafts((current) => ({
                        ...current,
                        [option.taskType]: { ...draftRoute, primaryProviderConfigId: event.target.value },
                      }))}
                      value={draftRoute.primaryProviderConfigId}
                    >
                      <option value="">自动选择</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.displayName} · {provider.defaultModel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    备用模型
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2"
                      onChange={(event) => setRouteDrafts((current) => ({
                        ...current,
                        [option.taskType]: { ...draftRoute, fallbackProviderConfigId: event.target.value },
                      }))}
                      value={draftRoute.fallbackProviderConfigId}
                    >
                      <option value="">无备用</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.displayName} · {provider.defaultModel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={savingRouteType === option.taskType}
                    onClick={() => saveRoute(option.taskType)}
                    type="button"
                  >
                    {savingRouteType === option.taskType ? "保存中" : "保存路由"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
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
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              disabled={testingProviderId === draft.providerId}
              onClick={testProviderConnection}
              type="button"
            >
              {testingProviderId === draft.providerId ? "测试中" : "测试连接"}
            </button>
            {message ? <span className="text-sm text-slate-600">{message}</span> : null}
          </div>
          {currentTestResult ? (
            <div className={`rounded-md border p-4 text-sm ${currentTestResult.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`font-medium ${currentTestResult.ok ? "text-emerald-800" : "text-rose-800"}`}>
                  {currentTestResult.ok ? "连接成功" : "连接失败"}
                </h3>
                <span className={currentTestResult.ok ? "text-emerald-700" : "text-rose-700"}>
                  {currentTestResult.latencyMs}ms
                </span>
              </div>
              {currentTestResult.sampleText ? (
                <p className="mt-2 text-slate-700">返回样例：{currentTestResult.sampleText}</p>
              ) : null}
              {currentTestResult.usage ? (
                <p className="mt-2 text-xs text-slate-600">
                  Token：输入 {currentTestResult.usage.inputTokens} / 输出 {currentTestResult.usage.outputTokens}
                </p>
              ) : null}
              {currentTestResult.errorMessage ? (
                <p className="mt-2 text-slate-700">错误：{currentTestResult.errorMessage}</p>
              ) : null}
              {currentTestResult.repairHint ? (
                <p className="mt-2 text-slate-700">建议：{currentTestResult.repairHint}</p>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
