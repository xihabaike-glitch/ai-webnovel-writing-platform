"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SerializationChapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
}

interface SerializationAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  detail: string;
  chapterId?: string;
  href?: string;
  hrefLabel?: string;
  execution: SerializationActionExecution | null;
}

interface SerializationActionExecution {
  label: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string | number | boolean | string[] | number[]>;
}

interface OpsMessage {
  text: string;
  href?: string;
  hrefLabel?: string;
}

interface SerializationOpsDashboard {
  platformName: string;
  dailyWordTarget: number;
  progressPercent: number;
  publishReadyCount: number;
  reviewQueueCount: number;
  revisionQueueCount: number;
  submissionReadinessPercent: number;
  submissionAssetStatus: SerializationSubmissionAssetStatus;
  submissionAssetCandidates: SerializationSubmissionAssetCandidateBatch;
  finalSubmissionGate: SerializationFinalSubmissionGate;
  publishBaselineStatus: SerializationPublishBaselineStatus;
  publishVersionHistory: SerializationPublishVersionHistoryItem[];
  publishEffectStatus: SerializationPublishEffectStatus;
  nextPublishChapter: SerializationChapter | null;
  actions: SerializationAction[];
  warnings: string[];
}

interface SerializationSubmissionAssetCandidate {
  id: string;
  sourceTaskId: string;
  strategy: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  rationale: string[];
  auditScore: number;
  auditStatus: "ready" | "needs_work" | "blocked";
  adopted: boolean;
  execution: SerializationActionExecution;
}

interface SerializationSubmissionAssetCandidateBatch {
  exists: boolean;
  sourceTaskId: string | null;
  generatedAt: string | null;
  variants: SerializationSubmissionAssetCandidate[];
  verdict: string;
  href: string;
}

interface SubmissionAssetPostSaveReview {
  status: "ready_for_baseline" | "ready_for_download" | "fix_first" | "blocked";
  finalGateScore: number;
  headline: string;
  nextAction: string;
  href: string;
  actionLabel: string;
}

interface SerializationPublishEffectAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  area: string;
  detail: string;
  evidence: string;
  href: string;
  actionLabel: string;
  execution: SerializationActionExecution | null;
}

interface SerializationPublishEffectStatus {
  status: "empty" | "weak" | "watch" | "promising" | "signed" | "unknown";
  label: string;
  records: number;
  totalViews: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  comparisonStatus: "none" | "improved" | "declined" | "mixed" | "flat";
  verdict: string;
  nextAction: string;
  href: string;
  actionLabel: string;
  optimizationStatus: "collect_data" | "urgent_rework" | "iterate" | "scale" | "unknown";
  optimizationHeadline: string;
  actions: SerializationPublishEffectAction[];
}

interface SerializationPublishVersionHistoryItem {
  id: string;
  action: string;
  actionLabel: string;
  title: string;
  platformName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: string;
  href: string;
  downloadHref: string;
}

interface SerializationPublishBaselineStatus {
  exists: boolean;
  id: string | null;
  action: string;
  title: string;
  preflightScore: number;
  chapterCount: number;
  wordCount: number;
  createdAt: string | null;
  verdict: string;
  href: string;
  downloadHref: string;
  actionLabel: string;
}

interface SerializationFinalSubmissionGate {
  status: "ready_to_submit" | "fix_first" | "do_not_submit" | "unknown";
  label: string;
  headline: string;
  verdict: string;
  nextAction: string;
  score: number;
  blockers: string[];
}

interface SerializationSubmissionAssetStatus {
  exists: boolean;
  score: number;
  status: "ready" | "needs_work" | "blocked" | "missing";
  adoptedVersions: number;
  generatedVariants: number;
  latestStrategy: string;
  verdict: string;
  href: string;
  actionLabel: string;
}

interface SubmissionChecklistItem {
  id: string;
  label: string;
  status: "pass" | "todo" | "risk";
  detail: string;
}

interface SubmissionChecklist {
  readinessPercent: number;
  items: SubmissionChecklistItem[];
}

function priorityLabel(priority: SerializationAction["priority"]) {
  if (priority === "high") return "高优先级";
  if (priority === "medium") return "中优先级";
  return "低优先级";
}

function assetStatusLabel(status: SerializationSubmissionAssetStatus["status"]) {
  if (status === "ready") return "可用";
  if (status === "needs_work") return "需打磨";
  if (status === "blocked") return "阻塞";
  return "未保存";
}

