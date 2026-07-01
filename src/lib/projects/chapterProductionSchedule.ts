import type { PlatformProfile } from "../platforms/platformProfiles.ts";

export interface ProductionProject {
  title: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  updateCadence: string;
}

export interface ProductionChapter {
  id: string;
  order: number;
  title: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: string;
}

export interface ProductionOutlineNode {
  id: string;
  chapterId: string | null;
  type: string;
  title: string;
  summary: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  platformNote: string;
  order: number;
  depth: number;
  status: string;
}

export interface ProductionCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  arcStart: string;
  arcEnd: string;
}

export interface ProductionWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface ProductionForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  status: string;
  notes: string;
}

export interface ProductionPlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface ChapterProductionInput {
  project: ProductionProject;
  platform: PlatformProfile;
  chapters: ProductionChapter[];
  outlineNodes: ProductionOutlineNode[];
  characters: ProductionCharacter[];
  worldEntries: ProductionWorldEntry[];
  foreshadows: ProductionForeshadow[];
  plotThreads: ProductionPlotThread[];
}

export interface ChapterProductionItem {
  id: string;
  outlineNodeId: string | null;
  chapterId: string | null;
  order: number;
  stage: string;
  title: string;
  status: "blocked" | "outline_ready" | "card_ready" | "drafting" | "done";
  goal: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  primaryCharacter: string;
  worldAnchors: string[];
  lineBeats: string[];
  missingFields: string[];
  action: string;
}

export interface ChapterProductionDashboard {
  totalItems: number;
  blockedItems: number;
  outlineReadyItems: number;
  chapterCardItems: number;
  draftingItems: number;
  doneItems: number;
  estimatedRemainingWords: number;
  suggestedDailyWords: number;
  platformName: string;
  warnings: string[];
  nextActions: string[];
}

export interface ChapterProductionSchedule {
  dashboard: ChapterProductionDashboard;
  items: ChapterProductionItem[];
}

const productionTypes = new Set(["opening", "trunk", "branch", "leaf", "ending"]);
const typeLabels: Record<string, string> = {
  opening: "开头",
  trunk: "主干",
  branch: "分支",
  leaf: "叶片",
  ending: "结尾",
};
const typeWeights: Record<string, number> = {
  opening: 10,
  trunk: 20,
  branch: 30,
  leaf: 40,
  ending: 90,
};

function compact(text: string | null | undefined) {
  return text?.trim() ?? "";
}

function firstFilled(...values: Array<string | null | undefined>) {
  return values.map(compact).find(Boolean) ?? "";
}

function missingCoreFields(node: ProductionOutlineNode, chapter?: ProductionChapter) {
  const fields = [
    ["目标", firstFilled(chapter?.goal, node.goal)],
    ["钩子", firstFilled(chapter?.hook, node.hook)],
    ["冲突", firstFilled(chapter?.conflict, node.conflict)],
    ["转变", firstFilled(chapter?.valueShift, node.valueShift)],
  ] as const;

  return fields.filter(([, value]) => !value).map(([label]) => label);
}

function itemStatus(
  node: ProductionOutlineNode,
  missingFields: string[],
  chapter?: ProductionChapter,
): ChapterProductionItem["status"] {
  if (chapter?.status === "final") return "done";
  if (chapter && chapter.wordCount > 0) return "drafting";
  if (chapter) return "card_ready";
  if (missingFields.length === 0 && compact(node.summary)) return "outline_ready";
  return "blocked";
}

function pickPrimaryCharacter(characters: ProductionCharacter[]) {
  const protagonist = characters.find((character) => /主角|男主|女主|protagonist/i.test(character.role));
  const complete = characters.find((character) => (
    compact(character.desire)
    && compact(character.need)
    && compact(character.arcStart)
    && compact(character.arcEnd)
  ));
  const selected = protagonist ?? complete ?? characters[0];
  if (!selected) return "未绑定人物";
  return `${selected.name}：${firstFilled(selected.desire, selected.arcStart, selected.role)}`;
}

function pickWorldAnchors(worldEntries: ProductionWorldEntry[]) {
  const preferred = ["system_rule", "taboo", "platform_soil", "location", "organization", "item"];
  return [...worldEntries]
    .sort((left, right) => preferred.indexOf(left.type) - preferred.indexOf(right.type))
    .filter((entry) => compact(entry.title))
    .slice(0, 3)
    .map((entry) => entry.title);
}

function lineBeatsForChapter(
  chapterId: string | null,
  foreshadows: ProductionForeshadow[],
  plotThreads: ProductionPlotThread[],
) {
  if (!chapterId) {
    return [
      ...foreshadows.filter((item) => !item.setupChapterId).slice(0, 1).map((item) => `预埋伏笔：${item.title}`),
      ...plotThreads.filter((item) => !item.startChapterId).slice(0, 1).map((item) => `启动剧情线：${item.title}`),
    ];
  }

  return [
    ...foreshadows
      .filter((item) => item.setupChapterId === chapterId)
      .map((item) => `埋伏笔：${item.title}`),
    ...foreshadows
      .filter((item) => item.payoffChapterId === chapterId || item.status === "paid_off")
      .map((item) => `回收伏笔：${item.title}`),
    ...plotThreads
      .filter((item) => item.startChapterId === chapterId)
      .map((item) => `开启${item.type}线：${item.title}`),
    ...plotThreads
      .filter((item) => item.endChapterId === chapterId || item.status === "resolved")
      .map((item) => `阶段收束：${item.title}`),
  ].slice(0, 4);
}

