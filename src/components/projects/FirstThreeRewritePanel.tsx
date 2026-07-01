"use client";

import Link from "next/link";
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
}

interface GenerateRewriteResponse {
  rewritePackage: FirstThreeRewritePackage;
  activeProvider: {
    displayName: string;
    model: string;
  };
  results: GeneratedRewriteResult[];
}

function priorityLabel(priority: ChapterRewritePlan["priority"]) {
  const labels = {
    high: "高优先级",
    medium: "中优先级",
    low: "低优先级",
  };
  return labels[priority];
}

export function FirstThreeRewritePanel({ projectId }: { projectId: string }) {
  const [rewritePackage, setRewritePackage] = useState<FirstThreeRewritePackage | null>(null);
  const [generatedResults, setGeneratedResults] = useState<GeneratedRewriteResult[]>([]);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
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
