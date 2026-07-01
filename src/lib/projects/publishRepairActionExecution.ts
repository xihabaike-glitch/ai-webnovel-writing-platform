import type { PublishRepairAction, PublishRepairActionKind } from "./platformPublishExport.ts";

export const executablePublishRepairKinds: PublishRepairActionKind[] = [
  "run_chapter_review",
  "run_second_pass",
];

export function canExecutePublishRepairAction(action: Pick<PublishRepairAction, "kind" | "chapterId">) {
  return executablePublishRepairKinds.includes(action.kind) && Boolean(action.chapterId);
}

export function buildPublishRepairSecondPassInstruction(action: Pick<PublishRepairAction, "chapterTitle" | "detail">) {
  return [
    "根据发布前最终质检结果执行二改。",
    action.chapterTitle ? `章节：${action.chapterTitle}。` : "",
    action.detail,
    "优先补强开头钩子、冲突推进、平台爽点密度和章末追读悬念；保留原有主线信息，不要另起炉灶。",
  ].filter(Boolean).join("\n");
}
