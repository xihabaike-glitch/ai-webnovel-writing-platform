import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildProjectStartExecutionPromptBlock, type ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import { countWords } from "../text/wordCount.ts";

export interface OpeningDiagnosticInput {
  projectTitle: string;
  platform: PlatformProfile;
  startTactic?: ProjectStartTacticSummary | null;
  chapter: {
    title: string;
    content: string;
    goal: string;
    hook: string;
    conflict: string;
    cliffhanger: string;
  };
}

export interface OpeningDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

export interface OpeningDiagnostic {
  score: number;
  verdict: string;
  excerpt: string;
  wordCount: number;
  items: OpeningDiagnosticItem[];
  rewritePlan: string[];
  platformFocus: string[];
  markdown: string;
}

const crisisWords = ["死", "血", "危险", "倒计时", "系统", "任务", "惩罚", "失控", "门", "雨", "逃", "救", "爆炸", "秘密", "真相"];
const choiceWords = ["必须", "只能", "选择", "否则", "代价", "惩罚", "不能", "来不及", "倒计时", "牺牲"];
const protagonistSignals = ["我", "他", "她", "主角", "林", "顾", "沈", "陆", "周", "陈", "叶", "晚"];

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function openingExcerpt(content: string) {
  return compact(content).slice(0, 800);
}

