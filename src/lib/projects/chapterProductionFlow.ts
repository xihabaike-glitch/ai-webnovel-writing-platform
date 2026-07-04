import type { SubmissionChecklist } from "./submissionChecklist.ts";

export type ChapterProductionFlowStageId = "hooks" | "drafts" | "reviews" | "second_pass" | "story_tree" | "submission";
export type ChapterProductionFlowStatus = "blocked" | "working" | "ready";
export type ChapterProductionFlowTone = "slate" | "amber" | "sky" | "emerald" | "rose";
export type ChapterProductionFlowBatchAction = "review" | "second_pass";
export type ChapterProductionFlowRunAction =
  | {
      type: "batch_review";
      action: ChapterProductionFlowBatchAction;
      endpoint: string;
      chapterIds: string[];
      targetWords?: number;
      label: string;
      afterSuccess: ChapterProductionFlowFollowUp;
    }
  | {
      type: "story_tree_recheck";
      endpoint: string;
      chapterIds: string[];
      source: "chapter_draft" | "chapter_second_pass" | "first_three_rewrite";
      label: string;
      afterSuccess: ChapterProductionFlowFollowUp;
    }
  | {
      type: "submission_precheck_repair";
      endpoint: string;
      itemIds: string[];
      label: string;
      afterSuccess: ChapterProductionFlowFollowUp;
    };

export interface ChapterProductionFlowFollowUp {
  href: string;
  label: string;
  detail: string;
}

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
  outputText?: string | null;
  createdAt?: Date | string;
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
  runAction?: ChapterProductionFlowRunAction;
  dispatchSummary?: ChapterProductionFlowDispatchSummary;
}

