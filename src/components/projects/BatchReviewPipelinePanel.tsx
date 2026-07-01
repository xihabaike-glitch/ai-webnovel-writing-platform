"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SecondPassMode = "more_hook" | "more_payoff" | "less_exposition" | "more_emotion" | "platform_fit";

interface ReviewPipelineCandidate {
  chapterId: string;
  order: number;
  title: string;
  wordCount: number;
  reviewStatus: "ready" | "empty" | "running" | "reviewed";
  secondPassStatus: "ready" | "blocked" | "running" | "done";
  reviewScore: number | null;
  issueCount: number;
  instruction: string;
  secondPassMode: SecondPassMode;
  reason: string;
  recommendedReview: boolean;
  recommendedSecondPass: boolean;
}

interface ReviewPipelineQueue {
  totalCandidates: number;
  reviewReadyCount: number;
  secondPassReadyCount: number;
  recommendedReviewChapterIds: string[];
  recommendedSecondPassChapterIds: string[];
  warnings: string[];
  candidates: ReviewPipelineCandidate[];
}

interface ActiveProvider {
  providerId: string;
  displayName: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  baseUrl: string | null;
}

interface BatchPipelineResult {
  chapterId: string;
  status: "succeeded" | "failed";
  chapterTitle: string;
  taskId: string;
  score?: number | null;
  issueCount?: number;
  wordCount?: number;
  error: string | null;
}

function reviewStatusLabel(status: ReviewPipelineCandidate["reviewStatus"]) {
  const labels = {
    ready: "待审稿",
    empty: "无正文",
    running: "审稿中",
    reviewed: "已审稿",
  };
  return labels[status];
}

function secondPassStatusLabel(status: ReviewPipelineCandidate["secondPassStatus"]) {
  const labels = {
    ready: "可二改",
    blocked: "未就绪",
    running: "二改中",
    done: "已二改",
  };
  return labels[status];
}

function modeLabel(mode: SecondPassMode) {
  const labels = {
    more_hook: "强钩子",
    more_payoff: "强爽点",
    less_exposition: "少解释",
    more_emotion: "强情绪",
    platform_fit: "平台适配",
  };
  return labels[mode];
}

