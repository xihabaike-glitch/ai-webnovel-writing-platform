import type { GatePlatformGrowthDispatchItem, GatePlatformGrowthReviewStage, PersistedGatePlatformDispatchTask } from "../projects/gateActionReceipts.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { StoryTreeQualityAudit } from "./storyTreeQualityAudit.ts";

export type StoryTreeExperienceStatus = "usable" | "avoid" | "watch";
export type StoryTreeExperienceAxisFilter = "all" | "opening_ending" | "trunk_motion" | "branch_causality" | "leaf_soil" | "character_arc";

export interface StoryTreeExperienceItem {
  id: string;
  dispatchKey: string;
  axisId: string;
  axisLabel: string;
  source: string;
  sourceLabel: string;
  status: StoryTreeExperienceStatus;
  previousScore: number | null;
  currentScore: number;
  delta: number | null;
  verdict: string;
  lesson: string;
  action: string;
  evidence: string;
  effectStatus: StoryTreeExperienceEffectStatus | null;
  effectLine: string | null;
  title: string;
  href: string;
  completedAt: string | null;
}

export interface StoryTreeExperienceGuide {
  summary: {
    total: number;
    usable: number;
    avoid: number;
    watch: number;
  };
  groups: StoryTreeExperienceAxisGroup[];
  items: StoryTreeExperienceItem[];
  promptBlock: string;
}

export interface StoryTreeExperienceEffectDashboard {
  summary: {
    total: number;
    reinforced: number;
    weakened: number;
    watch: number;
    noFeedback: number;
  };
  decision: string;
  reusableItems: StoryTreeExperienceItem[];
  avoidItems: StoryTreeExperienceItem[];
  watchItems: StoryTreeExperienceItem[];
}

export interface StoryTreeExperienceReviewBacklogItem {
  id: string;
  databaseId?: string;
  title: string;
  axisId: string;
  axisLabel: string;
  status: StoryTreeExperienceStatus;
  sourceScore: number | null;
  action: string;
  completionEvidence: string;
  reviewPrompt: string;
  href: string;
  completedAt: string | null;
}

export interface StoryTreeExperienceReviewBacklog {
  total: number;
  nextItem: StoryTreeExperienceReviewBacklogItem | null;
  items: StoryTreeExperienceReviewBacklogItem[];
}

export type StoryTreeExperienceFlowStageId = "pending_dispatch" | "active_dispatch" | "review_backlog" | "returned" | "weakened";
export type StoryTreeExperienceFlowStatus = "empty" | "ready" | "working" | "review" | "learning" | "risk";
export type StoryTreeExperienceFlowTone = "slate" | "amber" | "sky" | "emerald" | "rose";

export interface StoryTreeExperienceAppliedTask {
  dispatchKey: string;
  state: string;
  evidence: string;
  title?: string | null;
  href?: string | null;
}

export interface StoryTreeExperienceFlowStage {
  id: StoryTreeExperienceFlowStageId;
  label: string;
  count: number;
  tone: StoryTreeExperienceFlowTone;
  detail: string;
}

export interface StoryTreeExperienceFlow {
  status: StoryTreeExperienceFlowStatus;
  headline: string;
  nextAction: string;
  nextHref: string | null;
  bottleneck: StoryTreeExperienceFlowStageId | null;
  summary: {
    learned: number;
    pendingDispatch: number;
    activeDispatch: number;
    reviewBacklog: number;
    returned: number;
    weakened: number;
  };
  stages: StoryTreeExperienceFlowStage[];
}

export interface StoryTreeExperienceAxisGroup {
  axisId: StoryTreeExperienceAxisFilter;
  axisLabel: string;
  total: number;
  usable: number;
  avoid: number;
  watch: number;
}

export interface StoryTreeExperienceSecondPassAdvice {
  id: string;
  databaseId?: string;
  title: string;
  status: StoryTreeExperienceStatus;
  effectStatus: StoryTreeExperienceEffectStatus | null;
  effectLine: string | null;
  axisId: string;
  axisLabel: string;
  sourceScore: number | null;
  action: string;
  completionEvidence: string;
  instruction: string;
  detail: string;
  href: string;
  completedAt: string | null;
}

export type StoryTreeExperienceEffectStatus = "reinforced" | "weakened" | "watch";

