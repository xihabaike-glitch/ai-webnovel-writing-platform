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
  payload: Record<string, string | number | boolean>;
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
  finalSubmissionGate: SerializationFinalSubmissionGate;
  nextPublishChapter: SerializationChapter | null;
  actions: SerializationAction[];
  warnings: string[];
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

function finalGateStatusLabel(status: SerializationFinalSubmissionGate["status"]) {
  if (status === "ready_to_submit") return "可投";
  if (status === "fix_first") return "先修";
  if (status === "do_not_submit") return "别投";
  return "待判断";
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
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(caught instanceof Error ? caught.message : "读取连载运营看板失败。");
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
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; result?: { score?: number }; secondPassAudit?: { score?: number } } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "执行运营动作失败。");
      }
      await loadOps();
      const score = payload?.result?.score ?? payload?.secondPassAudit?.score;
      setMessage(score ? `已完成：${action.label}，复检 ${score} 分。` : `已完成：${action.label}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行运营动作失败。");
    } finally {
      setRunningActionId(null);
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
        <div className="mt-4 grid gap-3 sm:grid-cols-7">
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
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

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
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              <div className="text-xs text-slate-500">最终投前闸门</div>
              <div className="mt-1 font-medium text-slate-950">
                {finalGateStatusLabel(dashboard.finalSubmissionGate.status)} · {dashboard.finalSubmissionGate.score || "待判断"} 分
              </div>
              <p className="mt-2 leading-6 text-slate-600">{dashboard.finalSubmissionGate.verdict}</p>
              <div className="mt-2 text-xs text-slate-500">下一步：{dashboard.finalSubmissionGate.nextAction}</div>
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