function firstSentence(text: string) {
  const match = text.match(/^[^。！？!?.\n]{1,90}[。！？!?.]?/u);
  return match?.[0]?.trim() || text.slice(0, 90);
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function tacticKeywords(tactic: ProjectStartTacticSummary | null | undefined) {
  if (!tactic) return [];
  return tactic.openingMove
    .split(/[、，；;,.。！？!?\s]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !["开头动作", "新项目", "第一段"].includes(part))
    .slice(0, 6);
}

function item(
  id: string,
  label: string,
  passed: boolean,
  partial: boolean,
  score: number,
  evidence: string,
  suggestion: string,
): OpeningDiagnosticItem {
  return {
    id,
    label,
    status: passed ? "pass" : partial ? "warn" : "fail",
    score: passed ? score : partial ? Math.round(score * 0.55) : 0,
    evidence,
    suggestion,
  };
}

function buildItems(input: OpeningDiagnosticInput, excerpt: string): OpeningDiagnosticItem[] {
  const sentence = firstSentence(excerpt);
  const hookText = `${sentence} ${input.chapter.hook}`;
  const conflictText = `${excerpt} ${input.chapter.conflict}`;
  const platformText = `${excerpt} ${input.chapter.hook} ${input.chapter.conflict} ${input.chapter.cliffhanger}`;
  const tacticHits = tacticKeywords(input.startTactic).filter((keyword) => platformText.includes(keyword));
  const platformHits = [...input.platform.openingRules, ...input.platform.reviewFocus].filter((rule) => {
    const keywords = rule.split(/[、，；;,. ]+/).filter((part) => part.length >= 2);
    return keywords.some((keyword) => platformText.includes(keyword));
  });

  const items = [
    item(
      "first-line-hook",
      "首句钩子",
      includesAny(hookText, crisisWords) && sentence.length <= 55,
      includesAny(hookText, crisisWords) || sentence.length <= 70,
      18,
      sentence || "正文为空。",
      "第一句必须给出异常、危险、倒计时、秘密或不可解释事件，不要先解释世界观。",
    ),
    item(
      "protagonist-clarity",
      "主角处境",
      includesAny(excerpt.slice(0, 220), protagonistSignals) && input.chapter.goal.trim().length > 0,
      includesAny(excerpt.slice(0, 260), protagonistSignals) || input.chapter.goal.trim().length > 0,
      16,
      input.chapter.goal || "前 200 字里主角身份和目标不够明确。",
      "前 200 字内要让读者知道谁遇到了什么事，以及她此刻想保住什么。",
    ),
    item(
      "irreversible-crisis",
      "不可逆危机",
      includesAny(conflictText, crisisWords) && input.chapter.conflict.trim().length >= 8,
      includesAny(conflictText, crisisWords) || input.chapter.conflict.trim().length >= 8,
      18,
      input.chapter.conflict || "没有明确冲突。",
      "把危机写成不能撤回的损失：被发现、倒计时、任务失败惩罚、关系破裂或身体危险。",
    ),
    item(
      "choice-pressure",
      "选择压力",
      includesAny(conflictText, choiceWords),
      input.chapter.cliffhanger.includes("选择") || input.chapter.conflict.includes("选择"),
      16,
      input.chapter.conflict || input.chapter.cliffhanger || "选择压力不足。",
      "给主角两个都痛的选项，并写清不选会立刻失去什么。",
    ),
    item(
      "platform-fit",
      "平台适配",
      platformHits.length >= 2,
      platformHits.length > 0,
      16,
      platformHits.length > 0 ? `命中：${platformHits.join("；")}` : `未明显命中 ${input.platform.name} 开头规则。`,
      `按${input.platform.name}重写开头：${input.platform.openingRules.join("；")}。`,
    ),
    item(
      "opening-density",
      "信息密度",
      countWords(excerpt) >= 120 && countWords(excerpt) <= 900,
      countWords(excerpt) >= 40,
      16,
      `当前检测窗口 ${countWords(excerpt)} 字。`,
      "黄金三秒样章至少准备 300-800 字，让事件、选择、代价形成闭环。",
    ),
  ];

  if (input.startTactic) {
    items.push(item(
      "start-tactic-fit",
      "首轮打法适配",
      tacticHits.length >= 1,
      includesAny(platformText, crisisWords) || includesAny(platformText, choiceWords),
      10,
      tacticHits.length > 0 ? `命中：${tacticHits.join("、")}` : `首轮打法：${input.startTactic.openingMove}`,
      `按首轮平台打法重写第一屏：${input.startTactic.openingMove}`,
    ));
  }

  return items;
}

function verdict(score: number) {
  if (score >= 85) return "可以进入首章打磨，开头有明显追读力。";
  if (score >= 70) return "有钩子，但还需要压缩解释、抬高代价。";
  if (score >= 50) return "能看出故事方向，但前三秒抓力不足。";
  return "开头还没站住，先别投，重写第一屏。";
}

function buildRewritePlan(items: OpeningDiagnosticItem[], platform: PlatformProfile, startTactic?: ProjectStartTacticSummary | null) {
  const failed = items.filter((entry) => entry.status !== "pass");
  const experienceBlock = buildProjectStartExecutionPromptBlock(startTactic);
  return [
    startTactic ? `先执行首轮平台打法：${startTactic.openingMove}` : null,
    experienceBlock ? experienceBlock : null,
    failed[0]?.suggestion ?? "保留当前开局钩子，把主角选择和代价再写得更具体。",
    failed[1]?.suggestion ?? `继续贴合${platform.name}的审稿重点：${platform.reviewFocus.join("、")}。`,
    "把前 800 字改成：异常事件 -> 主角即时反应 -> 两难选择 -> 明确代价 -> 章末新问题。",
  ].filter((step): step is string => Boolean(step));
}

function buildMarkdown(input: OpeningDiagnosticInput, diagnostic: Omit<OpeningDiagnostic, "markdown">) {
  return [
    `# ${input.projectTitle} / ${input.chapter.title} 黄金三秒诊断`,
    "",
    `平台：${input.platform.name}`,
    input.startTactic ? `首轮打法：${input.startTactic.label}｜${input.startTactic.openingMove}` : null,
    `评分：${diagnostic.score}`,
    `结论：${diagnostic.verdict}`,
    "",
    "## 检测正文",
    diagnostic.excerpt || "正文为空。",
    "",
    "## 指标",
    ...diagnostic.items.map((entry) => (
      `- ${entry.label}｜${entry.status}｜${entry.score}：${entry.evidence}；建议：${entry.suggestion}`
    )),
    "",
    "## 修订顺序",
    ...diagnostic.rewritePlan.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].filter((line): line is string => line !== null).join("\n");
}

export function buildOpeningDiagnostic(input: OpeningDiagnosticInput): OpeningDiagnostic {
  const excerpt = openingExcerpt(input.chapter.content);
  const items = buildItems(input, excerpt);
  const score = Math.max(0, Math.min(100, items.reduce((sum, entry) => sum + entry.score, 0)));
  const diagnosticWithoutMarkdown = {
    score,
    verdict: verdict(score),
    excerpt,
    wordCount: countWords(excerpt),
    items,
    rewritePlan: buildRewritePlan(items, input.platform, input.startTactic),
    platformFocus: [
      ...input.platform.openingRules,
      ...input.platform.reviewFocus.slice(0, 3),
      ...(input.startTactic ? [`首轮打法：${input.startTactic.openingMove}`] : []),
      ...buildProjectStartExecutionPromptBlock(input.startTactic).split("\n").filter(Boolean),
    ],
  };

  return {
    ...diagnosticWithoutMarkdown,
    markdown: buildMarkdown(input, diagnosticWithoutMarkdown),
  };
}
