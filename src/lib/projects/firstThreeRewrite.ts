import { buildPlatformStyleScore, type PlatformStyleScoreItem } from "../chapters/platformStyleScore.ts";
import { previewRevisionContent } from "../chapters/revisions.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import {
  buildRetentionDiagnostic,
  type RetentionChapter,
  type RetentionChapterSignal,
  type RetentionDiagnostic,
  type RetentionDiagnosticItem,
} from "./retentionDiagnostic.ts";

export interface FirstThreeRewriteInput {
  projectTitle: string;
  platform: PlatformProfile;
  chapters: RetentionChapter[];
}

export interface ChapterRewritePlan {
  chapterId: string;
  order: number;
  title: string;
  role: string;
  priority: "high" | "medium" | "low";
  currentProblem: string;
  rewriteTarget: string;
  coldOpen: string;
  keep: string[];
  cut: string[];
  add: string[];
  ending: string;
  expectedEffect: string;
}

export interface StructureMove {
  id: string;
  label: string;
  action: string;
  reason: string;
}

export interface PlatformPrescription {
  label: string;
  instruction: string;
}

export interface FirstThreeRewritePackage {
  diagnostic: RetentionDiagnostic;
  recommendedOrder: string[];
  chapterPlans: ChapterRewritePlan[];
  structureMoves: StructureMove[];
  platformPrescriptions: PlatformPrescription[];
  markdown: string;
}

export interface FirstThreeRewriteComparableChapter {
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift?: string;
  cliffhanger: string;
  status: string;
}

export interface FirstThreeRewriteScoreItemDelta {
  id: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  status: PlatformStyleScoreItem["status"];
  suggestion: string;
}

export interface FirstThreeRewriteDecision {
  action: "keep" | "second_pass" | "rollback";
  label: string;
  severity: "success" | "needs_work" | "danger";
  rationale: string;
  nextAction: string;
  reasons: string[];
}

export interface FirstThreeRewriteEvaluation {
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  wordDelta: number;
  changedFields: string[];
  oldPreview: string;
  newPreview: string;
  verdict: string;
  decision: FirstThreeRewriteDecision;
  itemDeltas: FirstThreeRewriteScoreItemDelta[];
  priorityFixes: string[];
}

const fallbackChapters: RetentionChapter[] = [
  {
    id: "missing-1",
    order: 1,
    title: "第一章",
    content: "",
    wordCount: 0,
    goal: "",
    hook: "",
    conflict: "",
    cliffhanger: "",
    status: "outline",
  },
  {
    id: "missing-2",
    order: 2,
    title: "第二章",
    content: "",
    wordCount: 0,
    goal: "",
    hook: "",
    conflict: "",
    cliffhanger: "",
    status: "outline",
  },
  {
    id: "missing-3",
    order: 3,
    title: "第三章",
    content: "",
    wordCount: 0,
    goal: "",
    hook: "",
    conflict: "",
    cliffhanger: "",
    status: "outline",
  },
];

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sentence(text: string, fallback: string) {
  const value = compact(text);
  return value.length > 0 ? value : fallback;
}

function chapterRole(order: number, platform: PlatformProfile) {
  if (order === 1 && platform.id === "qidian") return "开口章：长期期待、世界规则、主角方向同时亮相";
  if (order === 1 && platform.id === "zhihu_yanxuan") return "开口章：第一段进矛盾，第一屏埋反转问题";
  if (order === 1 && platform.category === "overseas") return "开口章：直白说明规则、风险和 progression promise";
  if (order === 1) return "开口章：异常事件、不可逆选择、第一处爽点";
  if (order === 2) return "主干章：承接悬念，兑现第一次奖励或关系推进";
  return "转折章：把第一轮冲突推到新敌人、新真相或新任务";
}

function priorityFor(signal: RetentionChapterSignal | undefined) {
  if (!signal || signal.score < 55) return "high";
  if (signal.score < 78) return "medium";
  return "low";
}