export function BatchReviewPipelinePanel({ projectId }: { projectId: string }) {
  const [queue, setQueue] = useState<ReviewPipelineQueue | null>(null);
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [selectedSecondPassIds, setSelectedSecondPassIds] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState(1200);
  const [results, setResults] = useState<BatchPipelineResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<"review" | "second_pass" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reviewReadyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.reviewStatus === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );
  const secondPassReadyIds = useMemo(
    () => queue?.candidates.filter((candidate) => candidate.secondPassStatus === "ready").map((candidate) => candidate.chapterId) ?? [],
    [queue],
  );

  async function loadQueue() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-review`);
      if (!response.ok) {
        throw new Error("读取批量审稿队列失败。");
      }
      const payload = (await response.json()) as {
        queue: ReviewPipelineQueue;
        activeProvider: ActiveProvider;
      };
      setQueue(payload.queue);
      setActiveProvider(payload.activeProvider);
      setSelectedReviewIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedReviewChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedReviewChapterIds;
      });
      setSelectedSecondPassIds((current) => {
        const kept = current.filter((chapterId) => payload.queue.recommendedSecondPassChapterIds.includes(chapterId));
        return kept.length ? kept : payload.queue.recommendedSecondPassChapterIds;
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取批量审稿队列失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function runBatch(action: "review" | "second_pass") {
    const chapterIds = action === "review" ? selectedReviewIds : selectedSecondPassIds;
    setRunningAction(action);
    setMessage(null);
    setResults([]);
    try {
      const response = await fetch(`/api/projects/${projectId}/batch-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, chapterIds, targetWords }),
      });
      const payload = await response.json() as {
        results?: BatchPipelineResult[];
        queue?: ReviewPipelineQueue;
        activeProvider?: ActiveProvider;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "批量处理失败。");
      }
      setResults(payload.results ?? []);
      if (payload.queue) setQueue(payload.queue);
      if (payload.activeProvider) setActiveProvider(payload.activeProvider);
      setSelectedReviewIds(payload.queue?.recommendedReviewChapterIds ?? []);
      setSelectedSecondPassIds(payload.queue?.recommendedSecondPassChapterIds ?? []);
      const succeeded = (payload.results ?? []).filter((result) => result.status === "succeeded").length;
      const failed = (payload.results ?? []).filter((result) => result.status === "failed").length;
      setMessage(`${action === "review" ? "批量审稿" : "批量二改"}完成：成功 ${succeeded} 章，失败 ${failed} 章。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "批量处理失败。");
    } finally {
      setRunningAction(null);
    }
  }

  function toggleReview(chapterId: string) {
    setSelectedReviewIds((current) => (
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId].slice(0, 5)
    ));
  }

  function toggleSecondPass(chapterId: string) {
    setSelectedSecondPassIds((current) => (
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
          <h2 className="font-medium">批量审稿与二改生产线</h2>
          <p className="mt-1 text-sm text-slate-600">把已生成初稿的章节批量送审，再按审稿问题批量二改，覆盖前自动保存版本。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading || Boolean(runningAction)}
          onClick={loadQueue}
          type="button"
        >
          {isLoading ? "读取中" : "刷新生产线"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">候选章节</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.totalCandidates ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">待审稿</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.reviewReadyCount ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">可二改</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{queue?.secondPassReadyCount ?? 0}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs text-slate-500">当前模型</div>
          <div className="mt-1 text-sm font-medium text-slate-950">{activeProvider ? `${activeProvider.displayName} · ${activeProvider.model}` : "读取中"}</div>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量审稿</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <button
              className="rounded-md border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              disabled={reviewReadyIds.length === 0 || Boolean(runningAction)}
              onClick={() => setSelectedReviewIds(reviewReadyIds.slice(0, 5))}
              type="button"
            >
              选择前 5 章
            </button>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white disabled:opacity-50"
              disabled={selectedReviewIds.length === 0 || Boolean(runningAction)}
              onClick={() => runBatch("review")}
              type="button"
            >
              {runningAction === "review" ? "审稿中" : "开始批量审稿"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">批量二改</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <label className="grid gap-1">
              二改目标字数
              <input
                className="rounded-md border border-slate-200 px-3 py-2"
                max={6000}
                min={500}
                onChange={(event) => setTargetWords(Number(event.target.value))}
                type="number"
                value={targetWords}
              />
            </label>
            <button
              className="rounded-md border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              disabled={secondPassReadyIds.length === 0 || Boolean(runningAction)}
              onClick={() => setSelectedSecondPassIds(secondPassReadyIds.slice(0, 5))}
              type="button"
            >
              选择前 5 章
            </button>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white disabled:opacity-50"
              disabled={selectedSecondPassIds.length === 0 || Boolean(runningAction)}
              onClick={() => runBatch("second_pass")}
              type="button"
            >
              {runningAction === "second_pass" ? "二改中" : "开始批量二改"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">风险提醒</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {(queue?.warnings.length ? queue.warnings : ["当前生产线暂无明显风险。"]).map((warning) => (
              <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {queue?.candidates.map((candidate) => (
          <div className="grid gap-3 rounded-md border border-slate-200 p-3 text-sm lg:grid-cols-[auto_auto_1fr_auto]" key={candidate.chapterId}>
            <input
              checked={selectedReviewIds.includes(candidate.chapterId)}
              className="mt-1"
              disabled={candidate.reviewStatus !== "ready" || Boolean(runningAction)}
              onChange={() => toggleReview(candidate.chapterId)}
              title="选择审稿"
              type="checkbox"
            />
            <input
              checked={selectedSecondPassIds.includes(candidate.chapterId)}
              className="mt-1"
              disabled={candidate.secondPassStatus !== "ready" || Boolean(runningAction)}
              onChange={() => toggleSecondPass(candidate.chapterId)}
              title="选择二改"
              type="checkbox"
            />
            <div>
              <div className="font-medium text-slate-950">第 {candidate.order} 章 · {candidate.title}</div>
              <p className="mt-1 text-slate-600">{candidate.reason}</p>
              {candidate.secondPassStatus === "ready" ? (
                <p className="mt-1 text-slate-500">二改方向：{modeLabel(candidate.secondPassMode)} · {candidate.instruction}</p>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              <div>{reviewStatusLabel(candidate.reviewStatus)} · {candidate.reviewScore ?? "--"} 分 · {candidate.issueCount} 问题</div>
              <div className="mt-1">{secondPassStatusLabel(candidate.secondPassStatus)} · {candidate.wordCount} 字</div>
              <Link className="mt-2 inline-block font-medium text-slate-950" href={`/projects/${projectId}/chapters/${candidate.chapterId}`}>
                打开章节
              </Link>
            </div>
          </div>
        ))}
        {queue && queue.candidates.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有章节，先建立章节卡并生成初稿。</p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">执行结果</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {results.map((result) => (
              <div className="rounded-md bg-slate-50 p-3" key={`${result.chapterId}-${result.taskId}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">{result.chapterTitle}</span>
                  <span>{result.status === "succeeded" ? "成功" : "失败"}</span>
                </div>
                <div className="mt-1">
                  {typeof result.score === "number" ? `${result.score} 分 · ${result.issueCount ?? 0} 个问题` : `${result.wordCount ?? 0} 字`}
                </div>
                {result.error ? <p className="mt-1">{result.error}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
