"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ControlArea {
  id: string;
  label: string;
  score: number;
  status: "good" | "watch" | "blocked";
  evidence: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

interface StoryFoundationAxis {
  id: string;
  label: string;
  score: number;
  status: ControlArea["status"];
  evidence: string;
  nextAction: string;
  targetAnchor: string;
}

interface StoryFoundationSummary {
  score: number;
  status: ControlArea["status"];
  label: string;
  headline: string;
  nextAction: string;
  actionLabel: string;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  canExecute: boolean;
  targetAnchor: string;
  axes: StoryFoundationAxis[];
}

interface AiPipelineBatchSummary {
  canRun: boolean;
  category: "review" | "second_pass" | "draft" | null;
  actionLabel: string;
  headline: string;
  detail: string;
  chapterIds: string[];
  chapterTitles: string[];
  targetHref: string;
  warnings: string[];
}

interface AiPipelineRecentBatchSummary {
  hasRecent: boolean;
  status: "continue" | "repair" | "review_quality" | "watch_cost" | "empty";
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  actionExecutable: boolean;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  executeLabel: string;
  relayLabel: string;
  relayDetail: string;
  relayTargetHref: string;
  secondaryActionLabel: string;
  secondaryTargetHref: string;
  evidenceBadges: string[];
  successRatePercent: number | null;
  averageQualityScore: number | null;
  knownCostUsd: number | null;
  succeededCount: number;
  failedCount: number;
  warnings: string[];
  createdAt: string | null;
}

interface AiPipelineBatchHealthSummary {
  hasSamples: boolean;
  status: "usable" | "watch" | "blocked" | "empty";
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  actionExecutable: boolean;
  actionAreaId: string | null;
  actionMode: "seed" | null;
  executeLabel: string;
  total: number;
  usable: number;
  watch: number;
  blocked: number;
  sampleBatches: number;
  recoveryBatches: number;
  successRatePercent: number | null;
  averageQualityScore: number | null;
  failedTasks: number;
  tacticLabel: string;
  tacticTitle: string;
  evidence: string[];
  nextActions: string[];
  latestAt: string | null;
}

interface AiPipelineControlPlanItem {
  id: string;
  label: string;
  completed: boolean;
}

interface AiPipelineControlPlanSummary {
  hasPlan: boolean;
  receiptId: string | null;
  status: "repair" | "watch" | "continue" | "seed_sample" | "empty";
  label: string;
  message: string;
  nextAction: string;
  targetAnchor: string;
  completedCount: number;
  totalCount: number;
  items: AiPipelineControlPlanItem[];
  canRecheck: boolean;
  recheckLabel: string;
  recheckStatus: "small_batch_ready" | "sample_required" | null;
  recheckMessage: string | null;
  recheckOutcomeLabel: string;
  recheckOutcomeTone: "success" | "warning" | "neutral";
  recheckOutcomeDetail: string;
  recheckDispatchKey: string | null;
  recheckDispatchTitle: string | null;
  recheckDispatchHref: string | null;
  recheckActionLabel: string | null;
  recheckActionHref: string | null;
  createdAt: string | null;
}

interface AiPipelinePromptMemorySummary {
  hasMemory: boolean;
  lifecycleStatus: "active" | "sample_required" | "rollback" | "empty";
  lifecycleLabel: string;
  label: string;
  headline: string;
  detail: string;
  promptBlock: string;
  nextAction: string;
  actionLabel: string;
  controlDetail: string;
  evidence: string[];
  sourceLabel: string | null;
  latestAt: string | null;
  targetHref: string;
}

interface ModelRouteHealthSummary {
  status: "empty" | "healthy" | "watch" | "repair" | "cost_guard";
  score: number;
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  targetHref: string;
  totalTasks: number;
  successRatePercent: number;
  failureRatePercent: number;
  knownCostUsd: number;
  averageCostPerSucceededTaskUsd: number;
  fallbackAttemptRatePercent: number;
  configuredProviders: number;
  enabledProviders: number;
  preferredRouteLabels: string[];
  avoidRouteLabels: string[];
  warnings: string[];
  nextActions: string[];
}

