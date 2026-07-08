import { buildTaskRetryPlan } from "../ai/taskRetry.ts";
import { getChapterRevisionSourceLabel, isChapterRevisionCandidate, previewRevisionContent } from "../chapters/revisions.ts";
import { platformDeliveryScope } from "../platforms/platformProfiles.ts";
import { buildProjectContextPack, type ProjectContextPack, type ProjectContextPlotThread, type ProjectContextForeshadow, type ProjectContextStatus } from "./projectContextPack.ts";

export type WorkbenchStatus = "pass" | "warn" | "fail";

export interface WritingWorkbenchProject {
  id: string;
  title: string;
  genre: string;
  sellingPoint: string;
  targetPlatformName: string;
  targetWordCount: number;
  currentWordCount: number;
}

export interface WritingWorkbenchChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  content?: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
}

export interface WritingWorkbenchOutlineNode {
  id: string;
  type: string;
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  status: string;
}

export interface WritingWorkbenchCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  relationshipNotes: string;
}

export interface WritingWorkbenchWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface WritingWorkbenchAiTask {
  id: string;
  chapterId?: string | null;
  taskType: string;
  status: string;
  model: string;
  inputSnapshot?: string | null;
  createdAt: Date | string;
  outputText?: string | null;
  costUsd?: number | null;
  errorMessage?: string | null;
}

export interface WritingWorkbenchChapterRevision {
  id: string;
  chapterId: string;
  source: string;
  sourceTaskId?: string | null;
  title: string;
  content: string;
  wordCount: number;
  notes: string;
  createdAt: Date | string;
}

export interface WritingWorkbenchDispatchTask {
  dispatchKey: string;
  stage: string;
  state: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  evidence: string[];
  acceptanceCriteria: string[];
  completionEvidence: string;
  reviewLatestAt: Date | string;
}

export interface WritingWorkbenchInput {
  project: WritingWorkbenchProject;
  chapters: WritingWorkbenchChapter[];
  outlineNodes: WritingWorkbenchOutlineNode[];
  characters: WritingWorkbenchCharacter[];
  worldEntries: WritingWorkbenchWorldEntry[];
  foreshadows?: ProjectContextForeshadow[];
  plotThreads?: ProjectContextPlotThread[];
  aiTasks: WritingWorkbenchAiTask[];
  chapterRevisions?: WritingWorkbenchChapterRevision[];
  gateDispatchTasks?: WritingWorkbenchDispatchTask[];
}

export interface WritingWorkbenchTreeBlock {
  type: "opening" | "ending" | "trunk" | "branch" | "leaf" | "soil";
  label: string;
  status: WorkbenchStatus;
  count: number;
  note: string;
  focusTitle: string;
  focusDetail: string;
  nextAction: string;
  href: string;
}

export interface WritingWorkbenchPathItem {
  id: string;
  order: number;
  treeType: WritingWorkbenchTreeBlock["type"];
  label: string;
  status: WorkbenchStatus;
  title: string;
  detail: string;
  stopRule: string;
  actionLabel: string;
  href: string;
  quickFix: WritingWorkbenchQuickFix | null;
}

export interface WritingWorkbenchPmFocus {
  status: "blocked" | "needs_action" | "ready";
  headline: string;
  detail: string;
  scopeLabel: string;
  actionLabel: string;
  actionHref: string;
}

export interface WritingWorkbench {
  projectTitle: string;
  summary: {
    targetPlatformName: string;
    progressPercent: number;
    maturityScore: number;
    oneLineBrief: string;
  };
  heroAction: {
    label: string;
    href: string;
    reason: string;
  };
  pmFocus: WritingWorkbenchPmFocus;
  treeBlocks: WritingWorkbenchTreeBlock[];
  writingPath: WritingWorkbenchPathItem[];
  chapterFocus: {
    nextChapter: WritingWorkbenchChapter | null;
    hookStatus: WorkbenchStatus;
    nextAction: string;
  };
  characterFocus: {
    completeCharacters: number;
    totalCharacters: number;
    nextAction: string;
  };
  contextFocus: {
    status: ProjectContextPack["status"];
    summary: string;
    warnings: string[];
    sourceCounts: ProjectContextPack["sourceCounts"];
    recallCards: ProjectContextPack["recallCards"];
    recallPlan: ProjectContextPack["recallPlan"];
  };
  modelFocus: {
    failedTaskCount: number;
    nextRoutes: Array<{
      task: string;
      reason: string;
    }>;
  };
  modelActions: WritingWorkbenchModelAction[];
  modelTimeline: WritingWorkbenchModelTimeline;
  pendingCandidates: WritingWorkbenchPendingCandidate[];
  firstThreeAdoption: WritingWorkbenchFirstThreeAdoption;
  startSoil: {
    status: WorkbenchStatus;
    summary: string;
    assets: WritingWorkbenchStartSoilAsset[];
  };
  quickLinks: Array<{
    label: string;
    href: string;
  }>;
  quickFixes: WritingWorkbenchQuickFix[];
}

export interface WritingWorkbenchPendingCandidate {
  id: string;
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  source: string;
  sourceLabel: string;
  title: string;
  wordCount: number;
  preview: string;
  notes: string;
  createdAt: string;
  href: string;
}

export interface WritingWorkbenchStartSoilAsset {
  id: string;
  title: string;
  label: string;
  status: WorkbenchStatus;
  detail: string;
  href: string;
}

export interface WritingWorkbenchFirstThreeAdoption {
  status: "pending" | "clear" | "missing";
  label: string;
  title: string;
  detail: string;
  pendingCount: number;
  href: string;
  actionLabel: string;
  candidates: WritingWorkbenchPendingCandidate[];
  followupChain: WritingWorkbenchAdoptionFollowupStep[];
}

export interface WritingWorkbenchAdoptionFollowupStep {
  id: string;
  label: string;
  title: string;
  status: WorkbenchStatus;
  state: string;
  detail: string;
  actionLabel: string;
  href: string;
}