function priorityLabel(priority: ChapterRewritePlan["priority"]) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function problemFor(chapter: RetentionChapter, signal: RetentionChapterSignal | undefined) {
  if (!signal) return "章节缺失，无法形成首轮追读链。";
  if (!chapter.hook.trim()) return "开头没有可见钩子，读者没有进入下一屏的理由。";
  if (!chapter.conflict.trim()) return "冲突不够明确，章节像设定展示而不是事件推进。";
  if (!chapter.cliffhanger.trim()) return "章末没有新问题，追读链在这里断掉。";
  if (chapter.wordCount < 1200) return "样章量偏轻，平台无法判断稳定阅读节奏。";
  return signal.risk;
}

function targetFor(chapter: RetentionChapter, platform: PlatformProfile) {
  if (chapter.order === 1) {
    return `第一屏按${platform.name}规则重写：${platform.openingRules[0]}，并在 300 字内给出选择和代价。`;
  }
  if (chapter.order === 2) {
    return "把上一章悬念变成可见兑现：奖励、线索、关系推进或一次小反杀至少出现一个。";
  }
  return "用第三章完成第一轮升级或反转，并抛出能带动第 4-10 章的小主线。";
}

function coldOpenFor(chapter: RetentionChapter) {
  if (chapter.order === 1) {
    return `第一句直接写：${sentence(chapter.hook, "异常事件发生，主角被迫做选择")}。第二段立刻接：${sentence(chapter.conflict, "主角必须在两个坏选项里选一个")}。`;
  }
  if (chapter.order === 2) {
    return `不要换场景闲聊，开场先兑现上一章结尾：${sentence(chapter.hook || chapter.goal, "上一章悬念立刻造成后果")}。`;
  }
  return `开场用压力升级，不用回顾前情：${sentence(chapter.hook || chapter.conflict, "新任务、新敌人或新证据直接出现")}。`;
}

function keepFor(chapter: RetentionChapter) {
  return [
    sentence(chapter.hook, "保留最容易一句话讲清楚的异常事件"),
    sentence(chapter.conflict, "保留主角必须行动的核心冲突"),
    sentence(chapter.goal, "保留能连到主线的大目标"),
  ];
}

function cutFor(chapter: RetentionChapter, platform: PlatformProfile) {
  const shared = [
    "删掉不影响选择和代价的背景说明。",
    "删掉只解释世界观、但没有改变局面的段落。",
  ];
  if (platform.category === "overseas") return [...shared, "删掉需要中文语境才能理解的隐喻，改成规则和结果。"];
  if (platform.id === "qidian") return [...shared, "删掉短平快噱头里不能服务长期升级体系的部分。"];
  if (platform.id === "zhihu_yanxuan") return [...shared, "删掉提前泄底的解释，把答案压到付费期待后。"];
  if (!chapter.cliffhanger.trim()) return [...shared, "删掉平收结尾，强制改成新问题结尾。"];
  return shared;
}

function addFor(chapter: RetentionChapter, platform: PlatformProfile) {
  const additions: string[] = [];
  if (!chapter.hook.trim()) additions.push("补一个能放在第一句的异常钩子。");
  if (!chapter.conflict.trim()) additions.push("补一个必须马上处理的外部冲突。");
  if (!chapter.cliffhanger.trim()) additions.push("补一个和主线直接相关的章末新问题。");
  if (chapter.wordCount < 1200) additions.push("补足一场有起因、行动、结果的小事件，不要只扩心理活动。");
  if (chapter.order === 2) additions.push("补第一次兑现：技能、线索、关系推进、反杀或真相碎片。");
  if (chapter.order === 3) additions.push("补第一轮转折：敌人露面、规则反咬、目标升级三选一。");
  additions.push(`补${platform.name}重点：${platform.reviewFocus.slice(0, 2).join("、")}。`);
  return additions;
}

function endingFor(chapter: RetentionChapter) {
  if (chapter.order === 1) {
    return `结尾不要收安全，改成：${sentence(chapter.cliffhanger, "主角刚完成选择，系统立刻给出第二个更糟的任务")}。`;
  }
  if (chapter.order === 2) {
    return `结尾把兑现转成代价：${sentence(chapter.cliffhanger, "奖励生效的同时，反派发现主角的异常")}。`;
  }
  return `结尾要打开第 4 章入口：${sentence(chapter.cliffhanger, "真相指向一个主角不能立刻对抗的人")}。`;
}

