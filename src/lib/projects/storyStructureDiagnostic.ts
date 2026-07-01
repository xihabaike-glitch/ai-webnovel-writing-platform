import type { PlatformProfile } from "../platforms/platformProfiles.ts";

export interface StructureProject {
  title: string;
  genre: string;
  sellingPoint: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
}

export interface StructureChapter {
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

export interface StructureOutlineNode {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  summary: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  platformNote: string;
  status: string;
}

export interface StructureCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
}

export interface StructureForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  status: string;
  notes: string;
}

export interface StructurePlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface StoryStructureDiagnosticInput {
  project: StructureProject;
  platform: PlatformProfile;
  chapters: StructureChapter[];
  outlineNodes: StructureOutlineNode[];
  characters: StructureCharacter[];
  foreshadows: StructureForeshadow[];
  plotThreads: StructurePlotThread[];
}

export interface StructureDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

export interface StructureTreeSignal {
  type: string;
  label: string;
  count: number;
  status: "pass" | "warn" | "fail";
  note: string;
}

export interface StoryStructureDiagnostic {
  score: number;
  verdict: string;
  platformName: string;
  treeSignals: StructureTreeSignal[];
  items: StructureDiagnosticItem[];
  actionPlan: string[];
  markdown: string;
}

const typeLabels: Record<string, string> = {
  root: "树根",
  opening: "开头",
  ending: "结尾",
  trunk: "主干",
  branch: "分支",
  leaf: "叶片",
  soil: "土壤",
};

function notBlank(text: string | null | undefined) {
  return Boolean(text?.trim());
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return part / total;
}

function statusItem(
  id: string,
  label: string,
  passed: boolean,
  partial: boolean,
  score: number,
  evidence: string,
  suggestion: string,
): StructureDiagnosticItem {
  return {
    id,
    label,
    status: passed ? "pass" : partial ? "warn" : "fail",
    score: passed ? score : partial ? Math.round(score * 0.55) : 0,
    evidence,
    suggestion,
  };
}

function countByType(nodes: StructureOutlineNode[], type: string) {
  return nodes.filter((node) => node.type === type).length;
}

function hasCompleteNode(nodes: StructureOutlineNode[], type: string) {
  return nodes.some((node) => (
    node.type === type
    && notBlank(node.goal)
    && notBlank(node.hook)
    && notBlank(node.conflict)
    && notBlank(node.valueShift)
  ));
}

function buildTreeSignals(nodes: StructureOutlineNode[]): StructureTreeSignal[] {
  const requirements = [
    ["root", 1],
    ["opening", 1],
    ["ending", 1],
    ["trunk", 1],
    ["branch", 3],
    ["leaf", 2],
    ["soil", 1],
  ] as const;

  return requirements.map(([type, required]) => {
    const count = countByType(nodes, type);
    const complete = hasCompleteNode(nodes, type);
    const passed = count >= required && (type === "branch" || type === "leaf" || complete);
    const partial = count > 0;
    return {
      type,
      label: typeLabels[type],
      count,
      status: passed ? "pass" : partial ? "warn" : "fail",
      note: passed
        ? `${typeLabels[type]}已具备。`
        : partial
          ? `${typeLabels[type]}已有节点，但关键字段不完整或数量不足。`
          : `缺少${typeLabels[type]}节点。`,
    };
  });
}

