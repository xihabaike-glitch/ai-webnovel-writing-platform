"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RetentionDiagnostic {
  score: number;
  verdict: string;
  platformName: string;
}

interface ChapterRewritePlan {
  chapterId: string;
  order: number;
  title: string;
  role: string;
  priority: "high" | "medium" | "low";
  currentProblem: string;
  rewriteTarget: string;
  coldOpen: string;
  keep: string[];
  cut: string[];
  add: string[];
  ending: string;
  expectedEffect: string;
}

interface StructureMove {
  id: string;
  label: string;
  action: string;
  reason: string;
}

interface PlatformPrescription {
  label: string;
  instruction: string;
}

interface FirstThreeRewritePackage {
  diagnostic: RetentionDiagnostic;
  recommendedOrder: string[];
  chapterPlans: ChapterRewritePlan[];
  structureMoves: StructureMove[];
  platformPrescriptions: PlatformPrescription[];
  markdown: string;
}

interface GeneratedRewriteResult {
  order: number;
  createdChapter: boolean;
  task: {
    id: string;
    status: string;
    model: string;
  };
  chapter: {
    id: string;
    title: string;
    wordCount: number;
    status: string;
  };
  content: string;
  rollbackRevisionId?: string;
  evaluation?: FirstThreeRewriteEvaluation;
}

interface GenerateRewriteResponse {
  rewritePackage: FirstThreeRewritePackage;
  activeProvider: {
    displayName: string;
    model: string;
  };
  results: GeneratedRewriteResult[];
}

interface FirstThreeRewriteEvaluationItem {
  id: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  status: "pass" | "warn" | "fail";
  suggestion: string;
}

interface FirstThreeRewriteEvaluation {
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  wordDelta: number;
  changedFields: string[];
  oldPreview: string;
  newPreview: string;
  verdict: string;
  decision: FirstThreeRewriteDecision;
  itemDeltas: FirstThreeRewriteEvaluationItem[];
  priorityFixes: string[];
  storyTreeAudit?: {
    score: number;
    label: string;
    topActions: string[];
  };
}

interface FirstThreeRewriteDecision {
  action: "keep" | "second_pass" | "rollback";
  label: string;
  severity: "success" | "needs_work" | "danger";
  rationale: string;
  nextAction: string;
  reasons: string[];
}

function priorityLabel(priority: ChapterRewritePlan["priority"]) {
  const labels = {
    high: "高优先级",
    medium: "中优先级",
    low: "低优先级",
  };
  return labels[priority];
}

