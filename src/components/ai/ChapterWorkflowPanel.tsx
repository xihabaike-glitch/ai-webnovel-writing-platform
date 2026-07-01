"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { groupReviewIssues, nonEmptyReviewGroups } from "@/lib/ai/reviewGrouping";
import { latestTaskStatus, type AiTaskWorkflowItem } from "@/lib/ai/taskWorkflow";
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

interface WorkflowPayload {
  chapter: {
    title: string;
    status: string;
    wordCount: number;
  };
  activeProvider: {
    providerId: string;
    displayName: string;
    model: string;
    enabled: boolean;
    hasApiKey: boolean;
    baseUrl: string | null;
  };
  tasks: AiTaskWorkflowItem[];
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "运行中",
    succeeded: "成功",
    failed: "失败",
    not_started: "未开始",
  };
  return labels[status] ?? status;
}

function parseReview(outputText: string | null) {
  if (!outputText) return null;
  try {
    return JSON.parse(outputText) as ReviewResult;
  } catch {
    return null;
  }
}

export function ChapterWorkflowPanel({
  chapterId,
  platform,
}: {
  chapterId: string;
  platform: PlatformProfile;
}) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowPayload | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const groupedIssues = useMemo(
    () => (reviewResult ? nonEmptyReviewGroups(groupReviewIssues(reviewResult.issues)) : []),
    [reviewResult],
  );
  const latestDraftStatus = workflow ? latestTaskStatus(workflow.tasks, "chapter_draft") : "not_started";
  const latestReviewStatus = workflow ? latestTaskStatus(workflow.tasks, "chapter_review") : "not_started";

  async function loadWorkflow() {
    const response = await fetch(`/api/ai/tasks/chapter-workflow?chapterId=${chapterId}`);
    if (!response.ok) return;
    const payload = (await response.json()) as WorkflowPayload;
    setWorkflow(payload);
    const latestReview = payload.tasks.find((task) => task.taskType === "chapter_review" && task.outputText);
    const parsedReview = parseReview(latestReview?.outputText ?? null);
    if (parsedReview) setReviewResult(parsedReview);
  }

  useEffect(() => {
    void loadWorkflow();
  }, [chapterId]);

  async function generateDraft() {
    setIsGeneratingDraft(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai/tasks/chapter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, targetWords: 1200 }),
      });

      if (!response.ok) {
        throw new Error("生成正文失败。");
      }

      setMessage("已生成正文初稿");
      await loadWorkflow();
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成正文失败。");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function runReview() {
    setIsReviewing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai/tasks/chapter-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });

      if (!response.ok) {
        throw new Error("审稿失败。");
      }

      const payload = (await response.json()) as { result: ReviewResult };
      setReviewResult(payload.result);
      setMessage("已完成章节审稿");
      await loadWorkflow();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "审稿失败。");
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <aside className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-medium text-slate-900">{platform.name} 平台提醒</div>
          <div className="mt-2">开头：{platform.openingRules.join("；")}</div>
          <div className="mt-1">审稿：{platform.reviewFocus.join("、")}</div>
        </div>
        <h2 className="font-medium">AI 工作流</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <div>当前模型：{workflow ? `${workflow.activeProvider.displayName} · ${workflow.activeProvider.model}` : "读取中"}</div>
          <div>正文生成：{statusText(latestDraftStatus)}</div>
          <div>章节审稿：{statusText(latestReviewStatus)}</div>
          {workflow?.activeProvider.providerId !== "mock" && !workflow?.activeProvider.hasApiKey ? (
            <div className="rounded-md bg-amber-50 p-2 text-amber-700">当前模型未配置 Key，会优先使用可用模型或 Mock。</div>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={isGeneratingDraft}
            onClick={generateDraft}
            type="button"
          >
            {isGeneratingDraft ? "生成中" : "生成正文"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isReviewing}
            onClick={runReview}
            type="button"
          >
            {isReviewing ? "审稿中" : "运行审稿"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h3 className="font-medium">审稿结果</h3>
        {reviewResult ? (
          <div className="mt-4 grid gap-3 text-sm">
            <div className="font-medium">评分：{reviewResult.score}</div>
            <p className="text-slate-600">{reviewResult.summary}</p>
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
          <p className="mt-3 text-sm text-slate-600">运行审稿后，这里会按钩子、冲突、节奏、人物和平台适配归类。</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">AI 任务时间线</h3>
          <button className="text-xs text-slate-500 hover:text-slate-900" onClick={loadWorkflow} type="button">
            刷新
          </button>
        </div>
        <div className="grid gap-2">
          {workflow?.tasks.map((task) => (
            <button
              className="rounded-md bg-slate-50 p-3 text-left text-xs text-slate-600 hover:bg-slate-100"
              key={task.id}
              onClick={() => {
                if (task.taskType === "chapter_review") {
                  const parsed = parseReview(task.outputText);
                  if (parsed) setReviewResult(parsed);
                }
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{task.label}</span>
                <span>{statusText(task.status)}</span>
              </div>
              <div className="mt-1">
                {task.providerName} · {task.model}
              </div>
              <div className="mt-1">{new Date(task.createdAt).toLocaleString()}</div>
              {task.outputPreview ? <div className="mt-2 line-clamp-2">{task.outputPreview}</div> : null}
              {task.errorMessage ? <div className="mt-2 text-red-600">{task.errorMessage}</div> : null}
            </button>
          ))}
          {workflow && workflow.tasks.length === 0 ? <p className="text-sm text-slate-600">还没有 AI 任务。</p> : null}
          {!workflow ? <p className="text-sm text-slate-600">正在读取 AI 任务。</p> : null}
        </div>
      </section>
    </aside>
  );
}
