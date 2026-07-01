import type { PublishRepairAction, PublishRepairActionKind } from "./platformPublishExport";

export interface PublishRepairRunResult {
  id: string;
  action: PublishRepairActionKind;
  chapterId: string | null;
  chapterTitle: string;
  status: "pending" | "succeeded" | "failed";
  message?: string;
  error?: string;
  score?: number | null;
  issueCount?: number;
  wordCount?: number;
}

export type RawPublishRepairRunResult = Omit<PublishRepairRunResult, "id"> & { id?: string };

export function labelForAction(kind: PublishRepairActionKind) {
  if (kind === "run_second_pass") return "执行二改";
  if (kind === "run_chapter_review") return "补章节审稿";
  if (kind === "edit_chapter") return "人工改章";
  if (kind === "add_publish_chapters") return "补发布章节";
  return "打开发布包";
}

function resultId(result: Omit<PublishRepairRunResult, "id">) {
  return `${result.chapterId ?? "project"}-${result.action}`;
}

export function pendingResultFromAction(action: PublishRepairAction): PublishRepairRunResult {
  const result = {
    action: action.kind,
    chapterId: action.chapterId ?? null,
    chapterTitle: action.chapterTitle ?? "项目资料",
    status: "pending" as const,
    message: "等待处理",
  };
  return { ...result, id: resultId(result) };
}

export function normalizeRunResult(result: RawPublishRepairRunResult): PublishRepairRunResult {
  return {
    ...result,
    id: result.id ?? resultId(result),
    status: result.status === "succeeded" ? "succeeded" : result.status === "pending" ? "pending" : "failed",
    chapterTitle: result.chapterTitle || "项目资料",
    chapterId: result.chapterId ?? null,
  };
}

export function actionFromRunResult(result: PublishRepairRunResult): PublishRepairAction {
  return {
    id: result.id,
    kind: result.action,
    priority: "high",
    label: labelForAction(result.action),
    detail: result.error ?? result.message ?? "根据发布前质检结果重试。",
    chapterId: result.chapterId ?? undefined,
    chapterTitle: result.chapterTitle,
  };
}
