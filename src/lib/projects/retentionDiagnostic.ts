import type { PlatformProfile } from "../platforms/platformProfiles.ts";

export interface RetentionChapter {
  id: string;
  order: number;
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  status: string;
}

export interface RetentionDiagnosticInput {
  projectTitle: string;
  platform: PlatformProfile;
  chapters: RetentionChapter[];
}

export interface RetentionChapterSignal {
  chapterId: string;
  order: number;
  title: string;
  score: number;
  hook: string;
  payoff: string;
  cliffhanger: string;
  risk: string;
}

export interface RetentionDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

export interface RetentionDiagnostic {
  score: number;
  verdict: string;
  platformName: string;
  chapterSignals: RetentionChapterSignal[];
  items: RetentionDiagnosticItem[];
  rewritePlan: string[];
  markdown: string;
}

const payoffWords = ["获得", "赢", "反杀", "升级", "奖励", "技能", "翻盘", "解决", "真相", "线索", "救", "发现"];
const hookWords = ["系统", "倒计时", "危险", "秘密", "任务", "选择", "雨", "门", "死", "血", "真相", "反派"];

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function statusItem(
  id: string,
  label: string,
  passed: boolean,
  partial: boolean,
  score: number,
  evidence: string,
  suggestion: string,
): RetentionDiagnosticItem {
  return {
    id,
    label,
    status: passed ? "pass" : partial ? "warn" : "fail",
    score: passed ? score : partial ? Math.round(score * 0.55) : 0,
    evidence,
    suggestion,
  };
}

function chapterPayoff(chapter: RetentionChapter) {
  const text = `${chapter.content} ${chapter.goal} ${chapter.conflict}`;
  if (hasAny(text, payoffWords)) return "本章有可感知的获得、反转或线索。";
  if (chapter.status === "final" || chapter.wordCount >= 2500) return "本章篇幅具备兑现空间，但爽点词不够明显。";
  return "本章还缺少明确兑现，读者可能只看到铺垫。";
}

function chapterRisk(chapter: RetentionChapter) {
  if (!chapter.hook.trim()) return "缺少开头钩子。";
  if (!chapter.conflict.trim()) return "缺少本章冲突。";
  if (!chapter.cliffhanger.trim()) return "缺少章末悬念。";
  if (chapter.wordCount < 800) return "字数偏少，留存样章证据不足。";
  return "基础信号齐全。";
}

function chapterScore(chapter: RetentionChapter) {
  return [
    chapter.hook.trim().length > 0 ? 22 : 0,
    chapter.conflict.trim().length > 0 ? 20 : 0,
    chapter.cliffhanger.trim().length > 0 ? 22 : 0,
    chapter.wordCount >= 1200 ? 18 : chapter.wordCount >= 400 ? 10 : 0,
    hasAny(`${chapter.content} ${chapter.goal} ${chapter.conflict}`, payoffWords) ? 18 : 8,
  ].reduce((sum, value) => sum + value, 0);
}

function buildChapterSignals(chapters: RetentionChapter[]): RetentionChapterSignal[] {
  return chapters.slice(0, 3).map((chapter) => ({
    chapterId: chapter.id,
    order: chapter.order,
    title: chapter.title,
    score: chapterScore(chapter),
    hook: chapter.hook || "未填写开头钩子。",
    payoff: chapterPayoff(chapter),
    cliffhanger: chapter.cliffhanger || "未填写章末悬念。",
    risk: chapterRisk(chapter),
  }));
}