export interface WritingWorkbenchQuickFix {
  id: string;
  kind: "chapter_hook" | "chapter_card" | "chapter_from_outline" | "character_seed" | "story_line_seed" | "foreshadow_seed" | "world_seed";
  label: string;
  description: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string>;
}

export interface WritingWorkbenchModelAction {
  id: string;
  kind: "opening_diagnostic" | "chapter_draft" | "chapter_review" | "first_three_rewrite";
  label: string;
  description: string;
  method: "GET" | "POST";
  endpoint: string;
  payload: Record<string, string | number | number[]>;
  refreshHref: string;
  disabledReason: string | null;
  evidenceGate?: {
    status: "sample_only" | "cleared";
    missing: string[];
    detail: string;
  } | null;
}

export interface WritingWorkbenchModelTimeline {
  totalRuns: number;
  emptyState: string;
  items: WritingWorkbenchModelTimelineItem[];
}

export interface WritingWorkbenchModelTimelineItem {
  id: string;
  taskType: string;
  label: string;
  status: string;
  model: string;
  createdAt: string;
  summary: string;
  costLabel: string;
  nextAction: string;
  sourceContext: WritingWorkbenchModelSourceContext | null;
  retryAction: WritingWorkbenchModelTimelineRetryAction | null;
  recovery: WritingWorkbenchModelTimelineRecovery | null;
}

export interface WritingWorkbenchModelSourceContext {
  status: ProjectContextStatus;
  summary: string;
  warnings: string[];
  sourceCounts: ProjectContextPack["sourceCounts"];
}

export interface WritingWorkbenchModelTimelineRetryAction {
  supported: boolean;
  label: string;
  reason: string;
  endpoint: string | null;
}

export interface WritingWorkbenchModelTimelineRecovery {
  status: "recovered" | "unresolved";
  label: string;
  detail: string;
  recoveredByTaskId: string | null;
}

