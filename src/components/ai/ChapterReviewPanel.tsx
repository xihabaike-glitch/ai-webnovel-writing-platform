"use client";

import { useState } from "react";

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

export function ChapterReviewPanel({ chapterId }: { chapterId: string }) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-4">
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
          {result.issues.map((issue, index) => (
            <div key={`${issue.type}-${index}`} className="rounded-md bg-slate-50 p-3">
              <div className="font-medium">
                {issue.severity} · {issue.type}
              </div>
              <p className="mt-1 text-slate-700">{issue.message}</p>
              <p className="mt-1 text-slate-500">{issue.suggestion}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">用 Mock 模型先验证审稿链路，真实模型稍后接入。</p>
      )}
    </aside>
  );
}