function buildItems(input: StoryStructureDiagnosticInput, treeSignals: StructureTreeSignal[]): StructureDiagnosticItem[] {
  const chaptersWithHooks = input.chapters.filter((chapter) => notBlank(chapter.hook)).length;
  const chaptersWithConflict = input.chapters.filter((chapter) => notBlank(chapter.conflict)).length;
  const chaptersWithCliffhanger = input.chapters.filter((chapter) => notBlank(chapter.cliffhanger)).length;
  const chapterCardRatio = Math.min(
    ratio(chaptersWithHooks, input.chapters.length),
    ratio(chaptersWithConflict, input.chapters.length),
    ratio(chaptersWithCliffhanger, input.chapters.length),
  );
  const completeCharacters = input.characters.filter((character) => (
    notBlank(character.desire)
    && notBlank(character.need)
    && notBlank(character.flaw)
    && notBlank(character.arcStart)
    && notBlank(character.arcEnd)
  )).length;
  const setupForeshadows = input.foreshadows.filter((foreshadow) => foreshadow.setupChapterId || notBlank(foreshadow.notes)).length;
  const payoffForeshadows = input.foreshadows.filter((foreshadow) => foreshadow.payoffChapterId || foreshadow.status === "paid_off").length;
  const closedThreads = input.plotThreads.filter((thread) => thread.startChapterId && (thread.endChapterId || thread.status === "resolved")).length;
  const branchCount = countByType(input.outlineNodes, "branch");
  const leafCount = countByType(input.outlineNodes, "leaf");
  const platformKeywords = [...input.platform.reviewFocus, ...input.platform.openingRules].join(" ");
  const platformText = input.outlineNodes.map((node) => `${node.platformNote} ${node.goal} ${node.hook}`).join(" ");
  const platformHit = input.platform.reviewFocus.some((focus) => platformText.includes(focus.slice(0, 2)))
    || input.platform.openingRules.some((rule) => platformText.includes(rule.slice(0, 2)));
  const longForm = input.project.targetLengthType.includes("long") || input.project.targetLengthType.includes("mega");
  const lengthReady = longForm
    ? input.project.targetWordCount >= 300000 && branchCount >= 3
    : input.project.targetWordCount <= 80000 || leafCount >= 2;

  return [
    statusItem(
      "tree-skeleton",
      "大树骨架",
      treeSignals.every((signal) => signal.status === "pass"),
      treeSignals.filter((signal) => signal.status !== "fail").length >= 5,
      16,
      `已建：${treeSignals.map((signal) => `${signal.label}${signal.count}`).join("、")}。`,
      "先补齐开头、结尾、主干、至少三条分支、叶片和平台土壤。",
    ),
    statusItem(
      "opening-ending",
      "开头结尾端点",
      hasCompleteNode(input.outlineNodes, "opening") && hasCompleteNode(input.outlineNodes, "ending"),
      countByType(input.outlineNodes, "opening") > 0 && countByType(input.outlineNodes, "ending") > 0,
      14,
      `开头节点 ${countByType(input.outlineNodes, "opening")} 个，结尾节点 ${countByType(input.outlineNodes, "ending")} 个。`,
      "先写开头钩子和终局回响，再回头压主干，不要先堆支线。",
    ),
    statusItem(
      "trunk-pressure",
      "主干压力",
      hasCompleteNode(input.outlineNodes, "trunk") && input.plotThreads.length >= 1,
      hasCompleteNode(input.outlineNodes, "trunk") || input.plotThreads.length >= 1,
      14,
      `主干节点 ${countByType(input.outlineNodes, "trunk")} 个，剧情线 ${input.plotThreads.length} 条。`,
      "主干必须有持续升级的目标、阻碍、反转和阶段结果。",
    ),
    statusItem(
      "branch-coverage",
      "支线覆盖",
      branchCount >= 3 && input.plotThreads.length >= 2,
      branchCount >= 2 || input.plotThreads.length >= 1,
      12,
      `分支节点 ${branchCount} 个，剧情线 ${input.plotThreads.length} 条。`,
      "至少拆出人物弧光线、反派压力线、关系情绪线，不要让所有内容挤在主线里。",
    ),
    statusItem(
      "character-arc",
      "人物弧光",
      completeCharacters >= 1,
      input.characters.length > 0 || input.outlineNodes.some((node) => node.title.includes("人物弧光")),
      12,
      `人物 ${input.characters.length} 个，完整弧光 ${completeCharacters} 个。`,
      "补主角的欲望、需求、缺陷、起点和终点，否则人物只是剧情工具。",
    ),
    statusItem(
      "foreshadow-payoff",
      "伏笔回收",
      setupForeshadows >= 2 && payoffForeshadows >= 1,
      setupForeshadows >= 1 || input.foreshadows.length > 0,
      10,
      `伏笔 ${input.foreshadows.length} 个，已埋 ${setupForeshadows} 个，回收 ${payoffForeshadows} 个。`,
      "每个关键反转都要有埋点和回收章，不要靠临时解释救场。",
    ),
    statusItem(
      "chapter-cadence",
      "章节节奏卡",
      input.chapters.length >= 3 && chapterCardRatio >= 0.8,
      input.chapters.length > 0 && chapterCardRatio >= 0.4,
      12,
      `章节 ${input.chapters.length} 章，钩子 ${chaptersWithHooks}，冲突 ${chaptersWithConflict}，悬念 ${chaptersWithCliffhanger}。`,
      "每章都要填钩子、冲突、价值变化和章末悬念，否则中段必散。",
    ),
    statusItem(
      "platform-fit",
      "平台土壤",
      platformHit && lengthReady,
      platformHit || lengthReady,
      10,
      `${input.platform.name}重点：${platformKeywords}。目标 ${input.project.targetWordCount} 字。`,
      `按${input.platform.name}复查题材标签、篇幅、更新节奏和风险：${input.platform.risks.join("、")}。`,
    ),
  ];
}