const treeRequirements: Array<{
  type: WritingWorkbenchTreeBlock["type"];
  label: string;
  required: number;
}> = [
  { type: "opening", label: "开头", required: 1 },
  { type: "ending", label: "结尾", required: 1 },
  { type: "trunk", label: "主干", required: 1 },
  { type: "branch", label: "分支", required: 3 },
  { type: "leaf", label: "叶片", required: 2 },
  { type: "soil", label: "土壤", required: 1 },
];

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalized(text: string | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function completeFields(node: WritingWorkbenchOutlineNode) {
  return [node.goal, node.hook, node.conflict, node.valueShift].every(hasText);
}

function treeBlockFocus(input: WritingWorkbenchInput, type: WritingWorkbenchTreeBlock["type"], status: WorkbenchStatus) {
  const projectHref = `/projects/${input.project.id}`;
  const firstNodeOfType = input.outlineNodes.find((node) => node.type === type);
  const weakNodeOfType = input.outlineNodes.find((node) => node.type === type && !completeFields(node));
  const focusNode = weakNodeOfType ?? firstNodeOfType;

  if (type === "leaf") {
    const nextChapter = pickNextChapter(input.chapters);
    if (nextChapter) {
      return {
        focusTitle: nextChapter.title,
        focusDetail: `第 ${nextChapter.order} 章 · ${nextChapter.wordCount} 字 · ${nextChapter.status}`,
        nextAction: hasText(nextChapter.hook) && hasText(nextChapter.conflict) && hasText(nextChapter.cliffhanger)
          ? "章节卡已能承接正文，继续写作、审稿或二改。"
          : "先补齐章节钩子、冲突和章末悬念，再进入模型生成。",
        href: `${projectHref}/chapters/${nextChapter.id}#chapter-editor`,
      };
    }
  }

  if (type === "soil") {
    const worldEntry = input.worldEntries[0];
    const soilNode = input.outlineNodes.find((node) => node.type === "soil");
    if (worldEntry || soilNode) {
      return {
        focusTitle: worldEntry?.title ?? soilNode?.title ?? "项目土壤",
        focusDetail: worldEntry
          ? `${worldEntry.type} · ${worldEntry.content.slice(0, 48)}`
          : soilNode?.goal || "平台规则、人物设定和读者预期需要沉淀。",
        nextAction: status === "pass"
          ? "把平台土壤写进下一章提示词，避免正文只靠临场发挥。"
          : "补平台规则、禁忌代价和读者期待，让模型有可召回依据。",
        href: `${projectHref}#world-bible`,
      };
    }
  }

  if (focusNode) {
    return {
      focusTitle: focusNode.title,
      focusDetail: focusNode.goal || focusNode.hook || focusNode.conflict || "已有节点，但关键字段还没填实。",
      nextAction: completeFields(focusNode)
        ? "把这块继续绑定到章节卡和人物选择里。"
        : "补齐目标、钩子、冲突和价值变化，别让大树只有标题。",
      href: `${projectHref}#outline-tree`,
    };
  }

  const emptyCopy: Record<WritingWorkbenchTreeBlock["type"], { focusTitle: string; focusDetail: string; nextAction: string; href: string }> = {
    opening: {
      focusTitle: "开头钩子未落地",
      focusDetail: "还没有能抓人的开篇危机或第一章承诺。",
      nextAction: "先写开头：第一屏给危机、选择和不可逆代价。",
      href: `${projectHref}#outline-tree`,
    },
    ending: {
      focusTitle: "结尾未定义",
      focusDetail: "还不知道情绪、真相或人物弧光最后要落在哪里。",
      nextAction: "先写结尾承诺，再倒推主干和分支。",
      href: `${projectHref}#outline-tree`,
    },
    trunk: {
      focusTitle: "主干未成形",
      focusDetail: "主线目标、阶段阻力和长期期待还没连起来。",
      nextAction: "补主干：主角追什么、谁阻止、每卷怎么升级。",
      href: `${projectHref}#outline-tree`,
    },
    branch: {
      focusTitle: "分支不足",
      focusDetail: "支线还不能支撑人物关系、势力、伏笔或情绪供给。",
      nextAction: "补 3 条分支：关系线、对抗线、世界/秘密线。",
      href: `${projectHref}#outline-tree`,
    },
    leaf: {
      focusTitle: "章节叶片未生成",
      focusDetail: "还没有可写的章节卡。",
      nextAction: "先创建第一章，把开头节点落成章节卡。",
      href: `${projectHref}#create-chapter`,
    },
    soil: {
      focusTitle: "项目土壤缺失",
      focusDetail: "平台规则、人物设定、世界观和读者期待还没沉淀。",
      nextAction: "先补平台土壤，避免模型生成时没有口味边界。",
      href: `${projectHref}#world-bible`,
    },
  };

  return emptyCopy[type];
}

function buildTreeBlocks(input: WritingWorkbenchInput): WritingWorkbenchTreeBlock[] {
  return treeRequirements.map((requirement) => {
    const count = requirement.type === "soil"
      ? input.outlineNodes.filter((node) => node.type === "soil").length + input.worldEntries.length
      : input.outlineNodes.filter((node) => node.type === requirement.type).length;
    const completeNode = requirement.type === "soil"
      ? count >= requirement.required
      : input.outlineNodes.some((node) => (
        node.type === requirement.type
        && completeFields(node)
      ));
    const status: WorkbenchStatus = count >= requirement.required && completeNode
      ? "pass"
      : count > 0
        ? "warn"
        : "fail";

    return {
      type: requirement.type,
      label: requirement.label,
      status,
      count,
      note: status === "pass"
        ? `${requirement.label}已具备，可以进入章节承接。`
        : status === "warn"
          ? `${requirement.label}已有素材，但数量或关键字段还不够。`
          : `缺少${requirement.label}，大树结构还断着。`,
      ...treeBlockFocus(input, requirement.type, status),
    };
  });
}

const writingPathCopy: Record<WritingWorkbenchTreeBlock["type"], {
  label: string;
  stopRule: string;
  actionLabel: string;
}> = {
  opening: {
    label: "先定开头",
    stopRule: "第一屏必须有钩子、危机、选择和不可逆代价。",
    actionLabel: "处理开头钩子",
  },
  ending: {
    label: "再定结尾",
    stopRule: "结尾承诺必须写清情绪回收、真相回收和人物弧光终点。",
    actionLabel: "处理结尾承诺",
  },
  trunk: {
    label: "搭主干",
    stopRule: "主干必须写清长期目标、阶段阻力和升级节奏。",
    actionLabel: "处理主干结构",
  },
  branch: {
    label: "长分支",
    stopRule: "分支至少覆盖关系线、对抗线和秘密/世界线。",
    actionLabel: "处理分支支线",
  },
  leaf: {
    label: "铺叶片",
    stopRule: "章节卡必须有钩子、冲突、价值变化和章末悬念。",
    actionLabel: "处理章节叶片",
  },
  soil: {
    label: "补土壤",
    stopRule: "土壤必须能被模型召回：平台规则、人物、设定或伏笔至少一类可用。",
    actionLabel: "处理项目土壤",
  },
};

function quickFixForPathBlock(
  block: WritingWorkbenchTreeBlock,
  quickFixes: WritingWorkbenchQuickFix[],
): WritingWorkbenchQuickFix | null {
  if (block.type === "opening") return quickFixes.find((fix) => fix.kind === "chapter_hook") ?? null;
  if (block.type === "trunk") return quickFixes.find((fix) => fix.kind === "story_line_seed") ?? null;
  if (block.type === "branch") return quickFixes.find((fix) => fix.kind === "foreshadow_seed") ?? null;
  if (block.type === "leaf") return quickFixes.find((fix) => fix.kind === "chapter_card" || fix.kind === "chapter_from_outline") ?? null;
  if (block.type === "soil") return quickFixes.find((fix) => fix.kind === "world_seed") ?? null;
  return null;
}

function buildWritingPath(
  treeBlocks: WritingWorkbenchTreeBlock[],
  quickFixes: WritingWorkbenchQuickFix[],
): WritingWorkbenchPathItem[] {
  return treeRequirements.flatMap((requirement, index) => {
    const block = treeBlocks.find((item) => item.type === requirement.type);
    if (!block) return [];
    const copy = writingPathCopy[block.type];
    const quickFix = quickFixForPathBlock(block, quickFixes);
    return {
      id: `writing-path-${block.type}`,
      order: index + 1,
      treeType: block.type,
      label: copy.label,
      status: block.status,
      title: block.focusTitle,
      detail: block.nextAction || block.focusDetail || block.note,
      stopRule: copy.stopRule,
      actionLabel: block.status === "pass" ? `复查${block.label}` : copy.actionLabel,
      href: block.href,
      quickFix,
    };
  });
}

function isCharacterComplete(character: WritingWorkbenchCharacter) {
  return [
    character.desire,
    character.need,
    character.flaw,
    character.arcStart,
    character.arcEnd,
    character.relationshipNotes,
  ].every(hasText);
}

function pickNextChapter(chapters: WritingWorkbenchChapter[]) {
  return chapters.find((chapter) => chapter.status !== "final")
    ?? chapters.at(-1)
    ?? null;
}

function buildHeroAction(
  input: WritingWorkbenchInput,
  nextChapter: WritingWorkbenchChapter | null,
  pendingCandidates: WritingWorkbenchPendingCandidate[],
) {
  const firstCandidate = pendingCandidates[0];
  if (firstCandidate) {
    if (firstCandidate.source === "first_three_rewrite_candidate") {
      return {
        label: "采纳前三章",
        href: firstCandidate.href,
        reason: `前三章改写候选已经生成，先处理第 ${firstCandidate.chapterOrder} 章；采纳后正文才会真正更新。`,
      };
    }

    return {
      label: "处理候选稿",
      href: firstCandidate.href,
      reason: `还有 ${pendingCandidates.length} 个 AI 候选稿没有进入正文，先由作者确认采纳、二改或保留当前稿。`,
    };
  }

  if (!nextChapter) {
    return {
      label: "创建第一章",
      href: `/projects/${input.project.id}#create-chapter`,
      reason: "还没有章节，先把大纲落成可写章节卡。",
    };
  }

  if (!hasText(nextChapter.hook)) {
    return {
      label: "修开头钩子",
      href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
      reason: "下一章缺少开头钩子，首屏留存会先掉。",
    };
  }

  if (!hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger)) {
    return {
      label: "补章节卡",
      href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
      reason: "章节冲突或章末悬念不足，生成正文前先补卡。",
    };
  }

  return {
    label: "继续写作",
    href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
    reason: "下一章章节卡具备，可以进入正文和复审。",
  };
}

