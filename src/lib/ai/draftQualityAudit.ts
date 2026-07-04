import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { ProjectContextPack } from "../projects/projectContextPack.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import { getPlatformWritingStyle } from "../platforms/writingStyleTemplates.ts";
import { countWords } from "../text/wordCount.ts";
import { buildStoryTreeQualityAudit, type StoryTreeQualityAudit } from "./storyTreeQualityAudit.ts";

export interface DraftQualityChapterCard {
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
}

export interface DraftQualityIssue {
  severity: "low" | "medium" | "high";
  type: "hook" | "pacing" | "payoff" | "platform_fit" | "character" | "length";
  message: string;
  suggestion: string;
}

export interface DraftQualityAudit {
  score: number;
  issues: DraftQualityIssue[];
  summary: string;
  platformName: string;
  wordCount: number;
  shouldSecondPass: boolean;
  treeAudit: StoryTreeQualityAudit;
}

const crisisWords = ["倒计时", "系统", "死亡", "死", "血", "背叛", "选择", "任务", "秘密", "危机", "求救", "monster", "system", "death", "dead", "choice", "secret", "contract", "trial"];
const motionWords = ["冲", "砸", "推", "跑", "抓", "按", "问", "吼", "抬头", "转身", "选择", "必须", "but", "must", "ran", "grabbed", "opened", "choice"];
const endingWords = ["下一秒", "忽然", "门开", "刷新", "第二", "真相", "名单", "背面", "抬起头", "suddenly", "revealed", "opened", "message", "patch", "system says"];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function includesAny(value: string, words: string[]) {
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function firstSlice(text: string, length: number) {
  return compact(text).slice(0, length);
}

function lastSlice(text: string, length: number) {
  const compacted = compact(text);
  return compacted.slice(Math.max(0, compacted.length - length));
}

function issue(
  severity: DraftQualityIssue["severity"],
  type: DraftQualityIssue["type"],
  message: string,
  suggestion: string,
): DraftQualityIssue {
  return { severity, type, message, suggestion };
}

function cardText(card: DraftQualityChapterCard) {
  return [card.goal, card.hook, card.conflict, card.valueShift, card.cliffhanger].map(compact).join(" ");
}

export function buildDraftQualityAudit(input: {
  platform: PlatformProfile;
  chapter: DraftQualityChapterCard;
  content: string;
  targetWords?: number;
  projectContext?: ProjectContextPack | null;
  startTactic?: ProjectStartTacticSummary | null;
}): DraftQualityAudit {
  const style = getPlatformWritingStyle(input.platform.id);
  const content = compact(input.content);
  const opening = firstSlice(content, 260);
  const ending = lastSlice(content, 280);
  const sourceCard = cardText(input.chapter);
  const targetWords = input.targetWords ?? 1200;
  const wordCount = countWords(content);
  const issues: DraftQualityIssue[] = [];
  let score = 100;
  const treeAudit = buildStoryTreeQualityAudit({
    content,
    chapter: input.chapter,
    projectContext: input.projectContext,
    startTactic: input.startTactic,
  });

  if (!content) {
    return {
      score: 0,
      issues: [
        issue("high", "length", "正文为空。", "重新生成正文，或先补齐章节卡后再生成。"),
      ],
      summary: "自动体检发现正文为空，必须重跑初稿。",
      platformName: input.platform.name,
      wordCount,
      shouldSecondPass: true,
      treeAudit,
    };
  }

  if (wordCount < Math.max(300, targetWords * 0.45)) {
    score -= 18;
    issues.push(issue("high", "length", `正文只有 ${wordCount} 字，明显低于目标。`, "补足场景推进、冲突升级和章末追读，不要只写梗概。"));
  } else if (wordCount < targetWords * 0.7) {
    score -= 8;
    issues.push(issue("medium", "length", `正文 ${wordCount} 字，低于目标字数。`, "扩写中段阻力和主角选择，让正文更接近目标字数。"));
  }

  if (!includesAny(opening, crisisWords) && !includesAny(opening, input.platform.openingRules)) {
    score -= 18;
    issues.push(issue("high", "hook", "开头没有明显危机、异常或平台钩子。", `按${input.platform.name}首屏要求重写第一段：${style.openingHook}`));
  }

  if (input.chapter.hook && !content.includes(compact(input.chapter.hook).slice(0, 8))) {
    score -= 8;
    issues.push(issue("medium", "hook", "正文没有兑现章节卡里的开头钩子。", `把“${input.chapter.hook}”提前到第一屏，并让它立刻造成行动压力。`));
  }

  if (!includesAny(content, motionWords) || !includesAny(content, ["必须", "选择", "代价", "否则", "but", "must", "cost"])) {
    score -= 14;
    issues.push(issue("medium", "pacing", "中段冲突推进偏弱，缺少行动和选择压力。", "增加阻力、选择和代价，每 300-500 字推动一次局面变化。"));
  }

  const platformKeywords = [...style.mustHave, ...input.platform.genres, ...input.platform.reviewFocus];
  const platformHits = platformKeywords.filter((keyword) => content.toLowerCase().includes(keyword.toLowerCase()));
  if (platformHits.length === 0 && !includesAny(sourceCard, platformKeywords)) {
    score -= 12;
    issues.push(issue("medium", "platform_fit", `正文没有明显命中${input.platform.name}的读者期待。`, `至少强化一个平台承诺：${style.mustHave.join("、")}。`));
  }

  if (!includesAny(ending, endingWords) && input.chapter.cliffhanger && !ending.includes(compact(input.chapter.cliffhanger).slice(0, 8))) {
    score -= 16;
    issues.push(issue("high", "payoff", "章末没有形成清晰追读问题。", `结尾改成新麻烦、新奖励、新身份暴露或下一步行动：${style.endingBeat}`));
  }

  if (input.chapter.valueShift && !content.includes(compact(input.chapter.valueShift).slice(0, 6)) && !includesAny(content, ["意识到", "终于", "第一次", "不再", "from", "realized"])) {
    score -= 8;
    issues.push(issue("low", "character", "本章价值变化不够清楚。", `让主角明确从“${input.chapter.valueShift}”这条变化里跨过去。`));
  }

  if (treeAudit.shouldRewrite) {
    score -= treeAudit.score < 55 ? 14 : 8;
    issues.push(issue("medium", "pacing", `大树结构 ${treeAudit.score} 分：${treeAudit.label}。`, treeAudit.topActions[0] ?? "按大树结构补强主干、分支和人物弧光。"));
  }

  const normalizedScore = clampScore(score);
  const summary = issues.length
    ? `自动平台体检：${input.platform.name}适配度 ${normalizedScore} 分，大树结构 ${treeAudit.score} 分，优先处理${issues.slice(0, 2).map((item) => item.type).join("、")}问题。`
    : `自动平台体检：${input.platform.name}适配度 ${normalizedScore} 分，大树结构 ${treeAudit.score} 分，初稿可以进入人工精修或发布前审稿。`;

  return {
    score: normalizedScore,
    issues,
    summary,
    platformName: input.platform.name,
    wordCount,
    shouldSecondPass: normalizedScore < 85 || treeAudit.shouldRewrite || issues.some((item) => item.severity === "high"),
    treeAudit,
  };
}