function expectedEffectFor(chapter: RetentionChapter, platform: PlatformProfile) {
  if (chapter.order === 1) return `提高${platform.name}首章读完率，让读者在第一屏知道为什么要追。`;
  if (chapter.order === 2) return "把读者从好奇推到获得感，降低第二章流失。";
  return "制造继续追第 4 章的理由，让前三章从样章变成小闭环。";
}

function normalizeFirstThree(chapters: RetentionChapter[]) {
  return fallbackChapters.map((fallback, index) => {
    const chapter = chapters[index];
    return chapter ?? fallback;
  });
}

function buildChapterPlans(input: FirstThreeRewriteInput, diagnostic: RetentionDiagnostic): ChapterRewritePlan[] {
  return normalizeFirstThree(input.chapters).map((chapter) => {
    const signal = diagnostic.chapterSignals.find((entry) => entry.order === chapter.order);
    const priority = priorityFor(signal);
    return {
      chapterId: chapter.id,
      order: chapter.order,
      title: chapter.title,
      role: chapterRole(chapter.order, input.platform),
      priority,
      currentProblem: problemFor(chapter, signal),
      rewriteTarget: targetFor(chapter, input.platform),
      coldOpen: coldOpenFor(chapter),
      keep: keepFor(chapter),
      cut: cutFor(chapter, input.platform),
      add: addFor(chapter, input.platform),
      ending: endingFor(chapter),
      expectedEffect: expectedEffectFor(chapter, input.platform),
    };
  });
}

function itemStatus(items: RetentionDiagnosticItem[], id: string) {
  return items.find((item) => item.id === id)?.status ?? "fail";
}

function buildStructureMoves(diagnostic: RetentionDiagnostic): StructureMove[] {
  const moves: StructureMove[] = [
    {
      id: "open-ending-first",
      label: "先定开头和结尾",
      action: "先重写第 1 章第一屏，再重写第 3 章最后 300 字，中间章节只围绕这两个端点服务。",
      reason: "开头决定进入率，第三章结尾决定追第 4 章，端点不清楚时中间扩写都会散。",
    },
    {
      id: "trunk-before-branch",
      label: "先主干后分支",
      action: "前三章只保留一条主线压力，人物关系、世界观、伏笔只留下能推动选择的部分。",
      reason: "大树结构里前三章是树干，不是叶片展示区。",
    },
  ];

  if (itemStatus(diagnostic.items, "payoff-density") !== "pass") {
    moves.push({
      id: "move-payoff-forward",
      label: "把兑现前移",
      action: "把原本第 4-5 章才出现的奖励、线索或反杀，提前压进第 2 章。",
      reason: "读者不能只吃设定，前三章至少要看到两次结果。",
    });
  }

  if (itemStatus(diagnostic.items, "cliffhanger-chain") !== "pass") {
    moves.push({
      id: "rebuild-cliffhanger-chain",
      label: "重做断章链",
      action: "每章结尾都用一个未解决的新问题接下一章，且新问题必须来自主线冲突。",
      reason: "章末悬念断档会直接伤追读。",
    });
  }

  if (itemStatus(diagnostic.items, "platform-fit") !== "pass") {
    moves.push({
      id: "platform-fit-rewrite",
      label: "按平台重排卖点",
      action: `重排前三章关键词，让它贴近 ${diagnostic.platformName} 的审稿/读者期待。`,
      reason: "同一个故事投不同平台，前三章强调顺序必须不同。",
    });
  }

  return moves;
}

function buildRecommendedOrder(platform: PlatformProfile) {
  return [
    "先写第 1 章开头：第一屏只解决钩子、选择、代价。",
    "再写第 3 章结尾：提前确定读者为什么要点第 4 章。",
    "回头写第 2 章主干：承接第 1 章悬念，并完成第一次可见兑现。",
    "最后填叶片和土壤：人物情绪、规则解释、伏笔和氛围，只保留能服务主干的内容。",
    `用${platform.name}复查：${platform.reviewFocus.join("、")}。`,
  ];
}

