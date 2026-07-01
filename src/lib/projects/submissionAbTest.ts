import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildSubmissionPackage, type SubmissionPackageChapter } from "./submissionPackage.ts";

export interface SubmissionAbTestInput {
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetWordCount: number;
  platform: PlatformProfile;
  chapters: SubmissionPackageChapter[];
}

export interface SubmissionAbVariant {
  id: string;
  name: string;
  angle: string;
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  score: number;
  hypothesis: string;
  expectedReader: string;
  revisionFocus: string[];
}

export interface SubmissionAbTest {
  platformName: string;
  recommendedVariantId: string;
  variants: SubmissionAbVariant[];
  markdown: string;
}

interface VariantTemplate {
  id: string;
  name: string;
  angle: string;
  titleSuffix: string;
  tagBoosts: string[];
  scoreBonus: number;
  hypothesis: string;
  expectedReader: string;
}

const templates: VariantTemplate[] = [
  {
    id: "hook",
    name: "强钩子版",
    angle: "把开局危机和不可逆选择放到第一眼。",
    titleSuffix: "开局十秒倒计时",
    tagBoosts: ["强钩子", "高压选择", "章末悬念"],
    scoreBonus: 12,
    hypothesis: "如果读者只看标题和前两句，这版最容易让人点进第一章。",
    expectedReader: "偏爱快节奏、强事件、开局立刻出事的读者。",
  },
  {
    id: "payoff",
    name: "爽点密集版",
    angle: "突出升级、打脸、反转和持续获得感。",
    titleSuffix: "选择就能变强",
    tagBoosts: ["系统流", "逆袭", "爽文", "升级"],
    scoreBonus: 10,
    hypothesis: "如果平台更看重首轮追读和爽点兑现，这版更容易稳定留存。",
    expectedReader: "想快速看到主角翻盘、升级和解决问题的读者。",
  },
  {
    id: "emotion",
    name: "情绪张力版",
    angle: "把人物关系、代价和情绪选择前置。",
    titleSuffix: "她必须亲手选择",
    tagBoosts: ["情绪拉扯", "人物弧光", "关系张力"],
    scoreBonus: 7,
    hypothesis: "如果读者吃角色困境和情绪代价，这版比纯设定更有黏性。",
    expectedReader: "偏爱角色成长、情感推进和人物关系的读者。",
  },
  {
    id: "mystery",
    name: "悬疑反转版",
    angle: "强调秘密、误导和章末反转。",
    titleSuffix: "系统在撒谎",
    tagBoosts: ["悬疑", "反转", "秘密", "真相"],
    scoreBonus: 8,
    hypothesis: "如果故事开头有足够谜团，这版能把好奇心变成追读。",
    expectedReader: "喜欢猜真相、等反转和看伏笔回收的读者。",
  },
  {
    id: "overseas",
    name: "海外直白版",
    angle: "用更直白的设定承诺和 progression promise 包装。",
    titleSuffix: "System Choice",
    tagBoosts: ["Progression", "System", "Urban Fantasy", "High Stakes"],
    scoreBonus: 6,
    hypothesis: "如果要投海外或做英文简介，这版能减少文化语境和设定理解成本。",
    expectedReader: "偏爱系统、升级、清晰规则和高风险选择的海外读者。",
  },
];

function trimEndingPunctuation(text: string) {
  return text.replace(/[。.!！?？,，;；:：]+$/u, "");
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
}

function firstChapterHook(chapters: SubmissionPackageChapter[], fallback: string) {
  return trimEndingPunctuation(chapters[0]?.hook || fallback);
}

function scoreVariant(template: VariantTemplate, platform: PlatformProfile) {
  const platformText = [...platform.reviewFocus, ...platform.openingRules, ...platform.genres].join(" ");
  const boostHits = template.tagBoosts.filter((tag) => platformText.toLowerCase().includes(tag.toLowerCase())).length;
  const categoryBoost = (
    (template.id === "hook" && platform.category === "free")
    || (template.id === "emotion" && platform.category === "female")
    || (template.id === "mystery" && platform.category === "short")
    || (template.id === "overseas" && platform.category === "overseas")
  ) ? 8 : 0;

  return Math.max(0, Math.min(100, 62 + template.scoreBonus + boostHits * 4 + categoryBoost));
}

