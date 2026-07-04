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
  completionEvidence?: string | null;
  evidence?: string[] | string | null;
  completedAt?: Date | string | null;
  title?: string | null;
  actionLabel?: string | null;
  ownerRole?: string | null;
  priorityScore?: number | null;
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
  completedDispatches: ChapterProductionFlowCompletedDispatch[];
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
  followUpNotice?: ChapterProductionFlowFollowUpNotice;
  followUpResultNotice?: ChapterProductionFlowFollowUpResultNotice;
  recheckNotice?: ChapterProductionFlowRecheckNotice;
  stages: ChapterProductionFlowStage[];
}

export interface ChapterProductionFlowFollowUpNotice {
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  count: number;
}

export interface ChapterProductionFlowFollowUpResultNotice {
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  count: number;
  status: "cleared" | "needs_action" | "watch";
}

export interface ChapterProductionFlowRecheckNotice {
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  count: number;
  runAction?: ChapterProductionFlowRecheckAction;
}

export interface ChapterProductionFlowRecheckAction {
  endpoint: string;
  dispatches: ChapterProductionFlowCompletedDispatch[];
  label: string;
  completionEvidence: string;
}

export interface ChapterProductionFlowCompletedDispatch {
  dispatchKey: string;
  completionEvidence: string;
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

function isRecheckFollowUpTask(task: ChapterProductionFlowGateTask) {
  return task.dispatchKey.startsWith("story-tree-followup:")
    || task.dispatchKey.startsWith("submission-recheck-followup:");
}

function evidenceLines(value: ChapterProductionFlowGateTask["evidence"]) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [value];
  }
}