function auditStatusLabel(status: SerializationSubmissionAssetCandidate["auditStatus"]) {
  if (status === "ready") return "可用";
  if (status === "blocked") return "阻塞";
  return "需打磨";
}

function auditStatusClass(status: SerializationSubmissionAssetCandidate["auditStatus"]) {
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function finalGateStatusLabel(status: SerializationFinalSubmissionGate["status"]) {
  if (status === "ready_to_submit") return "可投";
  if (status === "fix_first") return "先修";
  if (status === "do_not_submit") return "别投";
  return "待判断";
}

function effectStatusClass(status: SerializationPublishEffectStatus["status"]) {
  if (status === "signed" || status === "promising") return "bg-emerald-50 text-emerald-700";
  if (status === "weak") return "bg-rose-50 text-rose-700";
  if (status === "watch") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function formatTime(value: string | null | undefined) {
  if (!value) return "暂无时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无时间";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function projectHref(projectId: string, href: string) {
  return href.startsWith("#") ? `/projects/${projectId}${href}` : href;
}

function checklistRepairTarget(itemId: string) {
  const targets: Record<string, { href: string; label: string }> = {
    title: { href: "#submission-asset-editor", label: "编辑发布资料" },
    genre: { href: "#submission-asset-editor", label: "编辑发布资料" },
    "selling-point": { href: "#submission-asset-editor", label: "优化卖点" },
    "word-count": { href: "#ai-pipeline", label: "补正文" },
    "first-three": { href: "#chapter-production", label: "补前三章" },
    "opening-hooks": { href: "#retention-diagnostic", label: "补钩子" },
    cliffhangers: { href: "#retention-diagnostic", label: "补悬念" },
    "reviewed-first-three": { href: "#review-pipeline", label: "去审稿" },
    "final-readiness": { href: "#serialization-ops", label: "处理定稿" },
    "platform-risk": { href: "#platform-export", label: "平台适配" },
  };

  return targets[itemId] ?? { href: "#submission-package", label: "查看投稿包" };
}

export function SerializationOpsPanel({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<SerializationOpsDashboard | null>(null);
  const [checklist, setChecklist] = useState<SubmissionChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [runningEffectActionId, setRunningEffectActionId] = useState<string | null>(null);
  const [runningCandidateId, setRunningCandidateId] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [message, setMessage] = useState<OpsMessage | null>(null);

  async function loadOps() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/serialization-ops`);
      if (!response.ok) {
        throw new Error("读取连载运营看板失败。");
      }
      const payload = (await response.json()) as {
        dashboard: SerializationOpsDashboard;
        submissionChecklist: SubmissionChecklist;
      };
      setDashboard(payload.dashboard);
      setChecklist(payload.submissionChecklist);
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "读取连载运营看板失败。" });
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(action: SerializationAction) {
    if (!action.execution) return;
    setRunningActionId(action.id);
    setMessage(null);
    try {
      const response = await fetch(action.execution.endpoint, {
        method: action.execution.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.execution.payload),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        result?: { score?: number };
        secondPassAudit?: { score?: number };
        variants?: unknown[];
        results?: unknown[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "执行运营动作失败。");
      }
      await loadOps();
      const score = payload?.result?.score ?? payload?.secondPassAudit?.score;
      const generatedCount = payload?.variants?.length;
      const rewrittenCount = payload?.results?.length;
      setMessage({
        text: score
          ? `已完成：${action.label}，复检 ${score} 分。`
          : generatedCount
            ? `已完成：${action.label}，生成 ${generatedCount} 个候选。`
            : rewrittenCount
              ? `已完成：${action.label}，重写 ${rewrittenCount} 章。`
              : `已完成：${action.label}`,
      });
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "执行运营动作失败。" });
    } finally {
      setRunningActionId(null);
    }
  }

  async function runPublishEffectAction(action: SerializationPublishEffectAction) {
    if (!action.execution) return;
    setRunningEffectActionId(action.id);
    setMessage(null);
    try {
      const response = await fetch(action.execution.endpoint, {
        method: action.execution.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.execution.payload),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        variants?: unknown[];
        results?: unknown[];
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "执行发布效果动作失败。");
      }
      await loadOps();
      const generatedCount = payload?.variants?.length;
      const rewrittenCount = payload?.results?.length;
      setMessage({
        text: generatedCount
          ? `已按「${action.label}」生成 ${generatedCount} 个候选。`
          : rewrittenCount
            ? `已按「${action.label}」重写 ${rewrittenCount} 章。`
            : `已执行「${action.label}」。`,
      });
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "执行发布效果动作失败。" });
    } finally {
      setRunningEffectActionId(null);
    }
  }

  async function adoptSubmissionAssetCandidate(candidate: SerializationSubmissionAssetCandidate) {
    if (candidate.adopted) return;
    setRunningCandidateId(candidate.id);
    setMessage(null);
    try {
      const response = await fetch(candidate.execution.endpoint, {
        method: candidate.execution.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate.execution.payload),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        audit?: { score?: number };
        postSaveReview?: SubmissionAssetPostSaveReview | null;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "采纳投稿资产候选失败。");
      }
      await loadOps();
      const review = payload?.postSaveReview;
      setMessage(review
        ? {
          text: `已采纳「${candidate.strategy}」，${review.headline} 终检 ${review.finalGateScore} 分。下一步：${review.nextAction}`,
          href: review.href,
          hrefLabel: review.actionLabel,
        }
        : {
          text: payload?.audit?.score
            ? `已采纳「${candidate.strategy}」，质检 ${payload.audit.score} 分。`
            : payload?.message ?? `已采纳「${candidate.strategy}」。`,
        });
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "采纳投稿资产候选失败。" });
    } finally {
      setRunningCandidateId(null);
    }
  }

  async function restorePublishVersion(version: SerializationPublishVersionHistoryItem) {
    setRestoringVersionId(version.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/platform-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId: version.id }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "恢复历史发布包失败。");
      }
      await loadOps();
      setMessage({ text: payload?.message ?? `已恢复「${version.title}」历史发布包。` });
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "恢复历史发布包失败。" });
    } finally {
      setRestoringVersionId(null);
    }
  }

  useEffect(() => {
    void loadOps();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">连载运营与投稿发布看板</h2>
          <p className="mt-1 text-sm text-slate-600">汇总今日该审、该改、可发、可投的动作，避免生产完却卡在发布前。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadOps}
          type="button"
        >
          {isLoading ? "读取中" : "刷新运营看板"}
        </button>
      </div>

      {dashboard ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-8">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">目标平台</div>
            <div className="mt-1 text-sm font-medium text-slate-950">{dashboard.platformName}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">日更建议</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.dailyWordTarget}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">可发布</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.publishReadyCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">待审/待改</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.reviewQueueCount}/{dashboard.revisionQueueCount}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">投稿准备</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.submissionReadinessPercent}%</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">发布资产</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {dashboard.submissionAssetStatus.status === "missing" ? "缺" : dashboard.submissionAssetStatus.score}
            </div>
            <div className="mt-1 text-xs text-slate-500">{assetStatusLabel(dashboard.submissionAssetStatus.status)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">最终闸门</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {dashboard.finalSubmissionGate.status === "unknown" ? "待" : dashboard.finalSubmissionGate.score}
            </div>
            <div className="mt-1 text-xs text-slate-500">{finalGateStatusLabel(dashboard.finalSubmissionGate.status)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">发布基准</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {dashboard.publishBaselineStatus.exists ? dashboard.publishBaselineStatus.preflightScore : "缺"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{dashboard.publishBaselineStatus.exists ? "已保存" : "未保存"}</div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <span>{message.text}</span>
          {message.href ? (
            <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={projectHref(projectId, message.href)}>
              {message.hrefLabel ?? "去处理"}
            </Link>
          ) : null}
        </div>
      ) : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">今日动作</div>
            <div className="mt-3 grid gap-2">
              {dashboard.actions.map((action) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={action.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{action.label}</span>
                    <span className="text-xs text-slate-500">{priorityLabel(action.priority)}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{action.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {action.execution ? (
                      <button
                        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={runningActionId === action.id}
                        onClick={() => void runAction(action)}
                        type="button"
                      >
                        {runningActionId === action.id ? "执行中" : action.execution.label}
                      </button>
                    ) : null}
                    {action.href ? (
                      <Link className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={projectHref(projectId, action.href)}>
                        {action.hrefLabel ?? "去处理"}
                      </Link>
                    ) : null}
                    {action.chapterId ? (
                      <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={`/projects/${projectId}/chapters/${action.chapterId}`}>
                        打开章节
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">运营风险</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {(dashboard.warnings.length ? dashboard.warnings : ["当前运营链路暂无明显风险。"]).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
              ))}
            </div>
            {dashboard.nextPublishChapter ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="text-xs text-slate-500">下一章可发布</div>
                <div className="mt-1 font-medium text-slate-950">
                  第 {dashboard.nextPublishChapter.order} 章 · {dashboard.nextPublishChapter.title}
                </div>
                <div className="mt-1 text-slate-600">{dashboard.nextPublishChapter.wordCount} 字 · {dashboard.nextPublishChapter.status}</div>
              </div>
            ) : null}
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">投稿资产状态</div>
                  <div className="mt-1 font-medium text-slate-950">{assetStatusLabel(dashboard.submissionAssetStatus.status)}</div>
                </div>
                <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" href={projectHref(projectId, dashboard.submissionAssetStatus.href)}>
                  {dashboard.submissionAssetStatus.actionLabel}
                </Link>
              </div>
              <p className="mt-2 leading-6 text-slate-600">{dashboard.submissionAssetStatus.verdict}</p>
              <div className="mt-2 text-xs text-slate-500">
                候选 {dashboard.submissionAssetStatus.generatedVariants} · 采纳 {dashboard.submissionAssetStatus.adoptedVersions}
                {dashboard.submissionAssetStatus.latestStrategy ? ` · ${dashboard.submissionAssetStatus.latestStrategy}` : ""}
              </div>
            </div>
            {dashboard.submissionAssetCandidates.exists ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">最新投稿候选</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {dashboard.submissionAssetCandidates.variants.length} 个候选 · {formatTime(dashboard.submissionAssetCandidates.generatedAt)}
                    </div>
                  </div>
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    href={projectHref(projectId, dashboard.submissionAssetCandidates.href)}
                  >
                    候选工作区
                  </Link>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{dashboard.submissionAssetCandidates.verdict}</p>
                <div className="mt-3 grid gap-2">
                  {dashboard.submissionAssetCandidates.variants.map((candidate) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={candidate.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{candidate.strategy}</div>
                          <div className="mt-1 text-xs text-slate-500">{candidate.title}</div>
                        </div>
                        <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${auditStatusClass(candidate.auditStatus)}`}>
                          {auditStatusLabel(candidate.auditStatus)} {candidate.auditScore}
                        </span>
                      </div>
                      <p className="mt-2 leading-6 text-slate-600">{candidate.logline}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 6).map((tag) => (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" key={tag}>{tag}</span>
                        ))}
                      </div>
                      {candidate.rationale.length ? (
                        <div className="mt-2 text-xs text-slate-500">理由：{candidate.rationale.slice(0, 2).join("；")}</div>
                      ) : null}
                      <button
                        className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        disabled={candidate.adopted || runningCandidateId === candidate.id}
                        onClick={() => void adoptSubmissionAssetCandidate(candidate)}
                        type="button"
                      >
                        {candidate.adopted ? "已采纳" : runningCandidateId === candidate.id ? "采纳中" : candidate.execution.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="text-xs text-slate-500">最终投前闸门</div>
              <div className="mt-1 font-medium text-slate-950">
                {finalGateStatusLabel(dashboard.finalSubmissionGate.status)} · {dashboard.finalSubmissionGate.score || "待判断"} 分
              </div>
              <p className="mt-2 leading-6 text-slate-600">{dashboard.finalSubmissionGate.verdict}</p>
              <div className="mt-2 text-xs text-slate-500">下一步：{dashboard.finalSubmissionGate.nextAction}</div>
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">发布基准</div>
                  <div className="mt-1 font-medium text-slate-950">{dashboard.publishBaselineStatus.exists ? "已保存" : "未保存"}</div>
                </div>
                {dashboard.publishBaselineStatus.exists ? (
                  <a
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    href={dashboard.publishBaselineStatus.downloadHref}
                  >
                    {dashboard.publishBaselineStatus.actionLabel}
                  </a>
                ) : (
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    href={projectHref(projectId, dashboard.publishBaselineStatus.href)}
                  >
                    {dashboard.publishBaselineStatus.actionLabel}
                  </Link>
                )}
              </div>
              <p className="mt-2 leading-6 text-slate-600">{dashboard.publishBaselineStatus.verdict}</p>
              {dashboard.publishBaselineStatus.exists ? (
                <div className="mt-2 text-xs text-slate-500">
                  {dashboard.publishBaselineStatus.chapterCount} 章 · {dashboard.publishBaselineStatus.wordCount} 字
                </div>
              ) : null}
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">发布效果回收</div>
                  <div className="mt-1 font-medium text-slate-950">
                    {dashboard.publishEffectStatus.records} 次记录 · {dashboard.publishEffectStatus.totalViews} 曝光
                  </div>
                </div>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${effectStatusClass(dashboard.publishEffectStatus.status)}`}>
                  {dashboard.publishEffectStatus.label}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="text-xs text-slate-500">点击率</div>
                  <div className="mt-1 font-medium text-slate-950">{dashboard.publishEffectStatus.clickRatePercent}%</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="text-xs text-slate-500">收藏率</div>
                  <div className="mt-1 font-medium text-slate-950">{dashboard.publishEffectStatus.favoriteRatePercent}%</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="text-xs text-slate-500">追读率</div>
                  <div className="mt-1 font-medium text-slate-950">{dashboard.publishEffectStatus.followRatePercent}%</div>
                </div>
              </div>
              <p className="mt-2 leading-6 text-slate-600">{dashboard.publishEffectStatus.verdict}</p>
              <div className="mt-2 text-xs text-slate-500">下一步：{dashboard.publishEffectStatus.nextAction}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={projectHref(projectId, dashboard.publishEffectStatus.href)}
                >
                  {dashboard.publishEffectStatus.actionLabel}
                </Link>
                <Link
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={`/projects/${projectId}#publish-effect-panel`}
                >
                  效果面板
                </Link>
              </div>
              {dashboard.publishEffectStatus.actions.length ? (
                <div className="mt-3 grid gap-2">
                  <div className="text-xs text-slate-500">{dashboard.publishEffectStatus.optimizationHeadline}</div>
                  {dashboard.publishEffectStatus.actions.map((action) => (
                    <div className="rounded-md border border-slate-200 bg-white p-3" key={action.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-slate-950">{action.label}</div>
                        <span className="text-xs text-slate-500">{priorityLabel(action.priority)}</span>
                      </div>
                      <p className="mt-1 leading-6 text-slate-600">{action.detail}</p>
                      <div className="mt-2 text-xs text-slate-500">依据：{action.evidence}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {action.execution ? (
                          <button
                            className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={runningEffectActionId === action.id}
                            onClick={() => void runPublishEffectAction(action)}
                            type="button"
                          >
                            {runningEffectActionId === action.id ? "执行中" : action.execution.label}
                          </button>
                        ) : null}
                        <Link
                          className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          href={projectHref(projectId, action.href)}
                        >
                          {action.execution ? "打开工作区" : action.actionLabel}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">发布版本历史</div>
                  <div className="mt-1 font-medium text-slate-950">
                    最近 {dashboard.publishVersionHistory.length} 个版本
                  </div>
                </div>
                <Link
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={`/projects/${projectId}#package-version-history`}
                >
                  全部版本
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {dashboard.publishVersionHistory.map((version) => (
                  <div className="rounded-md border border-slate-200 bg-white p-3" key={version.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">{version.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {version.actionLabel} · {formatTime(version.createdAt)}
                        </div>
                      </div>
                      <div className={`w-fit rounded-md px-2 py-1 text-xs font-medium ${
                        version.canExport ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        质检 {version.preflightScore}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{version.chapterCount} 章</span>
                      <span>{version.wordCount} 字</span>
                      <span>{version.platformName}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        href={version.downloadHref}
                      >
                        下载此版
                      </a>
                      <button
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={restoringVersionId === version.id}
                        onClick={() => void restorePublishVersion(version)}
                        type="button"
                      >
                        {restoringVersionId === version.id ? "恢复中" : "恢复此版"}
                      </button>
                    </div>
                  </div>
                ))}
                {!dashboard.publishVersionHistory.length ? (
                  <div className="rounded-md border border-slate-200 bg-white p-3 text-slate-600">
                    暂无版本记录。先保存发布基准，后面每次复制、下载、恢复都会留下痕迹。
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checklist ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">投稿检查</div>
            <div className="text-sm text-slate-500">{checklist.readinessPercent}%</div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {checklist.items.filter((item) => item.status !== "pass").map((item) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{item.label}</div>
                  <Link
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    href={projectHref(projectId, checklistRepairTarget(item.id).href)}
                  >
                    {checklistRepairTarget(item.id).label}
                  </Link>
                </div>
                <p className="mt-1 text-slate-600">{item.detail}</p>
              </div>
            ))}
            {checklist.items.every((item) => item.status === "pass") ? (
              <p className="text-sm text-slate-600">投稿检查全部通过。</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