export interface StoryTreeExperienceEffectFeedback {
  adviceId: string;
  databaseId?: string;
  axisId: string;
  axisLabel: string;
  status: StoryTreeExperienceEffectStatus;
  sourceScore: number | null;
  currentScore: number | null;
  line: string;
}

export interface StoryTreeChapterExperienceRecommendation {
  id: string;
  axisId: string;
  axisLabel: string;
  status: StoryTreeExperienceStatus;
  priorityScore: number;
  reason: string;
  instruction: string;
  item: StoryTreeExperienceItem;
}

interface StoryTreeRecheckEvidence {
  previousScore: number | null;
  currentScore: number;
  verdict: string;
  message: string;
  action: string;
}

const axisLabels: Record<string, string> = {
  opening_ending: "开头结尾",
  trunk_motion: "主干推进",
  branch_causality: "分支因果",
  leaf_soil: "叶片土壤",
  character_arc: "人物弧光",
};

const axisOrder: Exclude<StoryTreeExperienceAxisFilter, "all">[] = [
  "opening_ending",
  "trunk_motion",
  "branch_causality",
  "leaf_soil",
  "character_arc",
];

const sourceLabels: Record<string, string> = {
  chapter_draft: "章节初稿",
  chapter_second_pass: "章节二改",
  first_three_rewrite: "前三章改写",
};

const axisStage: Record<string, GatePlatformGrowthReviewStage> = {
  opening_ending: "start_rewrite_opening",
  trunk_motion: "start_first_three_review",
  branch_causality: "start_repair_packaging",
  leaf_soil: "start_platform_package",
  character_arc: "start_first_three_review",
};

const axisOwner: Record<string, string> = {
  opening_ending: "作者",
  trunk_motion: "作者",
  branch_causality: "策划",
  leaf_soil: "策划",
  character_arc: "作者",
};

const verdictStatus: Record<string, StoryTreeExperienceStatus> = {
  分数变好: "usable",
  分数变差: "avoid",
  分数未变: "watch",
  无历史基准: "watch",
};

function parseDispatchKey(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  if (parts[0] === "story-tree-experience") {
    return {
      source: parts[2] ?? "unknown",
      axisId: parts[3] ?? "unknown",
    };
  }

  return {
    source: parts[3] ?? "unknown",
    axisId: parts[4] ?? "unknown",
  };
}

export function parseStoryTreeRecheckEvidenceLine(line: string): StoryTreeRecheckEvidence | null {
  const match = line.match(/^大树结构复检：(?:(\d+)\s*->\s*)?(\d+)\s*分，([^：]+)：([^；]+)(?:；返工动作：(.+))?$/);
  if (!match) return null;

  const previousScore = match[1] ? Number(match[1]) : null;
  const currentScore = Number(match[2]);
  if (!Number.isFinite(currentScore)) return null;

  return {
    previousScore: previousScore !== null && Number.isFinite(previousScore) ? previousScore : null,
    currentScore,
    verdict: match[3].trim(),
    message: match[4].trim(),
    action: match[5]?.trim() ?? "",
  };
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function statusLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "可复用";
  if (status === "avoid") return "避坑";
  return "观察";
}

function buildLesson(input: {
  axisLabel: string;
  sourceLabel: string;
  status: StoryTreeExperienceStatus;
  previousScore: number | null;
  currentScore: number;
  message: string;
}) {
  const scoreLine = input.previousScore === null
    ? `${input.sourceLabel}${input.axisLabel}复检为 ${input.currentScore} 分`
    : `${input.sourceLabel}${input.axisLabel}从 ${input.previousScore} 提到 ${input.currentScore} 分`;

  if (input.status === "usable") return `${scoreLine}，说明这类返工动作有效：${input.message}`;
  if (input.status === "avoid") return `${scoreLine}，这类处理可能拉低结构，需要反向避开：${input.message}`;
  return `${scoreLine}，先作为观察经验小步验证：${input.message}`;
}