function buildTitle(baseTitle: string, template: VariantTemplate, platform: PlatformProfile) {
  if (template.id === "overseas" || platform.category === "overseas") {
    return `${baseTitle}: ${template.titleSuffix}`;
  }
  return `${baseTitle}：${template.titleSuffix}`;
}

function buildLogline(input: SubmissionAbTestInput, template: VariantTemplate) {
  const sellingPoint = trimEndingPunctuation(input.sellingPoint || "主角在危机中觉醒能力并连续翻盘");
  const hook = firstChapterHook(input.chapters, input.platform.openingRules[0] ?? "开局进入危机");
  if (template.id === "emotion") return `${hook}，主角必须在代价和欲望之间做出选择。`;
  if (template.id === "mystery") return `${hook}，但系统给出的答案从第一秒就不可信。`;
  if (template.id === "overseas") return `A high-stakes system story where every choice upgrades the hero and exposes a deeper secret.`;
  return `${sellingPoint}，${hook}。`;
}

function buildSynopsis(input: SubmissionAbTestInput, template: VariantTemplate) {
  const hook = firstChapterHook(input.chapters, input.platform.openingRules[0] ?? "开局进入危机");
  const focus = input.platform.reviewFocus.slice(0, 3).join("、");
  const sellingPoint = trimEndingPunctuation(input.sellingPoint || "主角在高压选择中不断翻盘");
  if (template.id === "overseas") {
    return `${input.title} is positioned as a clear ${input.genre} progression story: ${sellingPoint}. It opens with ${hook}, then uses visible rules, escalating choices, and chapter-end questions to keep readers moving.`;
  }
  return [
    `${hook}，主角被迫进入一套不能回头的新规则。`,
    `这版包装主打${template.angle}`,
    `故事核心仍是${sellingPoint}，但简介会优先服务${input.platform.name}的${focus}。`,
  ].join("");
}

function buildRevisionFocus(input: SubmissionAbTestInput, template: VariantTemplate) {
  return [
    `标题先测试“${template.titleSuffix}”这个外显钩子。`,
    `简介首句围绕“${firstChapterHook(input.chapters, input.platform.openingRules[0] ?? "开局危机")}”展开。`,
    `前三章检查是否兑现：${input.platform.reviewFocus.slice(0, 3).join("、")}。`,
  ];
}

function buildMarkdown(platformName: string, variants: SubmissionAbVariant[]) {
  return [
    `# ${platformName} 投稿 A/B 测试`,
    "",
    "## 推荐排序",
    ...variants.map((variant, index) => `${index + 1}. ${variant.name}｜${variant.score}｜${variant.title}`),
    "",
    ...variants.flatMap((variant) => [
      `## ${variant.name}`,
      `标题：${variant.title}`,
      `角度：${variant.angle}`,
      `评分：${variant.score}`,
      `假设：${variant.hypothesis}`,
      `读者：${variant.expectedReader}`,
      "",
      "### 一句话卖点",
      variant.logline,
      "",
      "### 简介",
      variant.synopsis,
      "",
      "### 标签",
      variant.tags.join("、"),
      "",
      "### 修订重点",
      ...variant.revisionFocus.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}

export function buildSubmissionAbTest(input: SubmissionAbTestInput): SubmissionAbTest {
  const basePackage = buildSubmissionPackage({
    title: input.title,
    genre: input.genre,
    sellingPoint: input.sellingPoint,
    currentWordCount: input.currentWordCount,
    targetWordCount: input.targetWordCount,
    platform: input.platform,
    chapters: input.chapters,
  });
  const variants = templates
    .map((template) => ({
      id: template.id,
      name: template.name,
      angle: template.angle,
      title: buildTitle(input.title, template, input.platform),
      logline: buildLogline(input, template),
      synopsis: buildSynopsis(input, template),
      tags: uniqueTags([...template.tagBoosts, ...basePackage.tags]),
      score: scoreVariant(template, input.platform),
      hypothesis: template.hypothesis,
      expectedReader: template.expectedReader,
      revisionFocus: buildRevisionFocus(input, template),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  return {
    platformName: input.platform.name,
    recommendedVariantId: variants[0]?.id ?? "hook",
    variants,
    markdown: buildMarkdown(input.platform.name, variants),
  };
}
