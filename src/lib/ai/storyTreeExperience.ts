import type { GatePlatformGrowthDispatchItem, GatePlatformGrowthReviewStage, PersistedGatePlatformDispatchTask } from "../projects/gateActionReceipts.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { StoryTreeQualityAudit } from "./storyTreeQualityAudit.ts";

export type StoryTreeExperienceStatus = "usable" | "avoid" | "watch";

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
  items: StoryTreeExperienceItem[];
  promptBlock: string;
}

export interface StoryTreeExperienceSecondPassAdvice {
  id: string;
  databaseId?: string;
  title: string;
  status: StoryTreeExperienceStatus;
  axisId: string;
  axisLabel: string;
  sourceScore: number | null;
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
  const delta = parsed.previousScore === null ? null : parsed.currentScore - parsed.previousScore;
  const action = parsed.action || `${axisLabel}：延续已复检过的返工动作。`;

  return {
    id: `${task.dispatchKey}:${parsed.currentScore}`,
    dispatchKey: task.dispatchKey,
    axisId,
    axisLabel,
    source,
    sourceLabel,
    status,
    previousScore: parsed.previousScore,
    currentScore: parsed.currentScore,
    delta,
    verdict: parsed.verdict,
    lesson: buildLesson({
      axisLabel,
      sourceLabel,
      status,
      previousScore: parsed.previousScore,
      currentScore: parsed.currentScore,
      message: parsed.message,
    }),
    action,
    evidence: recheckLine,
    title: task.title,
    href: task.href,
    completedAt: task.completedAt ?? task.updatedAt ?? null,
  };
}

function promptLine(item: StoryTreeExperienceItem) {
  const delta = item.delta === null ? `${item.currentScore} 分` : `${item.previousScore} -> ${item.currentScore} 分`;
  return `- ${statusLabel(item.status)}｜${item.axisLabel}｜${delta}：${item.action}`;
}

function applyActionLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "应用经验";
  if (status === "avoid") return "转避坑检查";
  return "小步验证";
}

function applyDispatchId(projectId: string, item: StoryTreeExperienceItem) {
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

function buildPromptBlock(items: StoryTreeExperienceItem[]) {
  if (items.length === 0) return "";
  return [
    "大树复检经验：",
    ...items.slice(0, 5).map(promptLine),
  ].join("\n");
}

export function buildStoryTreeExperienceGuide(tasks: Pick<PersistedGatePlatformDispatchTask, "dispatchKey" | "evidence" | "completedAt" | "updatedAt" | "title" | "href">[]): StoryTreeExperienceGuide {
  const items = tasks
    .map(itemFromTask)
    .filter((item): item is StoryTreeExperienceItem => Boolean(item))
    .sort((left, right) => {
      const statusWeight: Record<StoryTreeExperienceStatus, number> = { usable: 3, watch: 2, avoid: 1 };
      const scoreDelta = statusWeight[right.status] - statusWeight[left.status];
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
    items,
    promptBlock: buildPromptBlock(items),
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
    id: applyDispatchId(input.projectId, input.item),
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
      const action = taskActionFromEvidence(task.evidence);
      const sourceScore = taskSourceScoreFromEvidence(task.evidence);
      const completion = task.completionEvidence.trim();
      const instruction = [
        action ? `按已验证经验处理「${axisLabel}」：${action}` : `按已验证经验处理「${axisLabel}」。`,
        completion ? `完成依据：${completion}` : "",
      ].filter(Boolean).join(" ");

      if (!instruction) return null;
      return {
        id: task.dispatchKey,
        databaseId: task.databaseId,
        title: task.title,
        status,
        axisId,
        axisLabel,
        sourceScore,
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