function completedAtTime(task: ChapterProductionFlowGateTask) {
  if (!task.completedAt) return 0;
  const time = new Date(task.completedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function verdictStatus(verdict: string, currentScore: number): ChapterProductionFlowFollowUpResultNotice["status"] {
  if (verdict === "分数变差" || verdict === "分数未变" || currentScore < 80) return "needs_action";
  if (verdict === "无历史基准") return "watch";
  return "cleared";
}

function parseFollowUpRecheckResult(task: ChapterProductionFlowGateTask) {
  for (const line of evidenceLines(task.evidence)) {
    const storyTreeMatch = line.match(/大树结构复检：(?:(\d+)\s*->\s*)?(\d+)\s*分，(分数变好|分数变差|分数未变|无历史基准)：(.+)/);
    if (storyTreeMatch) {
      const previousScore = storyTreeMatch[1] ? Number(storyTreeMatch[1]) : null;
      const currentScore = Number(storyTreeMatch[2]);
      if (!Number.isFinite(currentScore)) continue;
      return {
        status: verdictStatus(storyTreeMatch[3], currentScore),
        line: `大树结构 ${previousScore === null ? currentScore : `${previousScore} -> ${currentScore}`} 分，${storyTreeMatch[3]}：${storyTreeMatch[4].trim()}`,
      };
    }

    const evidenceLoopMatch = line.match(/证据闭环复检：(?:(\d+)\s*->\s*)?(\d+)\s*分，(分数变好|分数变差|分数未变|无历史基准)：(.+)/);
    if (evidenceLoopMatch) {
      const previousScore = evidenceLoopMatch[1] ? Number(evidenceLoopMatch[1]) : null;
      const currentScore = Number(evidenceLoopMatch[2]);
      if (!Number.isFinite(currentScore)) continue;
      return {
        status: verdictStatus(evidenceLoopMatch[3], currentScore),
        line: `平台证据 ${previousScore === null ? currentScore : `${previousScore} -> ${currentScore}`} 分，${evidenceLoopMatch[3]}：${evidenceLoopMatch[4].trim()}`,
      };
    }
  }

  return null;
}

function recheckFollowUpNotice(tasks: ChapterProductionFlowGateTask[]): ChapterProductionFlowFollowUpNotice | undefined {
  const activeTasks = tasks
    .filter((task) => isRecheckFollowUpTask(task) && task.state !== "completed")
    .sort((left, right) => (right.priorityScore ?? 0) - (left.priorityScore ?? 0));

  if (activeTasks.length === 0) return undefined;

  const sampleTasks = activeTasks.slice(0, 3);
  const taskLabels = sampleTasks.map((task) => {
    const title = task.title?.trim() || task.dispatchKey;
    const owner = task.ownerRole?.trim();
    const action = task.actionLabel?.trim();
    return [title, owner ? `负责人：${owner}` : null, action ? `动作：${action}` : null]
      .filter(Boolean)
      .join("，");
  });

  return {
    title: `有 ${activeTasks.length} 个复查返工派单待处理`,
    detail: taskLabels.join("；"),
    href: "/dispatch",
    actionLabel: "查看派单",
    count: activeTasks.length,
  };
}

function recheckFollowUpResultNotice(tasks: ChapterProductionFlowGateTask[]): ChapterProductionFlowFollowUpResultNotice | undefined {
  const completedTasks = tasks
    .filter((task) => isRecheckFollowUpTask(task) && task.state === "completed")
    .map((task) => ({ task, result: parseFollowUpRecheckResult(task) }))
    .filter((item): item is { task: ChapterProductionFlowGateTask; result: NonNullable<ReturnType<typeof parseFollowUpRecheckResult>> } => Boolean(item.result))
    .sort((left, right) => completedAtTime(right.task) - completedAtTime(left.task));

  if (completedTasks.length === 0) return undefined;

  const status: ChapterProductionFlowFollowUpResultNotice["status"] = completedTasks.some((item) => item.result.status === "needs_action")
    ? "needs_action"
    : completedTasks.some((item) => item.result.status === "watch")
      ? "watch"
      : "cleared";
  const titlePrefix = status === "cleared" ? "返工验收通过" : status === "needs_action" ? "返工验收未解除" : "返工验收观察";
  const titleSuffix = status === "cleared" ? "已解除" : status === "needs_action" ? "仍需处理" : "待确认";
  const detail = completedTasks.slice(0, 3).map(({ task, result }) => {
    const title = task.title?.trim() || task.dispatchKey;
    return `${title}：${result.line}`;
  }).join("；");

  return {
    title: `${titlePrefix}：${completedTasks.length} 个完成派单${titleSuffix}`,
    detail,
    href: "/dispatch",
    actionLabel: "查看派单",
    count: completedTasks.length,
    status,
  };
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
  const completedDispatches = matched
    .filter((task) => task.state === "completed")
    .map((task) => ({
      dispatchKey: task.dispatchKey,
      completionEvidence: task.completionEvidence?.trim() || "项目页复查已完成的大树结构派单，重新计算章节结构复检结果。",
    }));

  return {
    assigned: assignedIds.size,
    completed: completedIds.size,
    pending: pendingIds.size,
    completedDispatches,
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
  const completedDispatches = matched
    .filter((task) => task.state === "completed")
    .map((task) => ({
      dispatchKey: task.dispatchKey,
      completionEvidence: task.completionEvidence?.trim() || "项目页复查已完成的投稿预检派单，重新计算发布准备与平台风险。",
    }));

  return {
    assigned: matched.length,
    completed,
    pending,
    completedDispatches,
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
  const recheckStages = stages.filter((stage) => (
    stage.dispatchSummary
    && stage.dispatchSummary.pending === 0
    && stage.dispatchSummary.completed > 0
    && (stage.status !== "ready" || stage.tone === "rose")
  ));
  const recheckNotice = recheckStages.length > 0
    ? {
        title: `有 ${recheckStages.length} 个完成派单待复查`,
        detail: recheckStages.map((stage) => `${stage.label}：${stage.dispatchSummary?.detail}`).join(" "),
        href: recheckStages[0].dispatchSummary?.href ?? "#chapter-production-flow",
        actionLabel: recheckStages[0].dispatchSummary?.actionLabel ?? "去复查",
        count: recheckStages.length,
        runAction: {
          endpoint: "/api/gate/dispatch-tasks",
          dispatches: recheckStages.flatMap((stage) => stage.dispatchSummary?.completedDispatches ?? []).slice(0, 10),
          label: "一键复查",
          completionEvidence: "项目页流水线复查已完成派单，刷新卡点状态和复检证据。",
        },
      }
    : undefined;
  const followUpNotice = recheckFollowUpNotice(input.gateTasks);
  const followUpResultNotice = recheckFollowUpResultNotice(input.gateTasks);
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
    followUpNotice,
    followUpResultNotice,
    recheckNotice,
    stages,
  };
}
