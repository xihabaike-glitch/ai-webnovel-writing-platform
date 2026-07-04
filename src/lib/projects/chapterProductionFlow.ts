import type { SubmissionChecklist } from "./submissionChecklist.ts";

export type ChapterProductionFlowStageId = "hooks" | "drafts" | "reviews" | "second_pass" | "story_tree" | "submission";
export type ChapterProductionFlowStatus = "blocked" | "working" | "ready";
export type ChapterProductionFlowTone = "slate" | "amber" | "sky" | "emerald" | "rose";

export interface ChapterProductionFlowChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  hook: string;
  cliffhanger: string;
}

export interface ChapterProductionFlowAiTask {
  taskType: string;
  status: string;
  chapter?: {
    id: string;
  } | null;
}

export interface ChapterProductionFlowGateTask {
  dispatchKey: string;
  state: string;
  href: string;
}

export interface ChapterProductionFlowStage {
  id: ChapterProductionFlowStageId;
  label: string;
  status: ChapterProductionFlowStatus;
  count: number;
  target: number;
  tone: ChapterProductionFlowTone;
  detail: string;
  action: string;
  actionLabel: string;
  href: string;
}

export interface ChapterProductionFlow {
  status: ChapterProductionFlowStatus;
  headline: string;
  nextAction: string;
  nextActionLabel: string;
  nextHref: string;
  bottleneck: ChapterProductionFlowStageId;
  stages: ChapterProductionFlowStage[];
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stageStatus(count: number, target: number): ChapterProductionFlowStatus {
  if (target <= 0 || count <= 0) return "blocked";
  if (count >= target) return "ready";
  return "working";
}

function stageTone(status: ChapterProductionFlowStatus): ChapterProductionFlowTone {
  if (status === "ready") return "emerald";
  if (status === "working") return "sky";
  return "amber";
}

function completedTaskChapterIds(tasks: ChapterProductionFlowAiTask[], taskType: string) {
  return new Set(tasks
    .filter((task) => task.taskType === taskType && task.status === "succeeded" && task.chapter?.id)
    .map((task) => task.chapter?.id)
    .filter((id): id is string => Boolean(id)));
}

function storyTreeChapterIds(tasks: ChapterProductionFlowGateTask[]) {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.state !== "completed") continue;
    if (!task.dispatchKey.startsWith("story-tree:") && !task.dispatchKey.startsWith("story-tree-experience:")) continue;
    const match = task.href.match(/\/chapters\/([^/#?]+)/);
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

export function buildChapterProductionFlow(input: {
  projectId: string;
  chapters: ChapterProductionFlowChapter[];
  aiTasks: ChapterProductionFlowAiTask[];
  gateTasks: ChapterProductionFlowGateTask[];
  submissionChecklist: SubmissionChecklist;
}): ChapterProductionFlow {
  const sortedChapters = [...input.chapters].sort((left, right) => left.order - right.order);
  const firstThree = sortedChapters.slice(0, 3);
  const firstThreeTarget = 3;
  const hookReady = firstThree.filter((chapter) => hasText(chapter.hook) && hasText(chapter.cliffhanger)).length;
  const draftedChapters = sortedChapters.filter((chapter) => chapter.wordCount > 0);
  const draftTarget = Math.max(1, firstThreeTarget);
  const reviewedIds = completedTaskChapterIds(input.aiTasks, "chapter_review");
  const secondPassIds = completedTaskChapterIds(input.aiTasks, "chapter_second_pass");
  const treeIds = storyTreeChapterIds(input.gateTasks);
  const draftedFirstThreeIds = firstThree.filter((chapter) => chapter.wordCount > 0).map((chapter) => chapter.id);
  const reviewReady = draftedFirstThreeIds.filter((id) => reviewedIds.has(id)).length;
  const secondPassReady = draftedFirstThreeIds.filter((id) => secondPassIds.has(id)).length;
  const storyTreeReady = draftedFirstThreeIds.filter((id) => treeIds.has(id)).length;
  const submissionTarget = input.submissionChecklist.items.length || 1;
  const submissionReady = input.submissionChecklist.passCount;
  const stages: ChapterProductionFlowStage[] = [
    {
      id: "hooks",
      label: "开头钩子",
      count: hookReady,
      target: firstThreeTarget,
      status: stageStatus(hookReady, firstThreeTarget),
      tone: stageTone(stageStatus(hookReady, firstThreeTarget)),
      detail: `前三章钩子和章末悬念 ${hookReady}/${firstThreeTarget}。`,
      action: "先补前三章钩子和章末追读点。",
      actionLabel: "补钩子",
      href: `#create-chapter`,
    },
    {
      id: "drafts",
      label: "正文初稿",
      count: draftedChapters.length,
      target: draftTarget,
      status: stageStatus(draftedChapters.length, draftTarget),
      tone: stageTone(stageStatus(draftedChapters.length, draftTarget)),
      detail: `已有正文 ${draftedChapters.length}/${draftTarget} 章。`,
      action: "先用章节生产排期或批量初稿中心把正文跑出来。",
      actionLabel: "生成初稿",
      href: "#chapter-production",
    },
    {
      id: "reviews",
      label: "审稿",
      count: reviewReady,
      target: draftTarget,
      status: stageStatus(reviewReady, draftTarget),
      tone: stageTone(stageStatus(reviewReady, draftTarget)),
      detail: `前三章已审稿 ${reviewReady}/${draftTarget}。`,
      action: "把已有正文送进批量审稿，不要裸稿继续堆字。",
      actionLabel: "送审稿",
      href: "#ai-pipeline",
    },
    {
      id: "second_pass",
      label: "二改",
      count: secondPassReady,
      target: draftTarget,
      status: stageStatus(secondPassReady, draftTarget),
      tone: stageTone(stageStatus(secondPassReady, draftTarget)),
      detail: `前三章完成二改 ${secondPassReady}/${draftTarget}。`,
      action: "先按审稿问题完成二改，再进入发布准备。",
      actionLabel: "执行二改",
      href: "#review-pipeline",
    },
    {
      id: "story_tree",
      label: "大树复检",
      count: storyTreeReady,
      target: draftTarget,
      status: stageStatus(storyTreeReady, draftTarget),
      tone: stageTone(stageStatus(storyTreeReady, draftTarget)),
      detail: `前三章有结构复检 ${storyTreeReady}/${draftTarget}。`,
      action: "补大树结构复检，确认开头、主干、分支、叶片和人物弧光。",
      actionLabel: "补复检",
      href: "#story-tree-experience",
    },
    {
      id: "submission",
      label: "投稿预检",
      count: submissionReady,
      target: submissionTarget,
      status: stageStatus(submissionReady, submissionTarget),
      tone: input.submissionChecklist.riskCount > 0 ? "rose" : stageTone(stageStatus(submissionReady, submissionTarget)),
      detail: `投稿准备度 ${clampPercent((submissionReady / submissionTarget) * 100)}%，待处理 ${input.submissionChecklist.todoCount} 项，风险 ${input.submissionChecklist.riskCount} 项。`,
      action: "清掉投稿前检查里的待处理和风险项。",
      actionLabel: "修预检",
      href: "#submission-precheck",
    },
  ];
  const bottleneck = stages.find((stage) => stage.status !== "ready") ?? stages.find((stage) => stage.tone === "rose") ?? stages.at(-1) as ChapterProductionFlowStage;
  const status = stages.every((stage) => stage.status === "ready") && input.submissionChecklist.riskCount === 0
    ? "ready"
    : bottleneck.status === "blocked" ? "blocked" : "working";
  const headline = status === "ready"
    ? "章节生产线已跑通，可以进入稳定连载和平台导出。"
    : status === "blocked"
      ? `章节生产线卡在「${bottleneck.label}」。`
      : `章节生产线正在推进，当前最该处理「${bottleneck.label}」。`;

  return {
    status,
    headline,
    nextAction: bottleneck.action,
    nextActionLabel: status === "ready" ? "查看投稿预检" : bottleneck.actionLabel,
    nextHref: bottleneck.href,
    bottleneck: bottleneck.id,
    stages,
  };
}
