"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groupReviewIssues, nonEmptyReviewGroups } from "@/lib/ai/reviewGrouping";
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

interface ReviewIssue {
  severity: string;
  type: string;
  message: string;
  suggestion: string;
}

interface ReviewResult {
  score: number;
  issues: ReviewIssue[];
  summary: string;
}

interface ReviewTask {
  id: string;
  status: string;
  outputText: string | null;
  createdAt: string;
}

export function ChapterReviewPanel({
  chapterId,
  platform,
}: {
  chapterId: string;
  platform: PlatformProfile;
}) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [history, setHistory] = useState<ReviewTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const groupedIssues = useMemo(() => (result ? nonEmptyReviewGroups(groupReviewIssues(result.issues)) : []), [result]);

  const loadHistory = useCallback(async () => {
    const response = await fetch(`/api/ai/tasks/chapter-review?chapterId=${chapterId}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { tasks: ReviewTask[] };
    setHistory(payload.tasks);
  }, [chapterId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function runReview() {
    setIsRunning(true);
    try {
      const response = await fetch("/api/ai/tasks/chapter-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const payload = (await response.json()) as { result: ReviewResult };
      setResult(payload.result);
      await loadHistory();
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <div className="font-medium text-slate-900">{platform.name} 平台提醒</div>
        <div className="mt-2">开头：{platform.openingRules.join("；")}</div>
        <div className="mt-1">审稿：{platform.reviewFocus.join("、")}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">AI 章节审稿</h2>
        <button
          className="rounded-md bg-slate-950 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={isRunning}
          onClick={runReview}
          type="button"
        >
          {isRunning ? "审稿中" : "运行"}
        </button>
      </div>
      {result ? (
        <div className="mt-4 grid gap-3 text-sm">
          <div className="font-medium">评分：{result.score}</div>
          <p className="text-slate-600">{result.summary}</p>
          {groupedIssues.map((group) => (
            <div key={group.label} className="rounded-md border border-slate-200 p-3">
              <div className="font-medium">{group.label}</div>
              <div className="mt-2 grid gap-2">
                {group.issues.map((issue, index) => (
                  <div key={`${issue.type}-${index}`} className="rounded-md bg-slate-50 p-3">
                    <div className="font-medium">
                      {issue.severity} · {issue.type}
                    </div>
                    <p className="mt-1 text-slate-700">{issue.message}</p>
                    <p className="mt-1 text-slate-500">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">用 Mock 模型先验证审稿链路，真实模型稍后接入。</p>
      )}
      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-medium">最近审稿</h3>
        <div className="mt-2 grid gap-2">
          {history.map((task) => (
            <button
              className="rounded-md bg-slate-50 p-2 text-left text-xs text-slate-600 hover:bg-slate-100"
              key={task.id}
              onClick={() => {
                if (task.outputText) setResult(JSON.parse(task.outputText) as ReviewResult);
              }}
              type="button"
            >
              <div>{new Date(task.createdAt).toLocaleString()}</div>
              <div>{task.status}</div>
            </button>
          ))}
          {history.length === 0 ? <p className="text-xs text-slate-500">暂无历史审稿。</p> : null}
        </div>
      </div>
    </aside>
  );
}