function buildWritingWorkbenchPmFocus(
  heroAction: WritingWorkbench["heroAction"],
  maturityScore: number,
): WritingWorkbenchPmFocus {
  const status = maturityScore < 70
    ? "blocked"
    : maturityScore < 85
      ? "needs_action"
      : "ready";

  return {
    status,
    headline: status === "ready"
      ? `当前可推进：${heroAction.label}`
      : `当前先处理：${heroAction.label}`,
    detail: heroAction.reason,
    scopeLabel: `${platformDeliveryScope.statusLabel} · ${platformDeliveryScope.expansionLabel}`,
    actionLabel: heroAction.label,
    actionHref: heroAction.href,
  };
}

function isCandidateAlreadyCurrent(chapter: WritingWorkbenchChapter, revision: WritingWorkbenchChapterRevision) {
  return normalized(chapter.title) === normalized(revision.title)
    && normalized(chapter.content) === normalized(revision.content)
    && chapter.wordCount === revision.wordCount;
}

function buildPendingCandidates(input: WritingWorkbenchInput): WritingWorkbenchPendingCandidate[] {
  const chaptersById = new Map(input.chapters.map((chapter) => [chapter.id, chapter]));
  const latestCandidateByChapter = new Map<string, WritingWorkbenchChapterRevision>();
  for (const revision of input.chapterRevisions ?? []) {
    if (!isChapterRevisionCandidate(revision.source)) continue;
    const current = latestCandidateByChapter.get(revision.chapterId);
    if (!current || new Date(revision.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestCandidateByChapter.set(revision.chapterId, revision);
    }
  }

  return [...latestCandidateByChapter.values()]
    .flatMap((revision) => {
      const chapter = chaptersById.get(revision.chapterId);
      if (!chapter || isCandidateAlreadyCurrent(chapter, revision)) return [];
      return {
        id: revision.id,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        source: revision.source,
        sourceLabel: getChapterRevisionSourceLabel(revision.source),
        title: revision.title,
        wordCount: revision.wordCount,
        preview: previewRevisionContent(revision.content),
        notes: revision.notes,
        createdAt: new Date(revision.createdAt).toISOString(),
        href: `/projects/${input.project.id}/chapters/${chapter.id}#chapter-revisions`,
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
}

function followupStepLabel(task: WritingWorkbenchDispatchTask) {
  if (task.dispatchKey.endsWith(":review")) return "重新审稿";
  if (task.dispatchKey.endsWith(":publish-check")) return "发布质检";
  return task.actionLabel || task.title;
}

function followupStepStatus(task: WritingWorkbenchDispatchTask): WorkbenchStatus {
  if (task.state === "completed") return "pass";
  if (task.state === "assigned") return "warn";
  return "fail";
}

function buildFirstThreeAdoptionFollowupChain(input: WritingWorkbenchInput): WritingWorkbenchAdoptionFollowupStep[] {
  const order = new Map([
    [":review", 0],
    [":publish-check", 1],
  ]);
  return (input.gateDispatchTasks ?? [])
    .filter((task) => task.dispatchKey.startsWith(`first-three-adoption:${input.project.id}:`))
    .sort((left, right) => {
      const leftOrder = [...order.entries()].find(([suffix]) => left.dispatchKey.endsWith(suffix))?.[1] ?? 99;
      const rightOrder = [...order.entries()].find(([suffix]) => right.dispatchKey.endsWith(suffix))?.[1] ?? 99;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return new Date(right.reviewLatestAt).getTime() - new Date(left.reviewLatestAt).getTime();
    })
    .map((task): WritingWorkbenchAdoptionFollowupStep => ({
      id: task.dispatchKey,
      label: followupStepLabel(task),
      title: task.title,
      status: followupStepStatus(task),
      state: task.state,
      detail: task.state === "completed" && task.completionEvidence
        ? task.completionEvidence
        : task.detail,
      actionLabel: task.actionLabel,
      href: task.href,
    }))
    .slice(0, 4);
}

function buildFirstThreeAdoption(
  input: WritingWorkbenchInput,
  pendingCandidates: WritingWorkbenchPendingCandidate[],
): WritingWorkbenchFirstThreeAdoption {
  const candidates = pendingCandidates
    .filter((candidate) => candidate.source === "first_three_rewrite_candidate" && candidate.chapterOrder >= 1 && candidate.chapterOrder <= 3)
    .sort((left, right) => left.chapterOrder - right.chapterOrder);
  const href = candidates[0]?.href ?? `/projects/${input.project.id}#first-three-rewrite`;
  const followupChain = buildFirstThreeAdoptionFollowupChain(input);

  if (candidates.length > 0) {
    return {
      status: "pending",
      label: "待采纳",
      title: `前三章改写候选待处理`,
      detail: `已生成 ${candidates.length} 章前三章候选稿，还没有写入正文。先逐章采纳、二改或保留当前稿，否则发布质检仍会看旧正文。`,
      pendingCount: candidates.length,
      href,
      actionLabel: "进入采纳",
      candidates,
      followupChain,
    };
  }

  const firstThreeChapters = input.chapters.filter((chapter) => chapter.order >= 1 && chapter.order <= 3);
  if (firstThreeChapters.length >= 3 && firstThreeChapters.every((chapter) => chapter.wordCount > 0)) {
    return {
      status: "clear",
      label: "已落稿",
      title: "前三章正文已在位",
      detail: "当前没有未采纳的前三章候选稿，可以继续审稿、二改或进入发布质检。",
      pendingCount: 0,
      href: `/projects/${input.project.id}#first-three-rewrite`,
      actionLabel: "查看前三章",
      candidates: [],
      followupChain,
    };
  }

  return {
    status: "missing",
    label: "待生成",
    title: "前三章还没形成可采纳候选",
    detail: "先补齐前三章章节卡，再生成前三章改写候选；候选通过采纳后才会覆盖正文。",
    pendingCount: 0,
    href: `/projects/${input.project.id}#first-three-rewrite`,
    actionLabel: "生成前三章",
    candidates: [],
    followupChain,
  };
}

const startSoilSpecs = [
  { key: "start-tactic", prefix: "首轮平台打法：", label: "平台打法" },
  { key: "opening-hook", prefix: "开局钩子土壤：", label: "开局钩子" },
  { key: "first-three", prefix: "前三章节奏土壤：", label: "前三章节奏" },
  { key: "character-arc", prefix: "人物弧光土壤：", label: "人物弧光" },
  { key: "tree-structure", prefix: "大树结构土壤：", label: "大树结构" },
  { key: "avoid-rules", prefix: "平台避坑清单：", label: "避坑清单" },
  { key: "model-route", prefix: "模型分工土壤：", label: "模型分工" },
] as const;

function buildStartSoil(input: WritingWorkbenchInput): WritingWorkbench["startSoil"] {
  const projectHref = `/projects/${input.project.id}`;
  const assets = startSoilSpecs.map((spec): WritingWorkbenchStartSoilAsset => {
    const entry = input.worldEntries.find((item) => item.type === "platform_soil" && item.title.startsWith(spec.prefix));
    const detail = entry?.content.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("平台：")) ?? "";
    return {
      id: spec.key,
      title: entry?.title ?? `${spec.label}未生成`,
      label: spec.label,
      status: entry ? "pass" : "fail",
      detail: entry
        ? detail || entry.content.slice(0, 72)
        : `缺少${spec.label}，创建或补种开局土壤后再进入首章生产。`,
      href: entry ? `${projectHref}#world-bible` : `${projectHref}#start-decision`,
    };
  });
  const ready = assets.filter((asset) => asset.status === "pass").length;
  const status: WorkbenchStatus = ready === assets.length ? "pass" : ready > 0 ? "warn" : "fail";

  return {
    status,
    summary: ready === assets.length
      ? "开局土壤齐全，可以直接承接首章、前三章和模型分工。"
      : ready > 0
        ? `已具备 ${ready}/${assets.length} 个开局土壤，先补缺口再放大生成。`
        : "还没有开局土壤资产，先补平台打法、钩子、前三章和避坑边界。",
    assets,
  };
}

function buildModelRoutes(input: WritingWorkbenchInput, nextChapter: WritingWorkbenchChapter | null) {
  const routes = [
    {
      task: "开头钩子诊断",
      reason: nextChapter && !hasText(nextChapter.hook)
        ? "当前下一章缺少钩子，优先让强推理模型给 3 个开场压力方案。"
        : "用于检查前三段是否有危机、反差和继续阅读理由。",
    },
    {
      task: "章节正文生成",
      reason: "把章节卡扩写成平台节奏正文，保留冲突、价值变化和章末悬念。",
    },
    {
      task: "人物弧光复核",
      reason: "检查主角欲望、缺陷、关系压力是否真的进入本章选择。",
    },
    {
      task: "平台风格复审",
      reason: `按${input.project.targetPlatformName}的阅读习惯检查爽点、节奏和投稿风险。`,
    },
  ];

  return input.aiTasks.some((task) => task.status === "failed")
    ? [
      {
        task: "失败任务复盘",
        reason: "最近有模型任务失败，先确认路由、提示词和备用模型。",
      },
      ...routes,
    ]
    : routes;
}

function requiresFirstChapterSample(input: WritingWorkbenchInput) {
  const startTactic = input.worldEntries.find((item) => (
    item.type === "platform_soil" && item.title.startsWith("首轮平台打法：")
  ));
  if (!startTactic) return false;
  return /恢复放量|恢复打法|小样本|不直接批量生成前三章/u.test(startTactic.content);
}

function firstChapterSampleEvidenceGate(firstChapterSample: boolean): WritingWorkbenchModelAction["evidenceGate"] {
  if (!firstChapterSample) return null;
  const missing = ["成功率", "质量分", "失败样本", "放量结论"];
  return {
    status: "sample_only",
    missing,
    detail: `恢复打法当前只允许首章小样本；还差 ${missing.join("、")} 后，才允许恢复前三章生成。`,
  };
}

function buildQuickFixes(
  input: WritingWorkbenchInput,
  nextChapter: WritingWorkbenchChapter | null,
  projectContext: ProjectContextPack,
): WritingWorkbenchQuickFix[] {
  const fixes: WritingWorkbenchQuickFix[] = [];
  const firstOutlineNode = input.outlineNodes.find((node) => ["opening", "leaf", "trunk", "root"].includes(node.type))
    ?? input.outlineNodes[0];
  const projectHook = input.project.sellingPoint
    ? `${input.project.sellingPoint}但第一段必须先给危机、选择和不可逆代价。`
    : `${input.project.title}第一段必须先给危机、选择和不可逆代价。`;

  if (!nextChapter && firstOutlineNode) {
    fixes.push({
      id: `chapter-from-outline-${firstOutlineNode.id}`,
      kind: "chapter_from_outline",
      label: "生成第一章章节卡",
      description: `把「${firstOutlineNode.title}」直接落成第一章章节卡，下一步进入正文初稿。`,
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/chapters/from-outline`,
      payload: {
        outlineNodeId: firstOutlineNode.id,
      },
    });
  }

  if (nextChapter && !hasText(nextChapter.hook)) {
    fixes.push({
      id: `chapter-hook-${nextChapter.id}`,
      kind: "chapter_hook",
      label: "一键补开头钩子",
      description: `给「${nextChapter.title}」补一个能抓住读者的首段压力点。`,
      method: "PATCH",
      endpoint: `/api/chapters/${nextChapter.id}`,
      payload: {
        hook: projectHook.slice(0, 500),
      },
    });
  }

  if (nextChapter && (!hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger))) {
    fixes.push({
      id: `chapter-card-${nextChapter.id}`,
      kind: "chapter_card",
      label: "补章节冲突和悬念",
      description: `把「${nextChapter.title}」补成可生成正文的章节卡。`,
      method: "PATCH",
      endpoint: `/api/chapters/${nextChapter.id}`,
      payload: {
        conflict: nextChapter.conflict || "主角必须在保住当前利益和承担更大代价之间做选择。",
        cliffhanger: nextChapter.cliffhanger || "章末抛出新的证据或更高风险，让读者必须点下一章。",
      },
    });
  }

  const hasCompleteCharacter = input.characters.some(isCharacterComplete);
  if (!hasCompleteCharacter) {
    const existingLead = input.characters[0];
    fixes.push({
      id: "character-seed",
      kind: "character_seed",
      label: existingLead ? "补关系镜像角色" : "创建主角人物卡",
      description: existingLead
        ? "主角弧光未闭合，先补一个能制造关系压力的镜像角色。"
        : "还没有人物卡，先建立主角欲望、缺陷和终局变化。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/characters`,
      payload: existingLead
        ? {
          name: "关系镜像角色",
          role: "关系压力源",
          desire: `逼迫${existingLead.name || "主角"}面对真实欲望`,
          need: "在冲突中暴露主角缺口",
          flaw: "把控制误认为保护",
          arcStart: "以阻碍者身份进入主线",
          arcEnd: "成为主角变化的镜子或代价",
          voice: "直接、尖锐、带压迫感",
          relationshipNotes: "每次出现都要让主角在逃避和承担之间做选择。",
        }
        : {
          name: "主角",
          role: "主角",
          desire: `完成「${input.project.title}」的核心目标`,
          need: "学会主动选择并承担代价",
          flaw: "在压力下会用旧办法逃避真正问题",
          arcStart: "被危机推着走",
          arcEnd: "主动定义自己的规则和归宿",
          voice: "克制、敏锐，关键时刻有狠劲",
          relationshipNotes: "至少绑定一个反派、一个盟友和一个关系代价。",
        },
    });
  }

  const storyLineBlock = projectContext.blocks.find((block) => block.id === "story_lines");
  if (storyLineBlock?.missing.includes("缺少主线/支线")) {
    fixes.push({
      id: "story-line-seed",
      kind: "story_line_seed",
      label: "补故事主线卡",
      description: "上下文召回缺少主线或支线，先补一条能约束后续章节的追读链。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/story-lines`,
      payload: {
        kind: "plot_thread",
        type: "main",
        title: `${input.project.title}主线`,
        startChapterId: nextChapter?.id ?? "",
        endChapterId: "",
        status: "active",
      },
    });
  }

  if (storyLineBlock?.missing.includes("缺少伏笔卡")) {
    fixes.push({
      id: "foreshadow-seed",
      kind: "foreshadow_seed",
      label: "补开篇伏笔卡",
      description: "给开头埋一个后续必须兑现的钩子，避免正文只靠单章爽点往前推。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/story-lines`,
      payload: {
        title: `${input.project.title}开篇伏笔`,
        setupChapterId: nextChapter?.id ?? "",
        payoffChapterId: "",
        status: "planned",
        notes: `围绕「${input.project.sellingPoint || input.project.genre}」埋下一个读者会记住的问题，并在中后段用反转或代价兑现。`,
      },
    });
  } else if (storyLineBlock?.missing.includes("伏笔缺少埋设说明")) {
    const weakForeshadow = input.foreshadows?.find((item) => !item.setupChapterId && !hasText(item.notes));
    if (weakForeshadow) {
      fixes.push({
        id: `foreshadow-setup-${weakForeshadow.id}`,
        kind: "foreshadow_seed",
        label: "补伏笔埋设说明",
        description: `「${weakForeshadow.title}」缺少埋点或说明，先补成可被模型召回的线索卡。`,
        method: "PATCH",
        endpoint: `/api/foreshadows/${weakForeshadow.id}`,
        payload: {
          title: weakForeshadow.title,
          setupChapterId: nextChapter?.id ?? "",
          payoffChapterId: weakForeshadow.payoffChapterId ?? "",
          status: weakForeshadow.status || "planned",
          notes: `埋设方式：在${nextChapter ? `「${nextChapter.title}」` : "开篇"}出现一个异常细节，让读者暂时误以为是背景信息；回收时揭示它与主线选择或人物代价有关。`,
        },
      });
    }
  }

  const hasSoil = input.worldEntries.length > 0 || input.outlineNodes.some((node) => node.type === "soil");
  if (!hasSoil) {
    fixes.push({
      id: "world-platform-soil",
      kind: "world_seed",
      label: "补平台土壤",
      description: `沉淀${input.project.targetPlatformName}的节奏、钩子和风险，后续生成不再凭感觉。`,
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/world-entries`,
      payload: {
        type: "platform_soil",
        title: `${input.project.targetPlatformName}土壤`,
        content: `目标平台：${input.project.targetPlatformName}。题材：${input.project.genre}。卖点：${input.project.sellingPoint || "待补"}。每章优先检查开头危机、明确冲突、价值变化和章末悬念。`,
      },
    });
  }

  return fixes.slice(0, 5);
}

function buildModelActions(input: WritingWorkbenchInput, nextChapter: WritingWorkbenchChapter | null): WritingWorkbenchModelAction[] {
  const noChapterReason = nextChapter ? null : "先创建第一章，再执行模型任务。";
  const chapterId = nextChapter?.id ?? "";
  const chapterHref = nextChapter
    ? `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-workflow`
    : `/projects/${input.project.id}#create-chapter`;
  const chapterNeedsCard = nextChapter
    ? !hasText(nextChapter.hook) || !hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger)
    : false;
  const firstThreeChapters = input.chapters.filter((chapter) => chapter.order >= 1 && chapter.order <= 3);
  const firstThreeReady = firstThreeChapters.length >= 3;
  const firstThreeNeedsCard = firstThreeChapters.some((chapter) => (
    !hasText(chapter.hook) || !hasText(chapter.conflict) || !hasText(chapter.cliffhanger)
  ));
  const firstChapterSample = requiresFirstChapterSample(input);

  return [
    {
      id: "opening-diagnostic",
      kind: "opening_diagnostic",
      label: "诊断开头",
      description: "检查前三秒钩子、危机进入速度和平台留存风险。",
      method: "GET",
      endpoint: nextChapter ? `/api/chapters/${nextChapter.id}/opening-diagnostic` : "",
      payload: {},
      refreshHref: chapterHref,
      disabledReason: noChapterReason,
    },
    {
      id: "chapter-draft",
      kind: "chapter_draft",
      label: "生成正文",
      description: "按章节卡扩写正文，并记录草稿质量与模型任务。",
      method: "POST",
      endpoint: "/api/ai/tasks/chapter-draft",
      payload: {
        chapterId,
        targetWords: input.project.targetPlatformName.includes("起点") ? 2600 : 1800,
      },
      refreshHref: chapterHref,
      disabledReason: noChapterReason ?? (chapterNeedsCard ? "先补齐开头钩子、冲突和章末悬念。" : null),
    },
    {
      id: "chapter-review",
      kind: "chapter_review",
      label: "平台复审",
      description: `按${input.project.targetPlatformName}口味检查节奏、爽点、人物选择和投稿风险。`,
      method: "POST",
      endpoint: "/api/ai/tasks/chapter-review",
      payload: { chapterId },
      refreshHref: chapterHref,
      disabledReason: noChapterReason ?? (nextChapter && nextChapter.wordCount <= 0 ? "先生成或粘贴正文，再执行平台复审。" : null),
    },
    {
      id: "first-three-rewrite",
      kind: "first_three_rewrite",
      label: firstChapterSample ? "生成首章小样本" : "生成前三章",
      description: firstChapterSample
        ? "恢复打法只作为参考，先生成第一章小样本，验收通过后再扩大到前三章。"
        : "按开局土壤和平台经验重写前三章，产出可采纳候选稿。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/first-three-rewrite/generate`,
      payload: {
        targetWords: input.project.targetPlatformName.includes("起点") ? 2600 : 1800,
        chapterOrders: firstChapterSample ? [1] : [1, 2, 3],
      },
      refreshHref: `/projects/${input.project.id}#first-three-rewrite`,
      disabledReason: !firstThreeReady
        ? "先创建前三章章节卡，再执行前三章生成。"
        : firstThreeNeedsCard
          ? "前三章仍缺钩子、冲突或章末悬念，先补章节卡。"
          : null,
      evidenceGate: firstChapterSampleEvidenceGate(firstChapterSample),
    },
  ];
}

function taskLabel(taskType: string) {
  const labels: Record<string, string> = {
    chapter_draft: "正文生成",
    chapter_review: "平台复审",
    chapter_second_pass: "章节二改",
    chapter_adopt_candidate: "采纳候选稿",
    first_three_rewrite: "前三章改写",
    submission_package_optimize: "投稿资料优化",
    control_asset_generate: "总控资料生成",
  };

  return labels[taskType] ?? taskType;
}

function summarizeTask(task: WritingWorkbenchAiTask) {
  if (task.status === "failed") {
    return task.errorMessage?.trim() || "模型任务失败，缺少可用输出。";
  }

  return task.outputText?.trim().slice(0, 80) || "任务已记录，暂无输出摘要。";
}

function nextActionForTask(task: WritingWorkbenchAiTask) {
  if (task.status === "failed") return "先复盘模型路由、预算和提示词，再重试。";
  if (task.taskType === "chapter_draft") return "进入平台复审，检查节奏、爽点和人物选择。";
  if (task.taskType === "chapter_adopt_candidate") return "候选稿已进入正文，马上重新审稿，旧审稿不能继续当通行证。";
  if (task.taskType === "chapter_review") return "按审稿结论补强章节卡或执行二改。";
  if (task.taskType === "chapter_second_pass") return "回到发布检查，确认是否可进入投稿包。";
  return "把结果沉淀到项目土壤或下一轮动作里。";
}

function buildTimelineRetryAction(task: WritingWorkbenchAiTask): WritingWorkbenchModelTimelineRetryAction | null {
  if (task.status !== "failed") return null;

  const plan = buildTaskRetryPlan({
    chapterId: task.chapterId ?? null,
    taskType: task.taskType,
    status: task.status,
    inputSnapshot: task.inputSnapshot ?? "{}",
  });

  return {
    supported: plan.supported,
    label: plan.actionLabel,
    reason: plan.reason,
    endpoint: plan.supported ? `/api/ai/tasks/${task.id}/retry` : null,
  };
}

function buildTimelineRecovery(task: WritingWorkbenchAiTask, tasks: WritingWorkbenchAiTask[]): WritingWorkbenchModelTimelineRecovery | null {
  if (task.status !== "failed") return null;

  const taskCreatedAt = new Date(task.createdAt).getTime();
  const recoveredBy = tasks
    .filter((candidate) => (
      candidate.id !== task.id
      && candidate.status === "succeeded"
      && candidate.taskType === task.taskType
      && candidate.chapterId === task.chapterId
      && new Date(candidate.createdAt).getTime() > taskCreatedAt
    ))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0];

  if (!recoveredBy) {
    return {
      status: "unresolved",
      label: "未恢复",
      detail: "还没有看到同章节同任务类型的成功记录。",
      recoveredByTaskId: null,
    };
  }

  return {
    status: "recovered",
    label: "已恢复",
    detail: `后续 ${taskLabel(recoveredBy.taskType)} 已成功，恢复任务：${recoveredBy.id}。`,
    recoveredByTaskId: recoveredBy.id,
  };
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isSourceContext(value: unknown): value is WritingWorkbenchModelSourceContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const counts = record.sourceCounts;
  return (
    (record.status === "pass" || record.status === "warn" || record.status === "fail")
    && typeof record.summary === "string"
    && Array.isArray(record.warnings)
    && Boolean(counts && typeof counts === "object" && !Array.isArray(counts))
  );
}

function findSourceContext(value: unknown, depth = 0): WritingWorkbenchModelSourceContext | null {
  if (depth > 4) return null;
  if (isSourceContext(value)) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (isSourceContext(record.sourceContext)) return record.sourceContext;
  for (const key of ["input", "prompt", "payload"]) {
    const found = findSourceContext(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function sourceContextForTask(task: WritingWorkbenchAiTask) {
  return findSourceContext(parseJsonObject(task.inputSnapshot));
}

function buildModelTimeline(tasks: WritingWorkbenchAiTask[]): WritingWorkbenchModelTimeline {
  const items = [...tasks]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      taskType: task.taskType,
      label: taskLabel(task.taskType),
      status: task.status,
      model: task.model,
      createdAt: new Date(task.createdAt).toISOString(),
      summary: summarizeTask(task),
      costLabel: typeof task.costUsd === "number" ? `$${task.costUsd.toFixed(3)}` : "未记录费用",
      nextAction: nextActionForTask(task),
      sourceContext: sourceContextForTask(task),
      retryAction: buildTimelineRetryAction(task),
      recovery: buildTimelineRecovery(task, tasks),
    }));

  return {
    totalRuns: tasks.length,
    emptyState: "还没有模型执行记录。",
    items,
  };
}

export function buildWritingWorkbench(input: WritingWorkbenchInput): WritingWorkbench {
  const treeBlocks = buildTreeBlocks(input);
  const nextChapter = pickNextChapter(input.chapters);
  const projectContext = buildProjectContextPack({
    currentChapterId: nextChapter?.id ?? null,
    chapters: input.chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content ?? "",
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
    })),
    characters: input.characters,
    worldEntries: input.worldEntries,
    foreshadows: input.foreshadows ?? [],
    plotThreads: input.plotThreads ?? [],
  });
  const hookStatus: WorkbenchStatus = nextChapter
    ? hasText(nextChapter.hook)
      ? "pass"
      : "fail"
    : "warn";
  const completeCharacters = input.characters.filter(isCharacterComplete).length;
  const treeScore = treeBlocks.reduce((sum, block) => sum + (block.status === "pass" ? 12 : block.status === "warn" ? 6 : 0), 0);
  const chapterScore = input.chapters.length > 0 ? 14 : 0;
  const hookScore = hookStatus === "pass" ? 14 : hookStatus === "warn" ? 6 : 0;
  const characterScore = completeCharacters > 0 ? 14 : input.characters.length > 0 ? 7 : 0;
  const maturityScore = clampPercent(treeScore + chapterScore + hookScore + characterScore);
  const pendingCandidates = buildPendingCandidates(input);
  const firstThreeAdoption = buildFirstThreeAdoption(input, pendingCandidates);
  const startSoil = buildStartSoil(input);
  const nextChapterCandidate = nextChapter
    ? pendingCandidates.find((candidate) => candidate.chapterId === nextChapter.id)
    : null;
  const heroAction = buildHeroAction(input, nextChapter, pendingCandidates);
  const quickFixes = buildQuickFixes(input, nextChapter, projectContext);

  return {
    projectTitle: input.project.title,
    summary: {
      targetPlatformName: input.project.targetPlatformName,
      progressPercent: input.project.targetWordCount > 0
        ? clampPercent((input.project.currentWordCount / input.project.targetWordCount) * 100)
        : 0,
      maturityScore,
      oneLineBrief: `${input.project.genre}｜${input.project.sellingPoint}`,
    },
    heroAction,
    pmFocus: buildWritingWorkbenchPmFocus(heroAction, maturityScore),
    treeBlocks,
    writingPath: buildWritingPath(treeBlocks, quickFixes),
    chapterFocus: {
      nextChapter,
      hookStatus,
      nextAction: nextChapter
        ? nextChapterCandidate
          ? `「${nextChapter.title}」有${nextChapterCandidate.sourceLabel}待确认，先决定采纳、二改或保留当前正文。`
          : hookStatus === "pass"
          ? `继续推进「${nextChapter.title}」正文和复审。`
          : `先补「${nextChapter.title}」的开头钩子，再进入正文扩写。`
        : "先创建第一章，把开头节点落成章节卡。",
    },
    characterFocus: {
      completeCharacters,
      totalCharacters: input.characters.length,
      nextAction: completeCharacters > 0
        ? "把人物弧光绑定到下一章选择和关系压力里。"
        : input.characters.length > 0
          ? "补齐人物弧光：真正需求、终局变化和关系压力。"
          : "先创建主角人物卡，写清欲望、缺陷和终局变化。",
    },
    contextFocus: {
      status: projectContext.status,
      summary: projectContext.summary,
      warnings: projectContext.warnings,
      sourceCounts: projectContext.sourceCounts,
      recallCards: projectContext.recallCards,
      recallPlan: projectContext.recallPlan,
    },
    modelFocus: {
      failedTaskCount: input.aiTasks.filter((task) => task.status === "failed").length,
      nextRoutes: buildModelRoutes(input, nextChapter),
    },
    modelActions: buildModelActions(input, nextChapter),
    modelTimeline: buildModelTimeline(input.aiTasks),
    pendingCandidates,
    firstThreeAdoption,
    startSoil,
    quickLinks: [
      ...(pendingCandidates[0] ? [{ label: "待采纳", href: pendingCandidates[0].href }] : []),
      { label: "开局土壤", href: `/projects/${input.project.id}#start-soil` },
      { label: "前三章", href: `/projects/${input.project.id}#first-three-rewrite` },
      { label: "大树结构", href: `/projects/${input.project.id}#outline-tree` },
      { label: "人物弧光", href: `/projects/${input.project.id}#character-arc` },
      { label: "项目土壤", href: `/projects/${input.project.id}#context-recall` },
      { label: "模型任务", href: `/projects/${input.project.id}#ai-pipeline` },
      { label: "发布包", href: `/projects/${input.project.id}#platform-export` },
    ],
    quickFixes,
  };
}
