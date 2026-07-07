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
  quickFix: ChapterProductionQuickFix | null;
}

export interface ChapterProductionQuickFix {
  id: string;
  label: string;
  description: string;
  method: "PATCH";
  endpoint: string;
  payload: Record<string, string>;
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
  lengthPlan: ChapterProductionLengthPlan;
  platformName: string;
  warnings: string[];
  nextActions: string[];
}

export interface ChapterProductionLengthPlan {
  label: string;
  targetWordCount: number;
  minimumProductionCards: number;
  structureFocus: string;
  acceptanceRule: string;
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

function repairPayloadForNode(
  node: ProductionOutlineNode,
  missingFields: string[],
  platform: PlatformProfile,
): Record<string, string> {
  const payload: Record<string, string> = {};
  const title = compact(node.title) || "当前排期卡";
  const hasMissing = (field: string) => missingFields.includes(field);

  if (!compact(node.summary)) {
    payload.summary = `围绕「${title}」推进本阶段承诺：先给压力，再让主角做选择，最后抬高下一章问题。`;
  }
  if (hasMissing("目标")) {
    payload.goal = `让「${title}」完成一次明确推进：主角获得新信息、新代价或新敌人，故事不能原地解释。`;
  }
  if (hasMissing("钩子")) {
    payload.hook = platform.openingRules[0] || `开场先给「${title}」相关的异常、危机或不可逆选择。`;
  }
  if (hasMissing("冲突")) {
    payload.conflict = "主角必须在保住当前利益和承担更高代价之间做选择，且不能靠解释绕开。";
  }
  if (hasMissing("转变")) {
    payload.valueShift = "从被动承压转为主动选择，或从表面胜利转向更大的主线风险。";
  }
  if (!compact(node.platformNote)) {
    payload.platformNote = platform.reviewFocus[0] || "章末必须抛出和主线相关的新问题，形成追读理由。";
  }

  return payload;
}

function quickFixForItem(
  node: ProductionOutlineNode,
  status: ChapterProductionItem["status"],
  missingFields: string[],
  platform: PlatformProfile,
): ChapterProductionQuickFix | null {
  if (status !== "blocked") return null;
  const payload = repairPayloadForNode(node, missingFields, platform);
  if (Object.keys(payload).length === 0) return null;

  return {
    id: `outline-repair-${node.id}`,
    label: "补排期卡",
    description: "先补成可生成章节卡的最小结构，避免正文生产空转。",
    method: "PATCH",
    endpoint: `/api/outline-nodes/${node.id}`,
    payload,
  };
}

function suggestedDailyWords(project: ProductionProject, platform: PlatformProfile) {
  if (project.updateCadence.includes("6k") || project.updateCadence.includes("6000")) return 6000;
  if (project.updateCadence.includes("4k") || project.updateCadence.includes("4000")) return 4000;
  if (platform.category === "free") return 4000;
  if (platform.category === "paid") return 3000;
  if (platform.category === "short") return 2000;
  return 2500;
}

function buildLengthPlan(project: ProductionProject): ChapterProductionLengthPlan {
  if (project.targetLengthType === "short_10k" || project.targetWordCount <= 20_000) {
    return {
      label: "1 万字短篇",
      targetWordCount: project.targetWordCount,
      minimumProductionCards: 4,
      structureFocus: "一个首章强钩子、一个主干反转、一个情绪峰值和一个闭环结尾。",
      acceptanceRule: "每张排期卡都必须服务同一个核心反转，不能开新大支线。",
    };
  }
  if (project.targetLengthType === "mid_50k" || project.targetWordCount <= 80_000) {
    return {
      label: "5-6 万字中篇",
      targetWordCount: project.targetWordCount,
      minimumProductionCards: 12,
      structureFocus: "开头、三段主干、两条可控支线和明确人物弧光收束。",
      acceptanceRule: "支线只能强化主角变化，不能挤掉主线兑现。",
    };
  }
  if (project.targetLengthType === "mega_1m_plus" || project.targetWordCount >= 800_000) {
    return {
      label: "100 万字以上超长篇",
      targetWordCount: project.targetWordCount,
      minimumProductionCards: 80,
      structureFocus: "大树结构要覆盖长期主线、阶段地图、势力分支、伏笔回收和世界规则升级。",
      acceptanceRule: "每个阶段都要有独立目标、阶段反派和下一阶段引线。",
    };
  }
  return {
    label: "30 万字以上长篇",
    targetWordCount: project.targetWordCount,
    minimumProductionCards: 30,
    structureFocus: "先定开头和结尾，再铺主干、分支、叶片与土壤，保证长期追读。",
    acceptanceRule: "主干必须承接人物弧光，分支必须回到主线压力。",
  };
}

function buildWarnings(input: ChapterProductionInput, items: ChapterProductionItem[], lengthPlan: ChapterProductionLengthPlan) {
  const warnings: string[] = [];
  if (items.length === 0) warnings.push("还没有可排期的大纲节点，先补开头、主干、分支、叶片和结尾。");
  if (items.length < lengthPlan.minimumProductionCards) warnings.push(`${lengthPlan.label} 当前只有 ${items.length} 张排期卡，至少先补到 ${lengthPlan.minimumProductionCards} 张，才能支撑目标 ${lengthPlan.targetWordCount} 字。`);
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
      quickFix: quickFixForItem(node, status, missingFields, input.platform),
    };
  });

  const estimatedRemainingWords = Math.max(input.project.targetWordCount - input.project.currentWordCount, 0);
  const dailyWords = suggestedDailyWords(input.project, input.platform);
  const lengthPlan = buildLengthPlan(input.project);
  const warnings = buildWarnings(input, items, lengthPlan);
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
      lengthPlan,
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
        `篇幅打法：${lengthPlan.structureFocus}`,
        "每张排期卡都要同时检查人物推动、设定限制、伏笔/支线承接和章末追读问题。",
      ],
    },
    items,
  };
}