function actionForItem(status: ChapterProductionItem["status"], missingFields: string[], hasChapter: boolean) {
  if (status === "done") return "进入复盘和投稿材料沉淀。";
  if (status === "drafting") return "补审稿、二改和章末追读钩子。";
  if (status === "card_ready") return "进入正文初稿生成或手写正文。";
  if (status === "outline_ready" && !hasChapter) return "一键生成章节卡，再进入初稿。";
  return `先补${missingFields.join("、") || "摘要"}，否则生成章节会空转。`;
}

function suggestedDailyWords(project: ProductionProject, platform: PlatformProfile) {
  if (project.updateCadence.includes("6k") || project.updateCadence.includes("6000")) return 6000;
  if (project.updateCadence.includes("4k") || project.updateCadence.includes("4000")) return 4000;
  if (platform.category === "free") return 4000;
  if (platform.category === "paid") return 3000;
  if (platform.category === "short") return 2000;
  return 2500;
}

function buildWarnings(input: ChapterProductionInput, items: ChapterProductionItem[]) {
  const warnings: string[] = [];
  if (items.length === 0) warnings.push("还没有可排期的大纲节点，先补开头、主干、分支、叶片和结尾。");
  if (!items.some((item) => item.stage === "开头")) warnings.push("缺少开头排期，平台首章钩子无法落地。");
  if (!items.some((item) => item.stage === "结尾")) warnings.push("缺少结尾排期，长篇会只会往前铺、不知道如何回收。");
  if (items.some((item) => item.status === "blocked")) warnings.push("存在缺目标/钩子/冲突/转变的排期卡，直接生成正文会变成流水账。");
  if (input.characters.length === 0) warnings.push("还没有人物弧光，章节排期缺少角色推动力。");
  if (input.worldEntries.length === 0) warnings.push("还没有世界观设定，章节排期缺少规则和限制。");
  if (input.foreshadows.length === 0 && input.plotThreads.length === 0) warnings.push("还没有伏笔或剧情线，章节之间缺少连续追读链。");
  return warnings;
}

export function buildChapterProductionSchedule(input: ChapterProductionInput): ChapterProductionSchedule {
  const chapterById = new Map(input.chapters.map((chapter) => [chapter.id, chapter]));
  const orderedNodes = input.outlineNodes
    .filter((node) => productionTypes.has(node.type))
    .sort((left, right) => (
      (typeWeights[left.type] ?? 50) - (typeWeights[right.type] ?? 50)
      || left.depth - right.depth
      || left.order - right.order
      || left.title.localeCompare(right.title)
    ));
  const primaryCharacter = pickPrimaryCharacter(input.characters);
  const worldAnchors = pickWorldAnchors(input.worldEntries);

  const items = orderedNodes.map((node, index): ChapterProductionItem => {
    const chapter = node.chapterId ? chapterById.get(node.chapterId) : undefined;
    const missingFields = missingCoreFields(node, chapter);
    const status = itemStatus(node, missingFields, chapter);
    const chapterId = chapter?.id ?? node.chapterId;

    return {
      id: node.id,
      outlineNodeId: node.id,
      chapterId: chapterId ?? null,
      order: chapter?.order ?? index + 1,
      stage: typeLabels[node.type] ?? node.type,
      title: firstFilled(chapter?.title, node.title, `排期 ${index + 1}`),
      status,
      goal: firstFilled(chapter?.goal, node.goal, node.summary),
      hook: firstFilled(chapter?.hook, node.hook, input.platform.openingRules[0]),
      conflict: firstFilled(chapter?.conflict, node.conflict, "给主角一个不能绕开的当场阻碍。"),
      cliffhanger: firstFilled(chapter?.cliffhanger, node.platformNote, input.platform.reviewFocus[0]),
      primaryCharacter,
      worldAnchors,
      lineBeats: lineBeatsForChapter(chapterId ?? null, input.foreshadows, input.plotThreads),
      missingFields,
      action: actionForItem(status, missingFields, Boolean(chapter)),
    };
  });

  const estimatedRemainingWords = Math.max(input.project.targetWordCount - input.project.currentWordCount, 0);
  const dailyWords = suggestedDailyWords(input.project, input.platform);
  const warnings = buildWarnings(input, items);
  const firstBlocked = items.find((item) => item.status === "blocked");
  const firstOutlineReady = items.find((item) => item.status === "outline_ready");
  const firstCardReady = items.find((item) => item.status === "card_ready");

  return {
    dashboard: {
      totalItems: items.length,
      blockedItems: items.filter((item) => item.status === "blocked").length,
      outlineReadyItems: items.filter((item) => item.status === "outline_ready").length,
      chapterCardItems: items.filter((item) => item.status === "card_ready").length,
      draftingItems: items.filter((item) => item.status === "drafting").length,
      doneItems: items.filter((item) => item.status === "done").length,
      estimatedRemainingWords,
      suggestedDailyWords: dailyWords,
      platformName: input.platform.name,
      warnings,
      nextActions: [
        firstBlocked
          ? `先补「${firstBlocked.title}」的${firstBlocked.missingFields.join("、")}。`
          : firstOutlineReady
            ? `先把「${firstOutlineReady.title}」生成章节卡。`
            : firstCardReady
              ? `先写「${firstCardReady.title}」正文初稿。`
              : "先补新的主干/分支节点，继续扩展生产队列。",
        `按 ${dailyWords} 字/日估算，剩余 ${estimatedRemainingWords} 字需要约 ${Math.ceil(estimatedRemainingWords / Math.max(dailyWords, 1))} 个写作日。`,
        "每张排期卡都要同时检查人物推动、设定限制、伏笔/支线承接和章末追读问题。",
      ],
    },
    items,
  };
}