function buildItems(input: RetentionDiagnosticInput, chapterSignals: RetentionChapterSignal[]): RetentionDiagnosticItem[] {
  const firstThree = input.chapters.slice(0, 3);
  const chapterCount = firstThree.length;
  const allHaveHooks = firstThree.length >= 3 && firstThree.every((chapter) => chapter.hook.trim().length > 0);
  const allHaveCliffhangers = firstThree.length >= 3 && firstThree.every((chapter) => chapter.cliffhanger.trim().length > 0);
  const allHaveConflict = firstThree.length >= 3 && firstThree.every((chapter) => chapter.conflict.trim().length > 0);
  const totalWords = firstThree.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const hasPayoff = firstThree.filter((chapter) => hasAny(`${chapter.content} ${chapter.goal} ${chapter.conflict}`, payoffWords)).length;
  const hookChain = firstThree.map((chapter) => `${chapter.hook} ${chapter.cliffhanger}`).join(" ");
  const platformHit = [...input.platform.openingRules, ...input.platform.reviewFocus].some((rule) => {
    const keywords = rule.split(/[、，；;,. ]+/).filter((part) => part.length >= 2);
    return keywords.some((keyword) => hookChain.includes(keyword));
  });

  return [
    statusItem(
      "chapter-count",
      "前三章完整度",
      chapterCount >= 3,
      chapterCount > 0,
      16,
      `当前 ${chapterCount}/3 章。`,
      "先补齐前三章，否则平台首轮留存无法判断。",
    ),
    statusItem(
      "hook-chain",
      "钩子递进",
      allHaveHooks && hasAny(hookChain, hookWords),
      firstThree.some((chapter) => chapter.hook.trim().length > 0),
      18,
      allHaveHooks ? "前三章都有开头钩子。" : "前三章钩子不完整。",
      "每章开头都要有新问题，不能三章都只重复同一个设定。",
    ),
    statusItem(
      "payoff-density",
      "爽点兑现",
      hasPayoff >= 2,
      hasPayoff >= 1,
      18,
      `前三章中 ${hasPayoff} 章有明显兑现信号。`,
      "前三章至少两章要有获得感：技能、线索、反杀、关系推进或真相揭露。",
    ),
    statusItem(
      "cliffhanger-chain",
      "章末悬念链",
      allHaveCliffhangers,
      firstThree.some((chapter) => chapter.cliffhanger.trim().length > 0),
      18,
      allHaveCliffhangers ? "前三章都有章末悬念。" : "章末悬念断档。",
      "每章结尾都要把读者推向下一章，悬念要和主线直接相关。",
    ),
    statusItem(
      "mainline-pressure",
      "主线压力",
      allHaveConflict,
      firstThree.some((chapter) => chapter.conflict.trim().length > 0),
      14,
      allHaveConflict ? "前三章都有明确冲突。" : "主线压力不足或断档。",
      "每章都要有一个不可跳过的冲突，不要只做设定展示。",
    ),
    statusItem(
      "sample-weight",
      "首秀样章量",
      totalWords >= 6000,
      totalWords >= 2500,
      8,
      `前三章共 ${totalWords} 字。`,
      "建议前三章至少准备 6000 字以上，再判断留存节奏。",
    ),
    statusItem(
      "platform-fit",
      "平台追读适配",
      platformHit,
      input.platform.reviewFocus.some((focus) => hookChain.includes(focus.slice(0, 2))),
      8,
      platformHit ? `已命中 ${input.platform.name} 的部分开头/审稿关键词。` : `未明显命中 ${input.platform.name} 的追读重点。`,
      `按${input.platform.name}重写前三章节奏：${input.platform.reviewFocus.join("、")}。`,
    ),
  ];
}

function verdict(score: number) {
  if (score >= 85) return "前三章具备首秀测试条件，可以继续精修表达。";
  if (score >= 70) return "前三章基本连上了，但爽点兑现或悬念链还要加压。";
  if (score >= 50) return "前三章有雏形，但追读链条不稳，先别急着投。";
  return "前三章留存风险高，需要先补章、补钩子、补兑现。";
}

function buildRewritePlan(items: RetentionDiagnosticItem[], platform: PlatformProfile) {
  const weakItems = items.filter((entry) => entry.status !== "pass");
  return [
    weakItems[0]?.suggestion ?? "保留现有钩子，增强第二章和第三章的连续问题。",
    weakItems[1]?.suggestion ?? "把每章爽点写成可见结果，不只写主角感受。",
    `用${platform.name}的追读重点复查前三章：${platform.reviewFocus.join("、")}。`,
  ];
}

function buildMarkdown(input: RetentionDiagnosticInput, diagnostic: Omit<RetentionDiagnostic, "markdown">) {
  return [
    `# ${input.projectTitle} 前三章追读诊断`,
    "",
    `平台：${diagnostic.platformName}`,
    `评分：${diagnostic.score}`,
    `结论：${diagnostic.verdict}`,
    "",
    "## 章节信号",
    ...diagnostic.chapterSignals.flatMap((chapter) => [
      `### 第 ${chapter.order} 章 ${chapter.title}`,
      `评分：${chapter.score}`,
      `钩子：${chapter.hook}`,
      `兑现：${chapter.payoff}`,
      `悬念：${chapter.cliffhanger}`,
      `风险：${chapter.risk}`,
      "",
    ]),
    "## 诊断指标",
    ...diagnostic.items.map((entry) => (
      `- ${entry.label}｜${entry.status}｜${entry.score}：${entry.evidence}；建议：${entry.suggestion}`
    )),
    "",
    "## 修订顺序",
    ...diagnostic.rewritePlan.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

export function buildRetentionDiagnostic(input: RetentionDiagnosticInput): RetentionDiagnostic {
  const chapterSignals = buildChapterSignals(input.chapters);
  const items = buildItems(input, chapterSignals);
  const score = Math.max(0, Math.min(100, items.reduce((sum, entry) => sum + entry.score, 0)));
  const diagnosticWithoutMarkdown = {
    score,
    verdict: verdict(score),
    platformName: input.platform.name,
    chapterSignals,
    items,
    rewritePlan: buildRewritePlan(items, input.platform),
  };

  return {
    ...diagnosticWithoutMarkdown,
    markdown: buildMarkdown(input, diagnosticWithoutMarkdown),
  };
}
