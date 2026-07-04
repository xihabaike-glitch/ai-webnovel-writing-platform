import type { PersistedGatePlatformDispatchTask } from "../projects/gateActionReceipts.ts";

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