function itemFromTask(task: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "evidence" | "completedAt" | "updatedAt" | "title" | "href">): StoryTreeExperienceItem | null {
  const recheckLine = task.evidence.find((line) => line.startsWith("大树结构复检："));
  if (!recheckLine) return null;

  const parsed = parseStoryTreeRecheckEvidenceLine(recheckLine);
  if (!parsed) return null;

  const { source, axisId } = parseDispatchKey(task.dispatchKey);
  const axisLabel = axisLabels[axisId] ?? "大树结构";
  const sourceLabel = sourceLabels[source] ?? "历史写作";
  const status = verdictStatus[parsed.verdict] ?? "watch";
  const effect = taskEffectFromEvidence(task.evidence);
  const effectiveStatus = statusFromEffect(status, effect.effectStatus);
  const delta = parsed.previousScore === null ? null : parsed.currentScore - parsed.previousScore;
  const action = parsed.action || `${axisLabel}：延续已复检过的返工动作。`;

  return {
    id: `${task.dispatchKey}:${parsed.currentScore}`,
    dispatchKey: task.dispatchKey,
    axisId,
    axisLabel,
    source,
    sourceLabel,
    status: effectiveStatus,
    previousScore: parsed.previousScore,
    currentScore: parsed.currentScore,
    delta,
    verdict: parsed.verdict,
    lesson: buildLesson({
      axisLabel,
      sourceLabel,
      status: effectiveStatus,
      previousScore: parsed.previousScore,
      currentScore: parsed.currentScore,
      message: parsed.message,
    }),
    action,
    evidence: recheckLine,
    effectStatus: effect.effectStatus,
    effectLine: effect.effectLine,
    title: task.title,
    href: task.href,
    completedAt: task.completedAt ?? task.updatedAt ?? null,
  };
}

function promptLine(item: StoryTreeExperienceItem) {
  const delta = item.delta === null ? `${item.currentScore} 分` : `${item.previousScore} -> ${item.currentScore} 分`;
  const effect = item.effectLine ? `；${item.effectLine}` : "";
  return `- ${statusLabel(item.status)}｜${item.axisLabel}｜${delta}：${item.action}${effect}`;
}

function applyActionLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "应用经验";
  if (status === "avoid") return "转避坑检查";
  return "小步验证";
}