export interface ChapterProductionFlowDispatchSummary {
  assigned: number;
  completed: number;
  pending: number;
  label: string;
  detail: string;
  href: string;
  actionLabel: string;
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

function chapterIdFromHref(href: string) {
  return href.match(/\/chapters\/([^/#?]+)/)?.[1] ?? null;
}

function storyTreeChapterIds(tasks: ChapterProductionFlowGateTask[], completedOnly: boolean) {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (completedOnly && task.state !== "completed") continue;
    if (!task.dispatchKey.startsWith("story-tree:") && !task.dispatchKey.startsWith("story-tree-experience:")) continue;
    const chapterId = chapterIdFromHref(task.href);
    if (chapterId) ids.add(chapterId);
  }
  return ids;
}

function submissionPrecheckItemIds(tasks: ChapterProductionFlowGateTask[]) {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task.dispatchKey.startsWith("submission-precheck:")) continue;
    if (task.state === "completed") continue;
    const itemId = task.dispatchKey.split(":").at(2);
    if (itemId) ids.add(itemId);
  }
  return ids;
}

function storyTreeDispatchSummary(tasks: ChapterProductionFlowGateTask[], chapterIds: string[]): ChapterProductionFlowDispatchSummary | undefined {
  const targetIds = new Set(chapterIds);
  const matched = tasks.filter((task) => (
    (task.dispatchKey.startsWith("story-tree:") || task.dispatchKey.startsWith("story-tree-experience:"))
    && targetIds.has(chapterIdFromHref(task.href) ?? "")
  ));
  if (matched.length === 0) return undefined;
  const completedIds = new Set(matched.filter((task) => task.state === "completed").map((task) => chapterIdFromHref(task.href)).filter((id): id is string => Boolean(id)));
  const pendingIds = new Set(matched.filter((task) => task.state !== "completed").map((task) => chapterIdFromHref(task.href)).filter((id): id is string => Boolean(id)));
  const assignedIds = new Set([...completedIds, ...pendingIds]);

  return {
    assigned: assignedIds.size,
    completed: completedIds.size,
    pending: pendingIds.size,
    label: `已派单 ${assignedIds.size} 章`,
    detail: pendingIds.size > 0
      ? `待完成 ${pendingIds.size} 章，完成后会回流为大树结构经验。`
      : `已完成 ${completedIds.size} 章派单，等待复检结果解除卡点。`,
    href: pendingIds.size > 0 ? "/dispatch" : "#story-tree-experience",
    actionLabel: pendingIds.size > 0 ? "完成派单" : "看复检结果",
  };
}

function submissionDispatchSummary(tasks: ChapterProductionFlowGateTask[], failedItemIds: string[]): ChapterProductionFlowDispatchSummary | undefined {
  const failedIds = new Set(failedItemIds);
  const matched = tasks
    .filter((task) => task.dispatchKey.startsWith("submission-precheck:"))
    .filter((task) => failedIds.has(task.dispatchKey.split(":").at(2) ?? ""));
  if (matched.length === 0) return undefined;
  const completed = matched.filter((task) => task.state === "completed").length;
  const pending = matched.length - completed;

  return {
    assigned: matched.length,
    completed,
    pending,
    label: `已派单 ${matched.length} 项`,
    detail: pending > 0
      ? `待完成 ${pending} 项，完成后再刷新投稿预检。`
      : `已完成 ${completed} 项派单，但预检仍未通过，需要补证据或重新派发。`,
    href: pending > 0 ? "/dispatch" : "#submission-precheck",
    actionLabel: pending > 0 ? "完成派单" : "复查预检",
  };
}

function taskCreatedAt(task: ChapterProductionFlowAiTask) {
  return task.createdAt ? new Date(task.createdAt).getTime() : 0;
}

function latestSuccessfulReview(tasks: ChapterProductionFlowAiTask[], chapterId: string) {
  return [...tasks]
    .filter((task) => task.taskType === "chapter_review" && task.status === "succeeded" && task.chapter?.id === chapterId)
    .sort((left, right) => taskCreatedAt(right) - taskCreatedAt(left))
    .at(0);
}

function needsSecondPass(outputText: string | null | undefined) {
  if (!outputText) return false;
  try {
    const review = JSON.parse(outputText) as {
      score?: number;
      shouldSecondPass?: boolean;
      issues?: unknown[];
    };
    if (typeof review.shouldSecondPass === "boolean") return review.shouldSecondPass;
    if (typeof review.score === "number" && review.score < 85) return true;
    return (review.issues?.length ?? 0) > 0;
  } catch {
    return false;
  }
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
  const treeIds = storyTreeChapterIds(input.gateTasks, true);
  const treeAssignedIds = storyTreeChapterIds(input.gateTasks, false);
  const draftedFirstThreeIds = firstThree.filter((chapter) => chapter.wordCount > 0).map((chapter) => chapter.id);
  const reviewReady = draftedFirstThreeIds.filter((id) => reviewedIds.has(id)).length;
  const secondPassReady = draftedFirstThreeIds.filter((id) => secondPassIds.has(id)).length;
  const storyTreeReady = draftedFirstThreeIds.filter((id) => treeIds.has(id)).length;
  const batchEndpoint = `/api/projects/${input.projectId}/batch-review`;
  const reviewActionIds = draftedFirstThreeIds.filter((id) => !reviewedIds.has(id)).slice(0, 5);
  const secondPassActionIds = draftedFirstThreeIds
    .filter((id) => !secondPassIds.has(id) && needsSecondPass(latestSuccessfulReview(input.aiTasks, id)?.outputText))
    .slice(0, 5);
  const storyTreeActionIds = draftedFirstThreeIds.filter((id) => !treeAssignedIds.has(id)).slice(0, 5);
  const storyTreeEndpoint = `/api/projects/${input.projectId}/story-tree-recheck`;
  const submissionTarget = input.submissionChecklist.items.length || 1;
  const submissionReady = input.submissionChecklist.passCount;
  const submissionAssignedItemIds = submissionPrecheckItemIds(input.gateTasks);
  const submissionActionItemIds = input.submissionChecklist.items
    .filter((item) => item.status === "todo" || item.status === "risk")
    .map((item) => item.id)
    .filter((id) => !submissionAssignedItemIds.has(id))
    .slice(0, 5);
  const failedSubmissionItemIds = input.submissionChecklist.items
    .filter((item) => item.status === "todo" || item.status === "risk")
    .map((item) => item.id);
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
      runAction: reviewActionIds.length > 0
        ? {
            type: "batch_review",
            action: "review",
            endpoint: batchEndpoint,
            chapterIds: reviewActionIds,
            label: `一键送审 ${reviewActionIds.length} 章`,
            afterSuccess: {
              href: "#review-pipeline",
              label: "查看审稿结果",
              detail: "回到批量审稿与二改生产线，确认评分、问题和下一批二改候选。",
            },
          }
        : undefined,
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
      runAction: secondPassActionIds.length > 0
        ? {
            type: "batch_review",
            action: "second_pass",
            endpoint: batchEndpoint,
            chapterIds: secondPassActionIds,
            targetWords: 1200,
            label: `一键二改 ${secondPassActionIds.length} 章`,
            afterSuccess: {
              href: "#story-tree-experience",
              label: "看结构复检",
              detail: "进入大树结构经验库，确认二改后的结构问题有没有回流成可复用经验。",
            },
          }
        : undefined,
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
      dispatchSummary: storyTreeDispatchSummary(input.gateTasks, draftedFirstThreeIds),
      runAction: storyTreeActionIds.length > 0
        ? {
            type: "story_tree_recheck",
            endpoint: storyTreeEndpoint,
            chapterIds: storyTreeActionIds,
            source: "chapter_draft",
            label: `一键派发复检 ${storyTreeActionIds.length} 章`,
            afterSuccess: {
              href: "/dispatch",
              label: "查看派单",
              detail: "进入派单中心处理大树复检返工任务，完成后再回流结构经验。",
            },
          }
        : undefined,
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
      dispatchSummary: submissionDispatchSummary(input.gateTasks, failedSubmissionItemIds),
      runAction: submissionActionItemIds.length > 0
        ? {
            type: "submission_precheck_repair",
            endpoint: `/api/projects/${input.projectId}/submission-precheck/repair`,
            itemIds: submissionActionItemIds,
            label: `一键派发修复 ${submissionActionItemIds.length} 项`,
            afterSuccess: {
              href: "/dispatch",
              label: "查看派单",
              detail: "进入派单中心处理投稿预检缺口，补齐证据后再回到项目页复检。",
            },
          }
        : undefined,
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
