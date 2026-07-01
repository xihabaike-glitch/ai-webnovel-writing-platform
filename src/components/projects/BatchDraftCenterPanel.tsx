"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface BatchDraftCandidate {
  chapterId: string;
  order: number;
  title: string;
  status: "ready" | "needs_card" | "has_draft" | "running";
  wordCount: number;
  missingFields: string[];
  reason: string;
  recommended: boolean;
}

interface BatchDraftQueue {
  totalCandidates: number;
  readyCandidates: number;
  recommendedChapterIds: string[];
  warnings: string[];
  candidates: BatchDraftCandidate[];
}

interface ActiveProvider {
  providerId: string;
  displayName: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
}

interface BatchDraftResult {
  chapterId: string;
  status: "succeeded" | "failed";
  chapterTitle: string;
  taskId: string;
  wordCount: number;
  error: string | null;
}

function statusLabel(status: BatchDraftCandidate["status"]) {
  const labels = {
    ready: "可生成",
    needs_card: "需补卡",
    has_draft: "已有正文",
    running: "运行中",
  };
  return labels[status];
}

export function BatchDraftCenterPanel({ projectId }: { projectId: string }) {
  const [queue, setQueue] = useState<BatchDraftQueue | null>(null);
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState(1200);
  const [results, setResults] = useState<BatchDraftResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const readyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.status === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );

  async function loadQueue() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-drafts`);
      if (!response.ok) {
        throw new Error("读取批量初稿队列失败。");
      }
      const payload = (await response.json()) as {
        queue: BatchDraftQueue;
        activeProvider: ActiveProvider;
      };
      setQueue(payload.queue);
      setActiveProvider(payload.activeProvider);
      setSelectedIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedChapterIds;
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取批量初稿队列失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateBatch() {
    setIsGenerating(true);
    setMessage(null);
    setResults([]);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: selectedIds, targetWords }),
      });
      const payload = await response.json() as {
        results?: BatchDraftResult[];
        queue?: BatchDraftQueue;
        activeProvider?: ActiveProvider;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "批量生成初稿失败。");
      }
      setResults(payload.results ?? []);
      if (payload.queue) setQueue(payload.queue);
      if (payload.activeProvider) setActiveProvider(payload.activeProvider);
      setSelectedIds(payload.queue?.recommendedChapterIds ?? []);
      const succeeded = (payload.results ?? []).filter((result) => result.status === "succeeded").length;
      const failed = (payload.results ?? []).filter((result) => result.status === "failed").length;
      setMessage(`批量初稿完成：成功 ${succeeded} 章，失败 ${failed} 章。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "批量生成初稿失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleChapter(chapterId: string) {
    setSelectedIds((current) => (
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId].slice(0, 5)
    ));
  }

  useEffect(() => {
    void loadQueue();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">AI 批量初稿生产中心</h2>
          <p className="mt-1 text-sm text-slate-600">从章节卡队列选择 1-5 章，批量调用当前模型生成正文初稿，并自动保存覆盖前版本。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading || isGenerating}
          onClick={loadQueue}
          type="button"
        >
          {isLoading ? "读取中" : "刷新队列"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">候选章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.totalCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可批量</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.readyCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">已选择</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedIds.length}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">当前模型</div>
          <div className="mt-1 text-sm font-medium text-slate-950">{activeProvider ? `${activeProvider.displayName} · ${activeProvider.model}` : "读取中"}</div>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量参数</div>
          <div className="mt-3 grid gap-3 text-sm text-slate-600">
            <label className="grid gap-1">
              单章目标字数
              <input
                className="rounded-md border border-slate-200 px-3 py-2"
                max={5000}
                min={500}
                onChange={(event) => setTargetWords(Number(event.target.value))}
                type="number"
                value={targetWords}
              />
            </label>
            <div className="grid gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={!queue || readyIds.length === 0}
                onClick={() => setSelectedIds((queue?.recommendedChapterIds ?? []).slice(0, 5))}
                type="button"
              >
                选择推荐队列
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={readyIds.length === 0}
                onClick={() => setSelectedIds(readyIds.slice(0, 5))}
                type="button"
              >
                选择前 5 章
              </button>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={isGenerating || selectedIds.length === 0}
                onClick={generateBatch}
                type="button"
              >
                {isGenerating ? "生成中" : "开始批量初稿"}
              </button>
            </div>
            <div className="grid gap-2">
              {(queue?.warnings.length ? queue.warnings : ["当前队列暂无明显风险。"]).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">执行结果</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {results.map((result) => (
              <div className="rounded-md bg-slate-50 p-3" key={`${result.chapterId}-${result.taskId}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{result.chapterTitle}</span>
                  <span>{result.status === "succeeded" ? "成功" : "失败"} · {result.wordCount} 字</span>
                </div>
                {result.error ? <p className="mt-1">{result.error}</p> : null}
                <Link className="mt-2 inline-block text-xs font-medium text-slate-950" href={`/projects/${projectId}/chapters/${result.chapterId}`}>
                  打开章节
                </Link>
              </div>
            ))}
            {results.length === 0 ? <p>执行后会显示每章结果、任务编号和失败原因。</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {queue?.candidates.map((candidate) => {
          const isReady = candidate.status === "ready";
          return (
            <label
              className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm sm:grid-cols-[auto_1fr_auto]"
              key={candidate.chapterId}
            >
              <input
                checked={selectedIds.includes(candidate.chapterId)}
                className="mt-1"
                disabled={!isReady || isGenerating}
                onChange={() => toggleChapter(candidate.chapterId)}
                type="checkbox"
              />
              <span>
                <span className="block font-medium text-slate-950">第 {candidate.order} 章 · {candidate.title}</span>
                <span className="mt-1 block text-slate-600">{candidate.reason}</span>
                {candidate.missingFields.length ? (
                  <span className="mt-1 block text-slate-500">缺口：{candidate.missingFields.join("、")}</span>
                ) : null}
              </span>
              <span className="text-xs text-slate-500">{statusLabel(candidate.status)} · {candidate.wordCount} 字</span>
            </label>
          );
        })}
        {queue && queue.candidates.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有章节卡。先在章节生产排期里生成章节卡。</p>
        ) : null}
      </div>
    </section>
  );
}