export function buildStoryTreeExperienceApplyDispatchKey(projectId: string, item: Pick<StoryTreeExperienceItem, "source" | "axisId" | "dispatchKey">) {
  if (item.dispatchKey.startsWith("story-tree-experience:")) return item.dispatchKey;
  return `story-tree-experience:${projectId}:${item.source}:${item.axisId}:${item.dispatchKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function taskAxisFromApplyDispatchKey(dispatchKey: string) {
  const parts = dispatchKey.split(":");
  return {
    source: parts[2] ?? "unknown",
    axisId: parts[3] ?? "unknown",
  };
}

function taskStatusFromEvidence(evidence: string[]): StoryTreeExperienceStatus {
  if (evidence.some((item) => item.includes("分数变差") || item.includes("避坑"))) return "avoid";
  if (evidence.some((item) => item.includes("分数变好") || item.includes("说明这类返工动作有效"))) return "usable";
  return "watch";
}

function taskActionFromEvidence(evidence: string[]) {
  const actionLine = evidence.find((item) => item.startsWith("经验动作："));
  if (actionLine) return actionLine.replace("经验动作：", "").trim();
  const recheckLine = evidence.find((item) => item.includes("返工动作："));
  return recheckLine?.split("返工动作：").at(1)?.trim() ?? "";
}

function taskSourceScoreFromEvidence(evidence: string[]) {
  const recheckLine = evidence.find((item) => item.startsWith("大树结构复检："));
  return recheckLine ? parseStoryTreeRecheckEvidenceLine(recheckLine)?.currentScore ?? null : null;
}

function parseEvidenceList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function effectStatusFromLine(line: string): StoryTreeExperienceEffectStatus | null {
  if (line.includes("继续有效")) return "reinforced";
  if (line.includes("效果变弱")) return "weakened";
  if (line.includes("继续观察")) return "watch";
  return null;
}

function taskEffectFromEvidence(evidence: string[]) {
  const effectLine = [...evidence].reverse().find((item) => item.startsWith("经验应用效果：")) ?? null;
  return {
    effectLine,
    effectStatus: effectLine ? effectStatusFromLine(effectLine) : null,
  };
}

function statusFromEffect(status: StoryTreeExperienceStatus, effectStatus: StoryTreeExperienceEffectStatus | null): StoryTreeExperienceStatus {
  if (effectStatus === "reinforced") return "usable";
  if (effectStatus === "weakened") return "avoid";
  if (effectStatus === "watch") return "watch";
  return status;
}

function buildPromptBlock(items: StoryTreeExperienceItem[]) {
  if (items.length === 0) return "";
  return [
    "大树复检经验：",
    ...items.slice(0, 5).map(promptLine),
  ].join("\n");
}

function buildAxisGroups(items: StoryTreeExperienceItem[]): StoryTreeExperienceAxisGroup[] {
  const allGroup: StoryTreeExperienceAxisGroup = {
    axisId: "all",
    axisLabel: "全部",
    total: items.length,
    usable: items.filter((item) => item.status === "usable").length,
    avoid: items.filter((item) => item.status === "avoid").length,
    watch: items.filter((item) => item.status === "watch").length,
  };

  return [
    allGroup,
    ...axisOrder.map((axisId) => {
      const axisItems = items.filter((item) => item.axisId === axisId);
      return {
        axisId,
        axisLabel: axisLabels[axisId],
        total: axisItems.length,
        usable: axisItems.filter((item) => item.status === "usable").length,
        avoid: axisItems.filter((item) => item.status === "avoid").length,
        watch: axisItems.filter((item) => item.status === "watch").length,
      };
    }),
  ];
}

function experienceInstruction(item: StoryTreeExperienceItem) {
  if (item.status === "avoid") {
    return `避开已失效打法「${item.axisLabel}」：不要直接复用“${item.action}”，先改成服务当前主线压力和人物选择的动作。`;
  }
  if (item.status === "watch") {
    return `小步验证「${item.axisLabel}」经验：${item.action} 完成后重新复检，不要直接放大成固定套路。`;
  }
  return `复用已验证「${item.axisLabel}」经验：${item.action}`;
}

function sentenceWithPeriod(text: string) {
  return /[。！？.!?]$/.test(text) ? text : `${text}。`;
}

export function buildStoryTreeChapterExperienceRecommendations(input: {
  guide: StoryTreeExperienceGuide;
  audit: StoryTreeQualityAudit;
  excludeDispatchKeys?: string[];
  limit?: number;
}): StoryTreeChapterExperienceRecommendation[] {
  const weakAxes = input.audit.axes
    .filter((axis) => axis.status !== "pass")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "fail" ? -1 : 1;
      return left.score - right.score;
    });
  const targetAxes = weakAxes.length ? weakAxes : input.audit.axes.sort((left, right) => left.score - right.score).slice(0, 2);
  const axisRank = new Map<string, { axis: StoryTreeQualityAudit["axes"][number]; index: number }>(targetAxes.map((axis, index) => [axis.id, { axis, index }]));
  const statusWeight: Record<StoryTreeExperienceStatus, number> = { usable: 30, watch: 16, avoid: 12 };
  const excludedDispatchKeys = new Set(input.excludeDispatchKeys ?? []);

  return input.guide.items
    .filter((item) => !excludedDispatchKeys.has(item.dispatchKey))
    .filter((item) => axisRank.has(item.axisId))
    .map((item): StoryTreeChapterExperienceRecommendation => {
      const ranked = axisRank.get(item.axisId);
      const axis = ranked?.axis;
      const weakness = axis ? 100 - axis.score : 0;
      const priorityScore = Math.max(0, Math.min(99, weakness + statusWeight[item.status] - (ranked?.index ?? 0) * 4));
      const reason = axis
        ? `当前章节「${axis.label}」${axis.score} 分：${axis.suggestion}`
        : `当前章节需要补强「${item.axisLabel}」。`;

      return {
        id: `${item.id}:recommendation`,
        axisId: item.axisId,
        axisLabel: item.axisLabel,
        status: item.status,
        priorityScore,
        reason,
        instruction: experienceInstruction(item),
        item,
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, input.limit ?? 4);
}

export function buildStoryTreeExperienceGuide(tasks: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "evidence" | "completedAt" | "updatedAt" | "title" | "href">[]): StoryTreeExperienceGuide {
  const rawItems = tasks
    .map(itemFromTask)
    .filter((item): item is StoryTreeExperienceItem => Boolean(item));
  const itemMap = new Map<string, StoryTreeExperienceItem>();

  for (const item of rawItems) {
    const key = `${item.axisId}:${item.evidence}:${item.action}`;
    const existing = itemMap.get(key);
    if (!existing) {
      itemMap.set(key, item);
      continue;
    }

    const itemEffectWeight = item.effectStatus ? 1 : 0;
    const existingEffectWeight = existing.effectStatus ? 1 : 0;
    if (itemEffectWeight > existingEffectWeight || (itemEffectWeight === existingEffectWeight && dateValue(item.completedAt) > dateValue(existing.completedAt))) {
      itemMap.set(key, item);
    }
  }

  const items = [...itemMap.values()]
    .sort((left, right) => {
      const effectWeight: Record<StoryTreeExperienceEffectStatus, number> = { reinforced: 3, watch: 2, weakened: 1 };
      const statusWeight: Record<StoryTreeExperienceStatus, number> = { usable: 3, watch: 2, avoid: 1 };
      const leftWeight = left.effectStatus ? effectWeight[left.effectStatus] : statusWeight[left.status];
      const rightWeight = right.effectStatus ? effectWeight[right.effectStatus] : statusWeight[right.status];
      const scoreDelta = rightWeight - leftWeight;
      if (scoreDelta !== 0) return scoreDelta;
      return dateValue(right.completedAt) - dateValue(left.completedAt);
    });

  return {
    summary: {
      total: items.length,
      usable: items.filter((item) => item.status === "usable").length,
      avoid: items.filter((item) => item.status === "avoid").length,
      watch: items.filter((item) => item.status === "watch").length,
    },
    groups: buildAxisGroups(items),
    items,
    promptBlock: buildPromptBlock(items),
  };
}

export function buildStoryTreeExperienceEffectDashboard(guide: StoryTreeExperienceGuide): StoryTreeExperienceEffectDashboard {
  const reinforcedItems = guide.items.filter((item) => item.effectStatus === "reinforced");
  const weakenedItems = guide.items.filter((item) => item.effectStatus === "weakened");
  const watchEffectItems = guide.items.filter((item) => item.effectStatus === "watch");
  const noFeedbackItems = guide.items.filter((item) => !item.effectStatus);
  const effectTime = (item: StoryTreeExperienceItem) => dateValue(item.completedAt);
  const byRecent = (left: StoryTreeExperienceItem, right: StoryTreeExperienceItem) => effectTime(right) - effectTime(left);

  let decision = "还没有回流效果证据，先完成一条结构经验派单并复检。";
  if (reinforcedItems.length > 0 && weakenedItems.length === 0) {
    decision = "已出现持续有效经验，下章优先复用这些结构动作。";
  } else if (weakenedItems.length > reinforcedItems.length) {
    decision = "变弱经验偏多，先避坑或缩小验证范围，不要批量复用。";
  } else if (reinforcedItems.length > 0 && weakenedItems.length > 0) {
    decision = "有效和变弱经验并存，先复用持续有效项，同时把变弱项改成避坑检查。";
  } else if (watchEffectItems.length > 0) {
    decision = "多数经验还在观察，继续小步验证并补足复检证据。";
  }

  return {
    summary: {
      total: guide.items.length,
      reinforced: reinforcedItems.length,
      weakened: weakenedItems.length,
      watch: watchEffectItems.length,
      noFeedback: noFeedbackItems.length,
    },
    decision,
    reusableItems: reinforcedItems.sort(byRecent).slice(0, 3),
    avoidItems: weakenedItems.sort(byRecent).slice(0, 3),
    watchItems: [...watchEffectItems, ...noFeedbackItems].sort(byRecent).slice(0, 3),
  };
}

export function buildStoryTreeExperienceReviewBacklog(
  tasks: Pick<PersistedGatePlatformDispatchTask, "databaseId" | "dispatchKey" | "state" | "title" | "detail" | "href" | "evidence" | "completionEvidence" | "completedAt" | "updatedAt">[],
  limit = 5,
): StoryTreeExperienceReviewBacklog {
  const items = tasks
    .filter((task) => task.state === "completed")
    .filter((task) => task.dispatchKey.startsWith("story-tree-experience:"))
    .filter((task) => !taskEffectFromEvidence(task.evidence).effectLine)
    .map((task): StoryTreeExperienceReviewBacklogItem => {
      const { axisId } = taskAxisFromApplyDispatchKey(task.dispatchKey);
      const axisLabel = axisLabels[axisId] ?? "大树结构";
      const status = taskStatusFromEvidence(task.evidence);
      const action = taskActionFromEvidence(task.evidence);
      const sourceScore = taskSourceScoreFromEvidence(task.evidence);
      const completionEvidence = task.completionEvidence.trim();
      const reviewPrompt = completionEvidence
        ? `用完成依据复检「${axisLabel}」：${sentenceWithPeriod(completionEvidence)}补一条经验应用效果。`
        : `回到章节复检「${axisLabel}」并补一条经验应用效果，避免这条经验停在已完成但不可学习。`;

      return {
        id: task.dispatchKey,
        databaseId: task.databaseId,
        title: task.title,
        axisId,
        axisLabel,
        status,
        sourceScore,
        action,
        completionEvidence,
        reviewPrompt,
        href: task.href,
        completedAt: task.completedAt ?? task.updatedAt ?? null,
      };
    })
    .sort((left, right) => dateValue(right.completedAt) - dateValue(left.completedAt));

  return {
    total: items.length,
    nextItem: items[0] ?? null,
    items: items.slice(0, limit),
  };
}

export function buildStoryTreeExperienceFlow(input: {
  projectId: string;
  guide: StoryTreeExperienceGuide;
  appliedTasks: StoryTreeExperienceAppliedTask[];
  reviewBacklog: StoryTreeExperienceReviewBacklog;
}): StoryTreeExperienceFlow {
  const appliedTaskMap = new Map(input.appliedTasks.map((task) => [task.dispatchKey, task]));
  const pendingItems = input.guide.items.filter((item) => !appliedTaskMap.has(buildStoryTreeExperienceApplyDispatchKey(input.projectId, item)));
  const activeTasks = input.appliedTasks.filter((task) => task.state !== "completed");
  const returnedTasks = input.appliedTasks.filter((task) => task.state === "completed" && Boolean(taskEffectFromEvidence(parseEvidenceList(task.evidence)).effectLine));
  const weakenedTasks = input.appliedTasks.filter((task) => task.state === "completed" && taskEffectFromEvidence(parseEvidenceList(task.evidence)).effectStatus === "weakened");
  const firstActiveTask = activeTasks[0] ?? null;
  const nextReviewItem = input.reviewBacklog.nextItem;
  const firstPendingItem = pendingItems[0] ?? null;
  let status: StoryTreeExperienceFlowStatus = "empty";
  let headline = "结构经验还没形成闭环。";
  let nextAction = "先完成一条大树结构复检，沉淀第一条可用经验。";
  let nextHref: string | null = null;
  let bottleneck: StoryTreeExperienceFlowStageId | null = null;

  if (input.guide.items.length > 0) {
    status = "ready";
    headline = "已有结构经验，下一步要让它进入派单和回流。";
    nextAction = firstPendingItem ? `先派发「${firstPendingItem.axisLabel}」经验，别让可用动作停在库里。` : "继续观察结构经验流转。";
    nextHref = firstPendingItem?.href ?? null;
    bottleneck = firstPendingItem ? "pending_dispatch" : null;
  }
  if (activeTasks.length > 0) {
    status = "working";
    headline = "结构经验正在执行，别急着复用更多。";
    nextAction = `先完成「${firstActiveTask?.title ?? "结构经验派单"}」，否则经验会卡在执行中。`;
    nextHref = firstActiveTask?.href ?? null;
    bottleneck = "active_dispatch";
  }
  if (input.reviewBacklog.total > 0) {
    status = "review";
    headline = "结构经验已经完成，但还缺效果回流。";
    nextAction = nextReviewItem?.reviewPrompt ?? "先补一条经验应用效果。";
    nextHref = nextReviewItem?.href ?? null;
    bottleneck = "review_backlog";
  }
  if (returnedTasks.length > 0 && activeTasks.length === 0 && input.reviewBacklog.total === 0) {
    status = "learning";
    headline = "结构经验闭环已经跑通，可以开始挑选稳定打法。";
    nextAction = weakenedTasks.length > 0
      ? "先处理变弱经验，把它们变成避坑清单，再复用稳定项。"
      : "优先复用继续有效的结构动作，下一章继续验证。";
    nextHref = returnedTasks[0]?.href ?? null;
    bottleneck = weakenedTasks.length > 0 ? "weakened" : "returned";
  }
  if (weakenedTasks.length > 0 && activeTasks.length === 0 && input.reviewBacklog.total === 0 && weakenedTasks.length >= returnedTasks.length / 2) {
    status = "risk";
    headline = "变弱经验偏多，说明结构动作有过期风险。";
    nextAction = "先把变弱项改成避坑检查，不要批量复制旧打法。";
    nextHref = weakenedTasks[0]?.href ?? nextHref;
    bottleneck = "weakened";
  }

  const stages: StoryTreeExperienceFlowStage[] = [
    {
      id: "pending_dispatch",
      label: "未派单",
      count: pendingItems.length,
      tone: "slate",
      detail: "已沉淀但还没有进入执行。",
    },
    {
      id: "active_dispatch",
      label: "执行中",
      count: activeTasks.length,
      tone: "sky",
      detail: "已派发，等作者或策划完成。",
    },
    {
      id: "review_backlog",
      label: "待复盘",
      count: input.reviewBacklog.total,
      tone: "amber",
      detail: "已完成，但还缺效果回流。",
    },
    {
      id: "returned",
      label: "已回流",
      count: returnedTasks.length,
      tone: "emerald",
      detail: "已经形成经验应用效果。",
    },
    {
      id: "weakened",
      label: "变弱避坑",
      count: weakenedTasks.length,
      tone: "rose",
      detail: "回流后证明旧动作变弱。",
    },
  ];

  return {
    status,
    headline,
    nextAction,
    nextHref,
    bottleneck,
    summary: {
      learned: input.guide.items.length,
      pendingDispatch: pendingItems.length,
      activeDispatch: activeTasks.length,
      reviewBacklog: input.reviewBacklog.total,
      returned: returnedTasks.length,
      weakened: weakenedTasks.length,
    },
    stages,
  };
}

export function buildStoryTreeExperienceApplyDispatch(input: {
  projectId: string;
  projectTitle: string;
  platform: PlatformProfile;
  item: StoryTreeExperienceItem;
  now?: string;
}): GatePlatformGrowthDispatchItem {
  const now = input.now ?? new Date().toISOString();
  const priorityBase: Record<StoryTreeExperienceStatus, number> = { usable: 86, avoid: 78, watch: 72 };
  const deltaBoost = input.item.delta && input.item.delta > 0 ? Math.min(8, input.item.delta) : 0;
  const label = applyActionLabel(input.item.status);

  return {
    id: buildStoryTreeExperienceApplyDispatchKey(input.projectId, input.item),
    platformId: input.platform.id,
    platformName: input.platform.name,
    stage: axisStage[input.item.axisId] ?? "start_first_three_review",
    state: "assigned",
    priorityScore: Math.min(99, priorityBase[input.item.status] + deltaBoost),
    ownerRole: axisOwner[input.item.axisId] ?? "作者",
    title: `${input.projectTitle} · ${label}${input.item.axisLabel}`,
    detail: `${input.item.sourceLabel}复检沉淀：${input.item.lesson} 本次动作：${input.item.action}`,
    dueLabel: input.item.status === "usable" ? "下次写作前" : "下次改稿前",
    actionLabel: label,
    href: input.item.href,
    acceptanceCriteria: [
      `把「${input.item.axisLabel}」经验写进当前章节返工说明。`,
      "完成后重新保存或复检章节，形成新的大树结构复检证据。",
      input.item.status === "avoid" ? "明确删掉或替换曾经拉低分数的处理方式。" : "说明这次复用动作服务哪条主线、哪次人物选择或哪个章末追读。",
    ],
    evidence: [
      input.item.evidence,
      input.item.lesson,
      `经验动作：${input.item.action}`,
    ],
    reviewLatestAt: now,
  };
}

export function buildStoryTreeExperienceSecondPassAdvice(
  tasks: Pick<PersistedGatePlatformDispatchTask, "databaseId" | "dispatchKey" | "state" | "title" | "detail" | "href" | "evidence" | "completionEvidence" | "completedAt" | "updatedAt">[],
  chapterId: string,
  limit = 4,
): StoryTreeExperienceSecondPassAdvice[] {
  return tasks
    .filter((task) => task.state === "completed")
    .filter((task) => task.dispatchKey.startsWith("story-tree-experience:"))
    .filter((task) => task.href.includes(`/chapters/${chapterId}`))
    .map((task): StoryTreeExperienceSecondPassAdvice | null => {
      const { axisId } = taskAxisFromApplyDispatchKey(task.dispatchKey);
      const axisLabel = axisLabels[axisId] ?? "大树结构";
      const status = taskStatusFromEvidence(task.evidence);
      const effect = taskEffectFromEvidence(task.evidence);
      const action = taskActionFromEvidence(task.evidence);
      const sourceScore = taskSourceScoreFromEvidence(task.evidence);
      const completion = task.completionEvidence.trim();
      const instruction = completion
        ? `沿用已完成派单结论二改「${axisLabel}」：${sentenceWithPeriod(completion)}${action ? `结构动作继续保持：${action}` : "继续保持完成依据中已经验证的处理。"}`
        : action ? `按已验证经验处理「${axisLabel}」：${action}` : `按已验证经验处理「${axisLabel}」。`;

      if (!instruction) return null;
      return {
        id: task.dispatchKey,
        databaseId: task.databaseId,
        title: task.title,
        status,
        effectStatus: effect.effectStatus,
        effectLine: effect.effectLine,
        axisId,
        axisLabel,
        sourceScore,
        action,
        completionEvidence: completion,
        instruction,
        detail: task.evidence.find((item) => item.includes("复检")) ?? task.evidence[0] ?? task.detail ?? "",
        href: task.href,
        completedAt: task.completedAt ?? task.updatedAt ?? null,
      };
    })
    .filter((item): item is StoryTreeExperienceSecondPassAdvice => Boolean(item))
    .sort((left, right) => dateValue(right.completedAt) - dateValue(left.completedAt))
    .slice(0, limit);
}

export function matchStoryTreeExperienceAdviceForInstruction(
  advice: StoryTreeExperienceSecondPassAdvice[],
  instruction: string,
) {
  const normalized = instruction.trim();
  return advice.filter((item) => {
    const partialInstruction = item.instruction.slice(0, 24);
    return normalized.includes(item.instruction) || (normalized.includes(item.axisLabel) && normalized.includes(partialInstruction));
  });
}

export function buildStoryTreeExperienceEffectFeedback(input: {
  advice: StoryTreeExperienceSecondPassAdvice;
  audit: StoryTreeQualityAudit;
}): StoryTreeExperienceEffectFeedback {
  const axis = input.audit.axes.find((item) => item.id === input.advice.axisId);
  const currentScore = axis?.score ?? null;
  const sourceScore = input.advice.sourceScore;
  let status: StoryTreeExperienceEffectStatus = "watch";

  if (currentScore !== null && sourceScore !== null) {
    if (currentScore >= Math.max(80, sourceScore)) status = "reinforced";
    else if (currentScore <= sourceScore - 6 || axis?.status === "fail") status = "weakened";
  } else if (currentScore !== null && currentScore >= 80) {
    status = "reinforced";
  } else if (axis?.status === "fail") {
    status = "weakened";
  }

  const statusText: Record<StoryTreeExperienceEffectStatus, string> = {
    reinforced: "继续有效",
    weakened: "效果变弱",
    watch: "继续观察",
  };
  const scoreText = sourceScore === null || currentScore === null
    ? `${currentScore ?? "缺"} 分`
    : `${sourceScore} -> ${currentScore} 分`;
  const suggestion = axis?.suggestion ?? "继续结合章节现场复检这条结构经验。";

  return {
    adviceId: input.advice.id,
    databaseId: input.advice.databaseId,
    axisId: input.advice.axisId,
    axisLabel: input.advice.axisLabel,
    status,
    sourceScore,
    currentScore,
    line: `经验应用效果：${input.advice.axisLabel} ${scoreText}，${statusText[status]}：${suggestion}`,
  };
}