function verdict(score: number) {
  if (score >= 86) return "整书结构具备长线开发条件，可以开始按章节批量生产。";
  if (score >= 72) return "结构主干成立，但人物弧光、伏笔或平台土壤还要补强。";
  if (score >= 55) return "结构有骨架，但支线和回收不稳，贸然扩写会散。";
  return "整书结构风险高，先别继续堆正文，必须补开头、结尾、主干和支线。";
}

function buildActionPlan(items: StructureDiagnosticItem[], platform: PlatformProfile) {
  const weakItems = items.filter((item) => item.status !== "pass");
  return [
    weakItems[0]?.suggestion ?? "保留现有大树结构，开始把每条分支绑定到具体章节。",
    weakItems[1]?.suggestion ?? "补人物欲望、缺陷和终局变化，让事件推动人物弧光。",
    weakItems[2]?.suggestion ?? "把伏笔写成埋点章和回收章，避免后期临时圆。",
    `最后按${platform.name}复核：${platform.reviewFocus.join("、")}。`,
  ];
}

function buildMarkdown(input: StoryStructureDiagnosticInput, diagnostic: Omit<StoryStructureDiagnostic, "markdown">) {
  return [
    `# ${input.project.title} 整书结构健康度诊断`,
    "",
    `平台：${diagnostic.platformName}`,
    `评分：${diagnostic.score}`,
    `结论：${diagnostic.verdict}`,
    "",
    "## 大树信号",
    ...diagnostic.treeSignals.map((signal) => `- ${signal.label}｜${signal.status}｜${signal.count}：${signal.note}`),
    "",
    "## 诊断指标",
    ...diagnostic.items.map((item) => `- ${item.label}｜${item.status}｜${item.score}：${item.evidence}；建议：${item.suggestion}`),
    "",
    "## 下一步动作",
    ...diagnostic.actionPlan.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

export function buildStoryStructureDiagnostic(input: StoryStructureDiagnosticInput): StoryStructureDiagnostic {
  const treeSignals = buildTreeSignals(input.outlineNodes);
  const items = buildItems(input, treeSignals);
  const score = Math.max(0, Math.min(100, items.reduce((sum, item) => sum + item.score, 0)));
  const diagnosticWithoutMarkdown = {
    score,
    verdict: verdict(score),
    platformName: input.platform.name,
    treeSignals,
    items,
    actionPlan: buildActionPlan(items, input.platform),
  };

  return {
    ...diagnosticWithoutMarkdown,
    markdown: buildMarkdown(input, diagnosticWithoutMarkdown),
  };
}