interface ControlPriorityAction {
  id: string;
  areaId: string;
  label: string;
  score: number;
  severity: "high" | "medium" | "low";
  reason: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

interface ControlAssetQualityReport {
  taskId: string;
  areaId: string;
  areaLabel: string;
  score: number;
  status: "pass" | "warn" | "fail";
  repaired: boolean;
  createdCount: number;
  issues: string[];
  nextActions: string[];
  createdAt: string;
}

interface ProjectControlDashboard {
  overallScore: number;
  verdict: string;
  platformVerdict: PlatformControlVerdictSummary;
  platformFeedback: PlatformFeedbackSummary;
  platformEvidenceLoop: PlatformEvidenceLoopSummary;
  startTactic: ProjectStartTacticSummary | null;
  startDecision: ProjectStartDecision;
  storyFoundation: StoryFoundationSummary;
  aiPipelineBatch: AiPipelineBatchSummary;
  aiPipelineRecentBatch: AiPipelineRecentBatchSummary;
  aiPipelineBatchHealth: AiPipelineBatchHealthSummary;
  aiPipelineControlPlan: AiPipelineControlPlanSummary;
  aiPipelinePromptMemory: AiPipelinePromptMemorySummary;
  modelRouteHealth: ModelRouteHealthSummary;
  areas: ControlArea[];
  priorityActions: ControlPriorityAction[];
  criticalActions: string[];
  controlAssetQualityReports: ControlAssetQualityReport[];
  metrics: {
    chapters: number;
    words: number;
    outlineNodes: number;
    characters: number;
    worldEntries: number;
    publishableChapters: number;
  };
}

interface PlatformFeedbackReceipt {
  id: string;
  platformId: string;
  platformName: string;
  actionLabel: string;
  title: string;
  message: string;
  completedStepLabel: string;
  stopReason: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
  createdAt: string;
}

interface PlatformFeedbackSummary {
  total: number;
  successCount: number;
  needsActionCount: number;
  latest: PlatformFeedbackReceipt | null;
  recent: PlatformFeedbackReceipt[];
  headline: string;
  nextAction: string;
  targetAnchor: string;
}

interface PlatformEvidenceLoopSummary {
  score: number;
  status: "empty" | "pause" | "repair" | "watch" | "scale";
  label: string;
  platformId: string;
  platformName: string;
  headline: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  evidence: string[];
  metricsCount: number;
  feedbackCount: number;
  gateCompletionCount: number;
}

interface ProjectStartTacticSummary {
  title: string;
  label: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
  handoffStatus?: "reuse" | "small_sample" | "blocked" | "template";
  handoffLabel?: string;
  handoffDetail?: string;
  recommendedPlatformName?: string | null;
  recommendedTemplateId?: string | null;
  firstDayActions?: string[];
  avoidRules?: string[];
  handoffEvidence?: string[];
}

interface ProjectStartDecision {
  status: "seed" | "watch" | "scale" | "pause";
  label: string;
  headline: string;
  nextExperiment: string;
  actionLabel: string;
  targetAnchor: string;
  evidence: string[];
}

interface PlatformControlVerdictSummary {
  status: "ready" | "needs_evidence" | "needs_repair";
  headline: string;
  nextAction: string;
  actionKind: "save_evidence_baseline" | "generate_asset_variants" | "rewrite_first_three" | "open_target";
  actionLabel: string;
  actionExecutable: boolean;
  actionAnchor: string;
  primaryPlatformName: string | null;
  primaryPlatformId: string | null;
  primaryScore: number;
  primaryEvidenceScore: number;
  backupPlatformNames: string[];
  blockedPlatformNames: string[];
  evidenceGaps: string[];
  targetAnchor: string;
}

function statusLabel(status: ControlArea["status"]) {
  if (status === "good") return "稳";
  if (status === "watch") return "盯";
  return "卡";
}

function storyFoundationStatusClass(status: ControlArea["status"]) {
  if (status === "good") return "bg-emerald-50 text-emerald-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function severityLabel(severity: ControlPriorityAction["severity"]) {
  if (severity === "high") return "高优先级";
  if (severity === "medium") return "中优先级";
  return "可优化";
}

function qualityStatusLabel(status: ControlAssetQualityReport["status"]) {
  if (status === "pass") return "通过";
  if (status === "warn") return "需看";
  return "拦截";
}

function platformVerdictStatusLabel(status: PlatformControlVerdictSummary["status"]) {
  if (status === "ready") return "可裁决";
  if (status === "needs_repair") return "先修";
  return "补证据";
}

function platformVerdictStatusClass(status: PlatformControlVerdictSummary["status"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "needs_repair") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function startDecisionStatusClass(status: ProjectStartDecision["status"]) {
  if (status === "scale") return "bg-emerald-50 text-emerald-700";
  if (status === "pause") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function platformFeedbackSeverityClass(severity: PlatformFeedbackReceipt["severity"]) {
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function platformEvidenceLoopClass(status: PlatformEvidenceLoopSummary["status"]) {
  if (status === "scale") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "watch") return "border-blue-200 bg-blue-50 text-blue-900";
  if (status === "repair") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "pause") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function aiBatchCategoryClass(category: AiPipelineBatchSummary["category"]) {
  if (category === "review") return "bg-blue-50 text-blue-700";
  if (category === "second_pass") return "bg-amber-50 text-amber-700";
  if (category === "draft") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function aiRecentBatchClass(status: AiPipelineRecentBatchSummary["status"]) {
  if (status === "continue") return "bg-emerald-50 text-emerald-700";
  if (status === "repair") return "bg-rose-50 text-rose-700";
  if (status === "review_quality") return "bg-amber-50 text-amber-700";
  if (status === "watch_cost") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function aiBatchHealthClass(status: AiPipelineBatchHealthSummary["status"]) {
  if (status === "usable") return "bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function aiRecheckOutcomeClass(tone: AiPipelineControlPlanSummary["recheckOutcomeTone"]) {
  if (tone === "success") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function aiPromptMemoryLifecycleClass(status: AiPipelinePromptMemorySummary["lifecycleStatus"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "rollback") return "bg-rose-100 text-rose-800";
  if (status === "sample_required") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function modelRouteHealthClass(status: ModelRouteHealthSummary["status"]) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-700";
  if (status === "repair") return "bg-rose-50 text-rose-700";
  if (status === "cost_guard") return "bg-blue-50 text-blue-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function projectScopedHref(projectId: string, href: string) {
  return href.startsWith("#") ? `/projects/${projectId}${href}` : href;
}

function shortTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function ProjectControlDashboardPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ProjectControlDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [runningVerdictAction, setRunningVerdictAction] = useState(false);
  const [runningStartDecision, setRunningStartDecision] = useState(false);
  const [runningFoundationAction, setRunningFoundationAction] = useState(false);
  const [runningBatchHealthAction, setRunningBatchHealthAction] = useState(false);
  const [runningRecentBatchAction, setRunningRecentBatchAction] = useState(false);
  const [runningChecklistItemId, setRunningChecklistItemId] = useState<string | null>(null);
  const [runningBatchRecheck, setRunningBatchRecheck] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-dashboard`);
      if (!response.ok) {
        throw new Error("读取项目总控失败。");
      }
      const payload = (await response.json()) as { dashboard: ProjectControlDashboard };
      setDashboard(payload.dashboard);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取项目总控失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [projectId]);

  async function executeAction(action: ControlPriorityAction, mode: "seed" | "ai") {
    setRunningActionId(`${action.id}-${mode}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: action.areaId, mode }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        targetAnchor?: string;
        draftHandoff?: {
          readyDraftCount: number;
          nextAction: string;
          targetAnchor: string;
        };
        qualityGate?: { score: number; issues: string[] };
      };
      if (!response.ok) {
        const quality = payload.qualityGate
          ? `质检 ${payload.qualityGate.score} 分：${payload.qualityGate.issues.slice(0, 2).join("；")}`
          : "";
        throw new Error([payload.error, quality].filter(Boolean).join(" "));
      }
      await loadDashboard();
      const quality = payload.qualityGate ? `质检 ${payload.qualityGate.score} 分。` : "";
      const handoff = payload.draftHandoff && payload.draftHandoff.readyDraftCount > 0
        ? `可初稿 ${payload.draftHandoff.readyDraftCount} 章。${payload.draftHandoff.nextAction}`
        : "";
      setMessage([payload.message ?? "动作已完成。", handoff, quality].filter(Boolean).join(" "));
      const targetAnchor = payload.draftHandoff?.targetAnchor ?? payload.targetAnchor;
      if (targetAnchor && typeof window !== "undefined") {
        window.location.hash = targetAnchor;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行总控动作失败。");
    } finally {
      setRunningActionId(null);
    }
  }

  async function executeStoryFoundationAction() {
    if (!dashboard?.storyFoundation.canExecute || !dashboard.storyFoundation.actionAreaId || !dashboard.storyFoundation.actionMode) return;
    setRunningFoundationAction(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: dashboard.storyFoundation.actionAreaId,
          mode: dashboard.storyFoundation.actionMode,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        targetAnchor?: string;
        draftHandoff?: {
          readyDraftCount: number;
          nextAction: string;
          targetAnchor: string;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "补齐写作底座失败。");
      }
      await loadDashboard();
      const handoff = payload.draftHandoff && payload.draftHandoff.readyDraftCount > 0
        ? `可初稿 ${payload.draftHandoff.readyDraftCount} 章。${payload.draftHandoff.nextAction}`
        : "";
      setMessage([payload.message ?? "写作底座已补齐一轮。", handoff].filter(Boolean).join(" "));
      const targetAnchor = payload.draftHandoff?.targetAnchor ?? payload.targetAnchor;
      if (targetAnchor && typeof window !== "undefined") {
        window.location.hash = targetAnchor;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "补齐写作底座失败。");
    } finally {
      setRunningFoundationAction(false);
    }
  }

  async function executeBatchHealthAction() {
    if (!dashboard?.aiPipelineBatchHealth.actionExecutable || !dashboard.aiPipelineBatchHealth.actionAreaId || !dashboard.aiPipelineBatchHealth.actionMode) return;
    setRunningBatchHealthAction(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: dashboard.aiPipelineBatchHealth.actionAreaId,
          mode: dashboard.aiPipelineBatchHealth.actionMode,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        targetAnchor?: string;
        created?: string[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "生成批量健康动作失败。");
      }
      await loadDashboard();
      const created = payload.created?.length ? `清单：${payload.created.slice(0, 3).join("；")}。` : "";
      setMessage([payload.message ?? "批量健康动作已生成。", created].filter(Boolean).join(" "));
      if (payload.targetAnchor && typeof window !== "undefined") {
        window.location.hash = payload.targetAnchor;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成批量健康动作失败。");
    } finally {
      setRunningBatchHealthAction(false);
    }
  }

  async function executeRecentBatchAction() {
    if (!dashboard?.aiPipelineRecentBatch.actionExecutable || !dashboard.aiPipelineRecentBatch.actionAreaId || !dashboard.aiPipelineRecentBatch.actionMode) return;
    setRunningRecentBatchAction(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: dashboard.aiPipelineRecentBatch.actionAreaId,
          mode: dashboard.aiPipelineRecentBatch.actionMode,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        targetAnchor?: string;
        created?: string[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "生成最近批次修复动作失败。");
      }
      await loadDashboard();
      const created = payload.created?.length ? `清单：${payload.created.slice(0, 3).join("；")}。` : "";
      setMessage([payload.message ?? "最近批次修复动作已生成。", created].filter(Boolean).join(" "));
      if (payload.targetAnchor && typeof window !== "undefined") {
        window.location.hash = payload.targetAnchor;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成最近批次修复动作失败。");
    } finally {
      setRunningRecentBatchAction(false);
    }
  }

  async function toggleBatchChecklistItem(item: AiPipelineControlPlanItem, completed: boolean) {
    if (!dashboard?.aiPipelineControlPlan.receiptId) return;
    setRunningChecklistItemId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: "ai-pipeline",
          mode: "seed",
          receiptId: dashboard.aiPipelineControlPlan.receiptId,
          itemId: item.id,
          completed,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        completedCount?: number;
        totalCount?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "更新批量修复清单失败。");
      }
      await loadDashboard();
      const progress = typeof payload.completedCount === "number" && typeof payload.totalCount === "number"
        ? `进度 ${payload.completedCount}/${payload.totalCount}。`
        : "";
      setMessage([payload.message ?? "批量修复清单已更新。", progress].filter(Boolean).join(" "));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "更新批量修复清单失败。");
    } finally {
      setRunningChecklistItemId(null);
    }
  }

  async function recheckBatchChecklist() {
    if (!dashboard?.aiPipelineControlPlan.receiptId || !dashboard.aiPipelineControlPlan.canRecheck) return;
    setRunningBatchRecheck(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/control-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: "ai-pipeline",
          mode: "seed",
          receiptId: dashboard.aiPipelineControlPlan.receiptId,
          recheck: true,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        error?: string;
        dispatchTitle?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "复检批量健康失败。");
      }
      await loadDashboard();
      const dispatch = payload.dispatchTitle ? `已派单：${payload.dispatchTitle}。` : "";
      setMessage([payload.message ?? "批量健康已复检。", dispatch].filter(Boolean).join(" "));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "复检批量健康失败。");
    } finally {
      setRunningBatchRecheck(false);
    }
  }

  async function executePlatformVerdictAction() {
    if (!dashboard?.platformVerdict.primaryPlatformId || !dashboard.platformVerdict.actionExecutable) return;
    setRunningVerdictAction(true);
    setMessage(null);
    try {
      if (dashboard.platformVerdict.actionKind === "save_evidence_baseline") {
        const response = await fetch(`/api/projects/${projectId}/platform-export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot", platformId: dashboard.platformVerdict.primaryPlatformId }),
        });
        const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "保存证据基准失败。");
        await loadDashboard();
        setMessage(payload?.message ?? "证据基准已保存。");
        return;
      }

      if (dashboard.platformVerdict.actionKind === "generate_asset_variants") {
        const response = await fetch(`/api/projects/${projectId}/platform-export/asset-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: dashboard.platformVerdict.primaryPlatformId }),
        });
        const payload = await response.json().catch(() => null) as { variants?: unknown[]; error?: string } | null;
        if (!response.ok || !payload?.variants) throw new Error(payload?.error ?? "生成投稿资产候选失败。");
        await loadDashboard();
        setMessage(`已生成 ${payload.variants.length} 个投稿资产候选，去采纳一个，别光看热闹。`);
        return;
      }

      if (dashboard.platformVerdict.actionKind === "rewrite_first_three") {
        const response = await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platformId: dashboard.platformVerdict.primaryPlatformId,
            chapterOrders: [1, 2, 3],
            targetWords: 1600,
          }),
        });
        const payload = await response.json().catch(() => null) as { results?: unknown[]; error?: string } | null;
        if (!response.ok || !payload?.results) throw new Error(payload?.error ?? "重写前三章失败。");
        await loadDashboard();
        setMessage(`已按 ${dashboard.platformVerdict.primaryPlatformName ?? "目标平台"} 重写前三章，共 ${payload.results.length} 章。`);
        return;
      }

      await loadDashboard();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行平台裁决动作失败。");
    } finally {
      setRunningVerdictAction(false);
    }
  }

  async function executeStartDecisionAction() {
    if (!dashboard) return;
    setRunningStartDecision(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/start-decision/execute`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as {
        receipt?: { message?: string };
        targetAnchor?: string;
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "执行开书策略动作失败。");
      await loadDashboard();
      setMessage(payload?.receipt?.message ?? "开书策略动作已记录。");
      if (payload?.targetAnchor && typeof window !== "undefined") {
        window.location.hash = payload.targetAnchor;
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行开书策略动作失败。");
    } finally {
      setRunningStartDecision(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">项目总控健康仪表盘</h2>
          <p className="mt-1 text-sm text-slate-600">把大纲、人物、设定、生产、审稿、二改、运营和发布汇总成一个全局优先级。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadDashboard}
          type="button"
        >
          {isLoading ? "读取中" : "刷新总控"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div className="rounded-md bg-slate-50 p-4">
              <div className="text-xs text-slate-500">全局健康分</div>
              <div className="mt-1 text-4xl font-semibold text-slate-950">{dashboard.overallScore}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{dashboard.verdict}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">章节</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.chapters}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">字数</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.words}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">大纲</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.outlineNodes}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">人物</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.characters}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">设定</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.worldEntries}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">可导出</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.metrics.publishableChapters}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">传统写作底座</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${storyFoundationStatusClass(dashboard.storyFoundation.status)}`}>
                    {dashboard.storyFoundation.label} · {dashboard.storyFoundation.score}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.storyFoundation.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  下一步：{dashboard.storyFoundation.nextAction}
                </div>
              </div>
              {dashboard.storyFoundation.canExecute ? (
                <button
                  className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={runningFoundationAction}
                  onClick={() => void executeStoryFoundationAction()}
                  type="button"
                >
                  {runningFoundationAction ? "执行中" : dashboard.storyFoundation.actionLabel}
                </button>
              ) : (
                <Link
                  className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  href={`/projects/${projectId}#${dashboard.storyFoundation.targetAnchor}`}
                >
                  {dashboard.storyFoundation.actionLabel}
                </Link>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {dashboard.storyFoundation.axes.map((axis) => (
                <Link
                  className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100"
                  href={`/projects/${projectId}#${axis.targetAnchor}`}
                  key={axis.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">{axis.label}</div>
                    <div className="text-xs text-slate-500">{statusLabel(axis.status)} · {axis.score}</div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{axis.evidence}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">开书策略决策</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${startDecisionStatusClass(dashboard.startDecision.status)}`}>
                    {dashboard.startDecision.label}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.startDecision.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  下一轮实验：{dashboard.startDecision.nextExperiment}
                </div>
              </div>
              <button
                className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={runningStartDecision}
                onClick={() => void executeStartDecisionAction()}
                type="button"
              >
                {runningStartDecision ? "执行中" : dashboard.startDecision.actionLabel}
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {dashboard.startDecision.evidence.slice(0, 3).map((item) => (
                <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {dashboard.startTactic ? (
            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-slate-950">首轮平台打法</div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                  {dashboard.startTactic.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{dashboard.startTactic.primaryTactic}</p>
              {dashboard.startTactic.handoffDetail ? (
                <div className="mt-2 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  {dashboard.startTactic.handoffLabel ? `${dashboard.startTactic.handoffLabel}：` : ""}{dashboard.startTactic.handoffDetail}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">开头动作</div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{dashboard.startTactic.openingMove}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">验证动作</div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{dashboard.startTactic.verificationMove}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">风险提醒</div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{dashboard.startTactic.risk || "按平台反馈继续校准。"}</p>
                </div>
              </div>
              {dashboard.startTactic.firstDayActions?.length || dashboard.startTactic.avoidRules?.length ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {dashboard.startTactic.firstDayActions?.length ? (
                    <div className="rounded-md bg-emerald-50 p-3">
                      <div className="text-xs font-medium text-emerald-700">首日动作</div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-emerald-800">
                        {dashboard.startTactic.firstDayActions.slice(0, 3).map((action) => (
                          <p key={action}>{action}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {dashboard.startTactic.avoidRules?.length ? (
                    <div className="rounded-md bg-rose-50 p-3">
                      <div className="text-xs font-medium text-rose-700">避坑边界</div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-rose-800">
                        {dashboard.startTactic.avoidRules.slice(0, 3).map((rule) => (
                          <p key={rule}>{rule}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Link
                className="mt-3 inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                href={`/projects/${projectId}#world-bible`}
              >
                查看平台土壤
              </Link>
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">平台裁决</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${platformVerdictStatusClass(dashboard.platformVerdict.status)}`}>
                    {platformVerdictStatusLabel(dashboard.platformVerdict.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.platformVerdict.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  今天这一刀：{dashboard.platformVerdict.nextAction}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboard.platformVerdict.actionExecutable ? (
                  <button
                    className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    disabled={runningVerdictAction}
                    onClick={() => void executePlatformVerdictAction()}
                    type="button"
                  >
                    {runningVerdictAction ? "执行中" : dashboard.platformVerdict.actionLabel}
                  </button>
                ) : (
                  <Link
                    className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    href={`/projects/${projectId}#${dashboard.platformVerdict.actionAnchor}`}
                  >
                    {dashboard.platformVerdict.actionLabel}
                  </Link>
                )}
                <Link
                  className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={`/projects/${projectId}#${dashboard.platformVerdict.targetAnchor}`}
                >
                  看裁决面板
                </Link>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">主平台</div>
                <div className="mt-1 font-medium text-slate-950">{dashboard.platformVerdict.primaryPlatformName ?? "未裁决"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  策略 {dashboard.platformVerdict.primaryScore} · 证据 {dashboard.platformVerdict.primaryEvidenceScore}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">备选</div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  {dashboard.platformVerdict.backupPlatformNames.join("、") || "暂无"}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">别碰</div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  {dashboard.platformVerdict.blockedPlatformNames.join("、") || "暂无"}
                </div>
              </div>
            </div>
            {dashboard.platformVerdict.evidenceGaps.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dashboard.platformVerdict.evidenceGaps.map((gap) => (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700" key={gap}>{gap}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">本书批量健康</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${aiBatchHealthClass(dashboard.aiPipelineBatchHealth.status)}`}>
                    {dashboard.aiPipelineBatchHealth.label}
                  </span>
                  {dashboard.aiPipelineBatchHealth.latestAt ? (
                    <span className="text-xs text-slate-500">{shortTime(dashboard.aiPipelineBatchHealth.latestAt)}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.aiPipelineBatchHealth.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  {dashboard.aiPipelineBatchHealth.detail}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboard.aiPipelineBatchHealth.actionExecutable ? (
                  <button
                    className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    disabled={runningBatchHealthAction}
                    onClick={() => void executeBatchHealthAction()}
                    type="button"
                  >
                    {runningBatchHealthAction ? "生成中" : dashboard.aiPipelineBatchHealth.executeLabel}
                  </button>
                ) : null}
                <Link
                  className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={dashboard.aiPipelineBatchHealth.targetHref}
                >
                  {dashboard.aiPipelineBatchHealth.actionLabel}
                </Link>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">样本批次</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.aiPipelineBatchHealth.sampleBatches || "-"}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成功率</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {dashboard.aiPipelineBatchHealth.successRatePercent ?? "-"}{dashboard.aiPipelineBatchHealth.successRatePercent !== null ? "%" : ""}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">质量</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.aiPipelineBatchHealth.averageQualityScore ?? "-"}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">失败</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.aiPipelineBatchHealth.failedTasks}</div>
              </div>
            </div>
            {dashboard.aiPipelineBatchHealth.evidence.length ? (
              <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                {dashboard.aiPipelineBatchHealth.evidence.map((evidence) => (
                  <p className="rounded-md bg-slate-50 px-2 py-1" key={evidence}>{evidence}</p>
                ))}
              </div>
            ) : null}
            {dashboard.aiPipelinePromptMemory.hasMemory ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-emerald-950">{dashboard.aiPipelinePromptMemory.label}</div>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${aiPromptMemoryLifecycleClass(dashboard.aiPipelinePromptMemory.lifecycleStatus)}`}>
                        {dashboard.aiPipelinePromptMemory.lifecycleLabel}
                      </span>
                      {dashboard.aiPipelinePromptMemory.latestAt ? (
                        <span className="text-xs text-emerald-700">{shortTime(dashboard.aiPipelinePromptMemory.latestAt)}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-900">{dashboard.aiPipelinePromptMemory.headline}</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">{dashboard.aiPipelinePromptMemory.detail}</p>
                  </div>
                  <Link
                    className="inline-flex w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                    href={dashboard.aiPipelinePromptMemory.targetHref}
                  >
                    看写审改
                  </Link>
                </div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-emerald-900">
                  {dashboard.aiPipelinePromptMemory.evidence.slice(0, 3).map((evidence) => (
                    <p className="rounded-md bg-white/70 px-2 py-1" key={evidence}>{evidence}</p>
                  ))}
                </div>
                <p className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs leading-5 text-emerald-900">
                  下一步：{dashboard.aiPipelinePromptMemory.nextAction}
                </p>
                <p className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs leading-5 text-emerald-900">
                  {dashboard.aiPipelinePromptMemory.actionLabel}：{dashboard.aiPipelinePromptMemory.controlDetail}
                </p>
              </div>
            ) : null}
            {dashboard.aiPipelineControlPlan.hasPlan ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-950">{dashboard.aiPipelineControlPlan.label}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{dashboard.aiPipelineControlPlan.nextAction}</p>
                  </div>
                  <div className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    {dashboard.aiPipelineControlPlan.completedCount}/{dashboard.aiPipelineControlPlan.totalCount}
                  </div>
                </div>
                {dashboard.aiPipelineControlPlan.recheckMessage ? (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${aiRecheckOutcomeClass(dashboard.aiPipelineControlPlan.recheckOutcomeTone)}`}>
                    {dashboard.aiPipelineControlPlan.recheckOutcomeLabel ? (
                      <div className="font-medium">{dashboard.aiPipelineControlPlan.recheckOutcomeLabel}</div>
                    ) : null}
                    <p className="mt-1">{dashboard.aiPipelineControlPlan.recheckMessage}</p>
                    {dashboard.aiPipelineControlPlan.recheckOutcomeDetail ? (
                      <p className="mt-1">{dashboard.aiPipelineControlPlan.recheckOutcomeDetail}</p>
                    ) : null}
                    {dashboard.aiPipelineControlPlan.recheckDispatchTitle ? (
                      <span className="block">已派单：{dashboard.aiPipelineControlPlan.recheckDispatchTitle}</span>
                    ) : null}
                    {dashboard.aiPipelineControlPlan.recheckActionHref && dashboard.aiPipelineControlPlan.recheckActionLabel ? (
                      <Link
                        className="mt-2 inline-flex w-fit rounded-md bg-white px-2 py-1 font-medium text-slate-800 hover:bg-slate-100"
                        href={dashboard.aiPipelineControlPlan.recheckActionHref}
                      >
                        {dashboard.aiPipelineControlPlan.recheckActionLabel}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {dashboard.aiPipelineControlPlan.items.map((item) => (
                    <label
                      className="flex items-start gap-2 rounded-md bg-white p-2 text-sm leading-6 text-slate-700"
                      key={item.id}
                    >
                      <input
                        checked={item.completed}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        disabled={runningChecklistItemId === item.id}
                        onChange={(event) => void toggleBatchChecklistItem(item, event.target.checked)}
                        type="checkbox"
                      />
                      <span className={item.completed ? "text-slate-400 line-through" : ""}>{item.label}</span>
                    </label>
                  ))}
                </div>
                {dashboard.aiPipelineControlPlan.canRecheck ? (
                  <button
                    className="mt-3 inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    disabled={runningBatchRecheck}
                    onClick={() => void recheckBatchChecklist()}
                    type="button"
                  >
                    {runningBatchRecheck ? "复检中" : dashboard.aiPipelineControlPlan.recheckLabel}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">平台反哺证据</div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                    {dashboard.platformFeedback.total} 条
                  </span>
                  {dashboard.platformFeedback.needsActionCount ? (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                      待处理 {dashboard.platformFeedback.needsActionCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.platformFeedback.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  下一刀：{dashboard.platformFeedback.nextAction}
                </div>
              </div>
              <Link
                className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                href={`/projects/${projectId}#${dashboard.platformFeedback.targetAnchor}`}
              >
                看反哺证据
              </Link>
            </div>
            <div className={`mt-3 rounded-md border p-3 text-sm ${platformEvidenceLoopClass(dashboard.platformEvidenceLoop.status)}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">证据闭环 {dashboard.platformEvidenceLoop.score} 分</span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-[11px] font-medium">{dashboard.platformEvidenceLoop.label}</span>
                    <span className="text-xs opacity-75">{dashboard.platformEvidenceLoop.platformName}</span>
                  </div>
                  <p className="mt-2 leading-6 opacity-85">{dashboard.platformEvidenceLoop.headline}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs opacity-75">
                    {dashboard.platformEvidenceLoop.evidence.slice(0, 3).map((item) => (
                      <span className="rounded-md bg-white/70 px-2 py-1" key={item}>{item}</span>
                    ))}
                  </div>
                </div>
                <Link
                  className="inline-flex w-fit shrink-0 items-center justify-center rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950"
                  href={`/projects/${projectId}#${dashboard.platformEvidenceLoop.targetAnchor}`}
                >
                  {dashboard.platformEvidenceLoop.actionLabel}
                </Link>
              </div>
              <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-xs leading-5 opacity-85">
                下一刀：{dashboard.platformEvidenceLoop.nextAction}
              </div>
            </div>
            {dashboard.platformFeedback.recent.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {dashboard.platformFeedback.recent.slice(0, 3).map((receipt) => (
                  <Link
                    className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100"
                    href={`/projects/${projectId}#${receipt.href.replace(/^#/, "")}`}
                    key={receipt.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{receipt.platformName}</div>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${platformFeedbackSeverityClass(receipt.severity)}`}>
                        {shortTime(receipt.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{receipt.actionLabel}</div>
                    <p className="mt-1 line-clamp-2 leading-5 text-slate-600">已推进：{receipt.completedStepLabel}</p>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">AI 推荐批次</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${aiBatchCategoryClass(dashboard.aiPipelineBatch.category)}`}>
                    {dashboard.aiPipelineBatch.actionLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.aiPipelineBatch.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  {dashboard.aiPipelineBatch.detail}
                </div>
              </div>
              <Link
                className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                href={dashboard.aiPipelineBatch.targetHref}
              >
                {dashboard.aiPipelineBatch.canRun ? "去执行推荐批次" : "看任务中心"}
              </Link>
            </div>
            {dashboard.aiPipelineBatch.chapterTitles.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dashboard.aiPipelineBatch.chapterTitles.slice(0, 5).map((title) => (
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600" key={title}>{title}</span>
                ))}
              </div>
            ) : null}
            {dashboard.aiPipelineBatch.warnings.length ? (
              <div className="mt-2 grid gap-1 text-xs leading-5 text-amber-700">
                {dashboard.aiPipelineBatch.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">最近 AI 批次回流</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${aiRecentBatchClass(dashboard.aiPipelineRecentBatch.status)}`}>
                    {dashboard.aiPipelineRecentBatch.label}
                  </span>
                  {dashboard.aiPipelineRecentBatch.createdAt ? (
                    <span className="text-xs text-slate-500">{shortTime(dashboard.aiPipelineRecentBatch.createdAt)}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.aiPipelineRecentBatch.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  {dashboard.aiPipelineRecentBatch.detail}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {dashboard.aiPipelineRecentBatch.actionExecutable ? (
                  <button
                    className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={runningRecentBatchAction}
                    onClick={() => void executeRecentBatchAction()}
                    type="button"
                  >
                    {runningRecentBatchAction ? "生成中" : dashboard.aiPipelineRecentBatch.executeLabel}
                  </button>
                ) : null}
                <Link
                  className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={dashboard.aiPipelineRecentBatch.targetHref}
                >
                  {dashboard.aiPipelineRecentBatch.actionLabel}
                </Link>
                {dashboard.aiPipelineRecentBatch.secondaryActionLabel && dashboard.aiPipelineRecentBatch.secondaryTargetHref ? (
                  <Link
                    className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                    href={dashboard.aiPipelineRecentBatch.secondaryTargetHref}
                  >
                    {dashboard.aiPipelineRecentBatch.secondaryActionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
            {dashboard.aiPipelineRecentBatch.evidenceBadges.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                {dashboard.aiPipelineRecentBatch.evidenceBadges.map((badge) => (
                  <span className="rounded-md bg-slate-50 px-2 py-1" key={badge}>{badge}</span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成功 / 失败</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {dashboard.aiPipelineRecentBatch.succeededCount}/{dashboard.aiPipelineRecentBatch.failedCount}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成功率</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {dashboard.aiPipelineRecentBatch.successRatePercent ?? "-"}{dashboard.aiPipelineRecentBatch.successRatePercent !== null ? "%" : ""}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">质量</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.aiPipelineRecentBatch.averageQualityScore ?? "-"}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成本</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {dashboard.aiPipelineRecentBatch.knownCostUsd !== null ? `$${dashboard.aiPipelineRecentBatch.knownCostUsd.toFixed(4)}` : "-"}
                </div>
              </div>
            </div>
            {dashboard.aiPipelineRecentBatch.warnings.length ? (
              <div className="mt-2 grid gap-1 text-xs leading-5 text-amber-700">
                {dashboard.aiPipelineRecentBatch.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
            {dashboard.aiPipelineRecentBatch.relayLabel && dashboard.aiPipelineRecentBatch.relayDetail ? (
              <div className="mt-3 flex flex-col gap-2 rounded-md border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium">{dashboard.aiPipelineRecentBatch.relayLabel}</div>
                  <p className="mt-1">{dashboard.aiPipelineRecentBatch.relayDetail}</p>
                </div>
                {dashboard.aiPipelineRecentBatch.relayTargetHref ? (
                  <Link
                    className="inline-flex w-fit shrink-0 items-center justify-center rounded-md bg-white px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
                    href={projectScopedHref(projectId, dashboard.aiPipelineRecentBatch.relayTargetHref)}
                  >
                    看清单面板
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-slate-950">模型路线健康</div>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${modelRouteHealthClass(dashboard.modelRouteHealth.status)}`}>
                    {dashboard.modelRouteHealth.label} · {dashboard.modelRouteHealth.score}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.modelRouteHealth.headline}</p>
                <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-600">
                  {dashboard.modelRouteHealth.detail}
                </div>
              </div>
              <Link
                className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                href={projectScopedHref(projectId, dashboard.modelRouteHealth.targetHref)}
              >
                {dashboard.modelRouteHealth.actionLabel}
              </Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">供应商</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {dashboard.modelRouteHealth.configuredProviders}/{dashboard.modelRouteHealth.enabledProviders}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">成功率</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.modelRouteHealth.successRatePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">单次均价</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  ${dashboard.modelRouteHealth.averageCostPerSucceededTaskUsd.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">备用触发</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{dashboard.modelRouteHealth.fallbackAttemptRatePercent}%</div>
              </div>
            </div>
            {dashboard.modelRouteHealth.preferredRouteLabels.length || dashboard.modelRouteHealth.avoidRouteLabels.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {dashboard.modelRouteHealth.preferredRouteLabels.length ? (
                  <div className="rounded-md bg-emerald-50 p-3">
                    <div className="text-xs font-medium text-emerald-700">优先路线</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dashboard.modelRouteHealth.preferredRouteLabels.map((label) => (
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs text-emerald-800" key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {dashboard.modelRouteHealth.avoidRouteLabels.length ? (
                  <div className="rounded-md bg-rose-50 p-3">
                    <div className="text-xs font-medium text-rose-700">避用路线</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dashboard.modelRouteHealth.avoidRouteLabels.map((label) => (
                        <span className="rounded-md bg-white/70 px-2 py-1 text-xs text-rose-800" key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-700">下一步</div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                  {dashboard.modelRouteHealth.nextActions.slice(0, 2).map((action) => (
                    <p key={action}>{action}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-700">风险</div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                  {dashboard.modelRouteHealth.warnings.slice(0, 2).map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">优先动作</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                {dashboard.priorityActions?.length ? dashboard.priorityActions.map((action, index) => (
                  <div className="rounded-md bg-slate-50 p-3" key={action.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs text-slate-500">{index + 1} · {severityLabel(action.severity)} · {action.score}</div>
                        <div className="mt-1 font-medium text-slate-950">{action.label}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {action.canExecute ? (
                          <button
                            className="inline-flex w-fit items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                            disabled={Boolean(runningActionId)}
                            onClick={() => executeAction(action, "seed")}
                            type="button"
                          >
                            {runningActionId === `${action.id}-seed` ? "执行中" : action.executeLabel}
                          </button>
                        ) : null}
                        {action.canGenerate ? (
                          <button
                            className="inline-flex w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                            disabled={Boolean(runningActionId)}
                            onClick={() => executeAction(action, "ai")}
                            type="button"
                          >
                            {runningActionId === `${action.id}-ai` ? "生成中" : action.generateLabel}
                          </button>
                        ) : null}
                        <Link
                          className="inline-flex w-fit items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                          href={`/projects/${projectId}#${action.targetAnchor}`}
                        >
                          {action.actionLabel}
                        </Link>
                      </div>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">{action.reason}</p>
                  </div>
                )) : dashboard.criticalActions.map((action, index) => (
                  <div className="rounded-md bg-slate-50 p-2" key={action}>{index + 1}. {action}</div>
                ))}
              </div>
              {dashboard.controlAssetQualityReports?.length ? (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="font-medium text-slate-950">最近 AI 资料质检</div>
                  <div className="mt-3 grid gap-2">
                    {dashboard.controlAssetQualityReports.map((report) => {
                      const detail = report.issues[0] ?? report.nextActions[0] ?? `已生成 ${report.createdCount} 项资料卡。`;
                      return (
                        <div className="rounded-md bg-slate-50 p-3 text-sm" key={report.taskId}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium text-slate-950">{report.areaLabel}</div>
                            <div className="text-xs text-slate-500">
                              {qualityStatusLabel(report.status)} · {report.score} 分{report.repaired ? " · 已返修" : ""}
                            </div>
                          </div>
                          <p className="mt-1 leading-6 text-slate-600">{detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="font-medium text-slate-950">模块健康</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {dashboard.areas.map((area) => (
                  <div className="rounded-md bg-slate-50 p-3 text-sm" key={area.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{area.label}</div>
                      <div className="text-xs text-slate-500">{statusLabel(area.status)} · {area.score}</div>
                    </div>
                    <p className="mt-1 text-slate-600">{area.evidence}</p>
                    <p className="mt-1 text-slate-500">{area.nextAction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
