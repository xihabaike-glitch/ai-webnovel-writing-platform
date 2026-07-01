export type ChapterStatus = "outline" | "draft" | "revising" | "final";

export interface ChapterUpdateInput {
  title: string;
  content: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: ChapterStatus;
}

export function buildChapterUpdatePayload(input: ChapterUpdateInput) {
  return {
    title: input.title.trim(),
    content: input.content,
    goal: input.goal.trim(),
    hook: input.hook.trim(),
    conflict: input.conflict.trim(),
    valueShift: input.valueShift.trim(),
    cliffhanger: input.cliffhanger.trim(),
    status: input.status,
  };
}