function buildPlatformPrescriptions(platform: PlatformProfile): PlatformPrescription[] {
  return [
    {
      label: "开头取舍",
      instruction: platform.openingRules.join("；"),
    },
    {
      label: "前三章审稿点",
      instruction: platform.reviewFocus.join("、"),
    },
    {
      label: "必须避开的坑",
      instruction: platform.risks.join("、"),
    },
  ];
}

function buildMarkdown(input: FirstThreeRewriteInput, pack: Omit<FirstThreeRewritePackage, "markdown">) {
  return [
    `# ${input.projectTitle} 前三章重排改稿处方`,
    "",
    `平台：${input.platform.name}`,
    `诊断分：${pack.diagnostic.score}`,
    `诊断结论：${pack.diagnostic.verdict}`,
    "",
    "## 改稿顺序",
    ...pack.recommendedOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## 章节处方",
    ...pack.chapterPlans.flatMap((plan) => [
      `### 第 ${plan.order} 章 ${plan.title}`,
      `优先级：${priorityLabel(plan.priority)}`,
      `章节职责：${plan.role}`,
      `当前问题：${plan.currentProblem}`,
      `改稿目标：${plan.rewriteTarget}`,
      `冷开场：${plan.coldOpen}`,
      `章末处理：${plan.ending}`,
      `预期效果：${plan.expectedEffect}`,
      "",
      "保留：",
      ...plan.keep.map((item) => `- ${item}`),
      "删除：",
      ...plan.cut.map((item) => `- ${item}`),
      "补写：",
      ...plan.add.map((item) => `- ${item}`),
      "",
    ]),
    "## 结构动作",
    ...pack.structureMoves.map((move) => `- ${move.label}：${move.action}（${move.reason}）`),
    "",
    "## 平台处方",
    ...pack.platformPrescriptions.map((item) => `- ${item.label}：${item.instruction}`),
    "",
  ].join("\n");
}

function fieldChanged(before: string | undefined, after: string | undefined) {
  return compact(before ?? "") !== compact(after ?? "");
}

function evaluationVerdict(scoreDelta: number, afterScore: number, changedFields: string[]) {
  if (afterScore >= 85 && scoreDelta >= 10) return "改写收益明显，已经接近可投开局，下一步看正文阅读感和章末追读。";
  if (afterScore >= 75 && scoreDelta > 0) return "改写有效，但还要人工检查正文是否真的兑现了钩子和爽点。";
  if (scoreDelta <= 0) return "平台分没有提升，别急着采纳，优先回看钩子、冲突和章末悬念。";
  if (changedFields.length <= 2) return "只改到了少数字段，收益有限，建议再补一次结构性重写。";
  return "改写有提升，但仍未到稳态发布线，继续压强第一屏和章末追读。";
}

function buildRewriteDecision(input: {
  scoreDelta: number;
  afterScore: number;
  itemDeltas: FirstThreeRewriteScoreItemDelta[];
  priorityFixes: string[];
}): FirstThreeRewriteDecision {
  const failedItems = input.itemDeltas.filter((item) => item.status === "fail");
  const improvedItems = input.itemDeltas.filter((item) => item.delta > 0);
  const weakenedItems = input.itemDeltas.filter((item) => item.delta < 0);
  const reasons = [
    `平台分 ${input.scoreDelta >= 0 ? "+" : ""}${input.scoreDelta}，当前 ${input.afterScore} 分。`,
    improvedItems.length ? `提升项：${improvedItems.slice(0, 2).map((item) => item.label).join("、")}。` : "",
    weakenedItems.length ? `变弱项：${weakenedItems.slice(0, 2).map((item) => item.label).join("、")}。` : "",
    failedItems.length ? `仍失败：${failedItems.slice(0, 2).map((item) => item.label).join("、")}。` : "",
  ].filter(Boolean);

  if (input.scoreDelta <= 0 || (input.afterScore < 50 && input.scoreDelta < 8)) {
    return {
      action: "rollback",
      label: "建议回滚",
      severity: "danger",
      rationale: "这版没有证明自己比旧稿更适合平台，继续往下投只会污染判断。",
      nextAction: "打开章节版本，回滚到改写前旧稿，再按失败项重写。",
      reasons,
    };
  }

  if (input.afterScore >= 85 && input.scoreDelta >= 10 && failedItems.length === 0) {
    return {
      action: "keep",
      label: "建议保留",
      severity: "success",
      rationale: "这版已经拿到明显平台收益，可以先保留当前稿，再跑发布质检。",
      nextAction: "保留当前稿，进入发布前质检和平台导出复查。",
      reasons,
    };
  }

  return {
    action: "second_pass",
    label: "继续二改",
    severity: "needs_work",
    rationale: "这版有提升，但还没到稳定发布线，别急着当终稿。",
    nextAction: input.priorityFixes[0] ?? "继续补强首屏钩子、冲突压力和章末追读。",
    reasons,
  };
}