function signedNumber(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function evaluationTone(delta: number) {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-rose-700";
  return "text-slate-600";
}

function decisionClass(severity: FirstThreeRewriteDecision["severity"]) {
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  if (severity === "danger") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export function FirstThreeRewritePanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [rewritePackage, setRewritePackage] = useState<FirstThreeRewritePackage | null>(null);
  const [generatedResults, setGeneratedResults] = useState<GeneratedRewriteResult[]>([]);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [runningDecisionId, setRunningDecisionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRewritePackage() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-three-rewrite`);
      if (!response.ok) {
        throw new Error("生成前三章改稿处方失败。");
      }
      const payload = (await response.json()) as { rewritePackage: FirstThreeRewritePackage };
      setRewritePackage(payload.rewritePackage);
      setMessage("已生成前三章重排改稿处方");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成前三章改稿处方失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateRewriteDrafts() {
    setIsGeneratingDrafts(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-three-rewrite/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWords: 1600, chapterOrders: [1, 2, 3] }),
      });
      const payload = (await response.json()) as GenerateRewriteResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "生成前三章改写稿失败。");
      }
      setRewritePackage(payload.rewritePackage);
      setGeneratedResults(payload.results);
      setProviderLabel(`${payload.activeProvider.displayName} · ${payload.activeProvider.model}`);
      setMessage(`已生成 ${payload.results.length} 章改写稿`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成前三章改写稿失败。");
    } finally {
      setIsGeneratingDrafts(false);
    }
  }

  async function copyMarkdown() {
    if (!rewritePackage) return;
    await navigator.clipboard.writeText(rewritePackage.markdown);
    setMessage("已复制前三章改稿处方");
  }

  async function downloadMarkdown() {
    setIsDownloading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/first-three-rewrite?format=markdown`);
      if (!response.ok) {
        throw new Error("下载前三章改稿处方失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "前三章重排改稿处方.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载前三章改稿处方失败。");
    } finally {
      setIsDownloading(false);
    }
  }

  async function executeDecision(result: GeneratedRewriteResult) {
    if (!result.evaluation) return;
    const decision = result.evaluation.decision;
    setRunningDecisionId(`${result.chapter.id}-${decision.action}`);
    setMessage(null);
    try {
      if (decision.action === "keep") {
        window.location.href = `/projects/${projectId}#platform-export`;
        setMessage("已定位到发布质检，保留稿也得过质检，别裸奔。");
        return;
      }

      if (decision.action === "second_pass") {
        const response = await fetch(`/api/chapters/${result.chapter.id}/second-pass`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: decision.nextAction,
            mode: "platform_fit",
            targetWords: Math.max(1200, result.chapter.wordCount),
          }),
        });
        const payload = await response.json().catch(() => null) as { secondPassAudit?: { score: number; shouldSecondPass: boolean }; error?: string } | null;
        if (!response.ok || !payload?.secondPassAudit) throw new Error(payload?.error ?? "执行二改失败。");
        setMessage(`已执行第 ${result.order} 章二改，复检 ${payload.secondPassAudit.score} 分${payload.secondPassAudit.shouldSecondPass ? "，还要继续压。" : "，可以回到发布质检。"}`);
        router.refresh();
        return;
      }

      if (!result.rollbackRevisionId) {
        window.location.href = `/projects/${projectId}/chapters/${result.chapter.id}#chapter-revisions`;
        setMessage("没有拿到可自动回滚的快照，已带你去版本台手动处理。");
        return;
      }
      const response = await fetch(`/api/chapters/${result.chapter.id}/revisions/${result.rollbackRevisionId}/restore`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "恢复旧稿失败。");
      setMessage(`已回滚第 ${result.order} 章到改写前旧稿。`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "执行决策动作失败。");
    } finally {
      setRunningDecisionId(null);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" id="first-three-rewrite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">前三章重排改稿助手</h2>
          <p className="mt-1 text-sm text-slate-600">先定开头和结尾，再压主干，最后回填分支内容。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rewritePackage ? (
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={copyMarkdown}
              type="button"
            >
              复制处方
            </button>
          ) : null}
          {rewritePackage ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isDownloading}
              onClick={downloadMarkdown}
              type="button"
            >
              {isDownloading ? "下载中" : "下载处方"}
            </button>
          ) : null}
          {rewritePackage ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isGeneratingDrafts}
              onClick={generateRewriteDrafts}
              type="button"
            >
              {isGeneratingDrafts ? "改写中" : "生成前三章改写稿"}
            </button>
          ) : null}
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoading}
            onClick={loadRewritePackage}
            type="button"
          >
            {isLoading ? "生成中" : "生成改稿处方"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {rewritePackage ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{rewritePackage.diagnostic.platformName} · 诊断分</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{rewritePackage.diagnostic.score}</div>
            <p className="mt-2 text-sm text-slate-600">{rewritePackage.diagnostic.verdict}</p>
          </div>

          <div className="rounded-md border border-slate-200 p-3 text-sm">
            <div className="font-medium text-slate-950">改稿顺序</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {rewritePackage.recommendedOrder.map((step, index) => (
                <div key={step}>{index + 1}. {step}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {rewritePackage.chapterPlans.map((plan) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={plan.chapterId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">第 {plan.order} 章 · {plan.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{priorityLabel(plan.priority)}</div>
                  </div>
                </div>
                <p className="mt-2 text-slate-600">{plan.role}</p>
                <p className="mt-2 text-slate-500">问题：{plan.currentProblem}</p>
                <p className="mt-2 text-slate-600">目标：{plan.rewriteTarget}</p>
                <p className="mt-2 text-slate-600">冷开场：{plan.coldOpen}</p>
                <p className="mt-2 text-slate-600">章末：{plan.ending}</p>
                <div className="mt-3 grid gap-2 text-slate-500">
                  <div>保留：{plan.keep.slice(0, 2).join("；")}</div>
                  <div>删除：{plan.cut.slice(0, 2).join("；")}</div>
                  <div>补写：{plan.add.slice(0, 2).join("；")}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {rewritePackage.structureMoves.map((move) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={move.id}>
                <div className="font-medium text-slate-950">{move.label}</div>
                <p className="mt-2 text-slate-600">{move.action}</p>
                <p className="mt-2 text-slate-500">{move.reason}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">平台处方</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {rewritePackage.platformPrescriptions.map((item) => (
                <div key={item.label}>
                  <span className="font-medium text-slate-900">{item.label}：</span>
                  {item.instruction}
                </div>
              ))}
            </div>
          </div>

          {generatedResults.length > 0 ? (
            <div className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium text-slate-950">已生成改写稿</div>
                {providerLabel ? <div className="text-xs text-slate-500">{providerLabel}</div> : null}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {generatedResults.map((result) => (
                  <div className="rounded-md bg-slate-50 p-3" key={result.chapter.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950">第 {result.order} 章 · {result.chapter.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {result.createdChapter ? "新建章节" : "覆盖改写"} · {result.chapter.wordCount} 字 · {result.task.status}
                        </div>
                      </div>
                      <Link
                        className="text-xs font-medium text-slate-950 underline"
                        href={`/projects/${projectId}/chapters/${result.chapter.id}`}
                      >
                        打开
                      </Link>
                    </div>
                    <p className="mt-2 line-clamp-4 text-slate-600">{result.content}</p>
                    {result.evaluation ? (
                      <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                          <div>
                            <div className="text-slate-500">平台分</div>
                            <div className="mt-1 font-medium text-slate-950">
                              {result.evaluation.beforeScore} → {result.evaluation.afterScore}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">提升</div>
                            <div className={`mt-1 font-medium ${evaluationTone(result.evaluation.scoreDelta)}`}>
                              {signedNumber(result.evaluation.scoreDelta)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">字数</div>
                            <div className={`mt-1 font-medium ${evaluationTone(result.evaluation.wordDelta)}`}>
                              {signedNumber(result.evaluation.wordDelta)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">大树</div>
                            <div className={`mt-1 font-medium ${evaluationTone((result.evaluation.storyTreeAudit?.score ?? 0) - 75)}`}>
                              {result.evaluation.storyTreeAudit?.score ?? "缺"}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs leading-5 text-slate-600">{result.evaluation.verdict}</p>
                        {result.evaluation.storyTreeAudit ? (
                          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
                            <div className="font-medium">大树质检 · {result.evaluation.storyTreeAudit.label}</div>
                            <div className="mt-1">{result.evaluation.storyTreeAudit.topActions[0]}</div>
                          </div>
                        ) : null}
                        <div className="rounded-md border border-slate-200 bg-white p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`rounded-md px-2 py-1 font-medium ${decisionClass(result.evaluation.decision.severity)}`}>
                              {result.evaluation.decision.label}
                            </span>
                            <span className="text-slate-500">{result.evaluation.decision.nextAction}</span>
                          </div>
                          <p className="mt-2 leading-5 text-slate-600">{result.evaluation.decision.rationale}</p>
                          {result.evaluation.decision.reasons.length ? (
                            <div className="mt-2 grid gap-1 text-slate-500">
                              {result.evaluation.decision.reasons.slice(0, 3).map((reason) => (
                                <div key={reason}>{reason}</div>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white disabled:opacity-50"
                              disabled={runningDecisionId === `${result.chapter.id}-${result.evaluation.decision.action}`}
                              onClick={() => executeDecision(result)}
                              type="button"
                            >
                              {runningDecisionId === `${result.chapter.id}-${result.evaluation.decision.action}` ? "执行中" : result.evaluation.decision.label}
                            </button>
                            <Link
                              className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                              href={
                                result.evaluation.decision.action === "keep"
                                  ? `/projects/${projectId}#platform-export`
                                  : result.evaluation.decision.action === "second_pass"
                                    ? `/projects/${projectId}/chapters/${result.chapter.id}#chapter-second-pass`
                                    : `/projects/${projectId}/chapters/${result.chapter.id}#chapter-revisions`
                              }
                            >
                              打开工作台
                            </Link>
                          </div>
                        </div>
                        <div className="grid gap-2 text-xs text-slate-500">
                          <div>改动：{result.evaluation.changedFields.slice(0, 5).join("、") || "暂无明显字段变化"}</div>
                          <div>旧稿：{result.evaluation.oldPreview}</div>
                          <div>新稿：{result.evaluation.newPreview}</div>
                        </div>
                        <div className="grid gap-1 text-xs">
                          {result.evaluation.itemDeltas.slice(0, 3).map((item) => (
                            <div className="flex items-center justify-between gap-2 text-slate-600" key={item.id}>
                              <span>{item.label}</span>
                              <span className={evaluationTone(item.delta)}>
                                {item.before} → {item.after}（{signedNumber(item.delta)}）
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">生成后会给出三章重排顺序、逐章删改建议、结构动作和平台处方。</p>
      )}
    </section>
  );
}