export function buildFirstThreeRewriteEvaluation(input: {
  platform: PlatformProfile;
  before: FirstThreeRewriteComparableChapter;
  after: FirstThreeRewriteComparableChapter;
}): FirstThreeRewriteEvaluation {
  const beforeScore = buildPlatformStyleScore({
    platform: input.platform,
    chapter: {
      ...input.before,
      valueShift: input.before.valueShift ?? "",
    },
  });
  const afterScore = buildPlatformStyleScore({
    platform: input.platform,
    chapter: {
      ...input.after,
      valueShift: input.after.valueShift ?? "",
    },
  });
  const beforeItems = new Map(beforeScore.items.map((item) => [item.id, item]));
  const itemDeltas = afterScore.items.map((item) => {
    const beforeItem = beforeItems.get(item.id);
    const before = beforeItem?.score ?? 0;
    return {
      id: item.id,
      label: item.label,
      before,
      after: item.score,
      delta: item.score - before,
      status: item.status,
      suggestion: item.suggestion,
    };
  });
  const changedFields = [
    ["title", "标题"],
    ["content", "正文"],
    ["goal", "章节目标"],
    ["hook", "开头钩子"],
    ["conflict", "冲突"],
    ["valueShift", "价值变化"],
    ["cliffhanger", "章末悬念"],
    ["status", "状态"],
  ] as const;
  const changedFieldLabels = changedFields
    .filter(([field]) => {
      const before = input.before[field];
      const after = input.after[field];
      return typeof before === "number" || typeof after === "number"
        ? before !== after
        : fieldChanged(before?.toString(), after?.toString());
    })
    .map(([, label]) => label);
  const scoreDelta = afterScore.score - beforeScore.score;
  const priorityFixes = afterScore.priorityFixes;
  const decision = buildRewriteDecision({
    scoreDelta,
    afterScore: afterScore.score,
    itemDeltas,
    priorityFixes,
  });

  return {
    beforeScore: beforeScore.score,
    afterScore: afterScore.score,
    scoreDelta,
    wordDelta: input.after.wordCount - input.before.wordCount,
    changedFields: changedFieldLabels,
    oldPreview: previewRevisionContent(input.before.content),
    newPreview: previewRevisionContent(input.after.content),
    verdict: evaluationVerdict(scoreDelta, afterScore.score, changedFieldLabels),
    decision,
    itemDeltas,
    priorityFixes,
  };
}

export function buildFirstThreeRewritePackage(input: FirstThreeRewriteInput): FirstThreeRewritePackage {
  const diagnostic = buildRetentionDiagnostic(input);
  const packWithoutMarkdown = {
    diagnostic,
    recommendedOrder: buildRecommendedOrder(input.platform),
    chapterPlans: buildChapterPlans(input, diagnostic),
    structureMoves: buildStructureMoves(diagnostic),
    platformPrescriptions: buildPlatformPrescriptions(input.platform),
  };

  return {
    ...packWithoutMarkdown,
    markdown: buildMarkdown(input, packWithoutMarkdown),
  };
}
