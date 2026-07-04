import type { ProjectContextPack } from "../projects/projectContextPack.ts";
import type { ProjectStartTacticSummary } from "../projects/projectStartTactics.ts";
import { countWords } from "../text/wordCount.ts";

export type StoryTreeQualityAxisId = "opening_ending" | "trunk_motion" | "branch_causality" | "leaf_soil" | "character_arc";
export type StoryTreeQualityStatus = "pass" | "watch" | "fail";

export interface StoryTreeQualityAxis {
  id: StoryTreeQualityAxisId;
  label: string;
  score: number;
  status: StoryTreeQualityStatus;
  evidence: string;
  suggestion: string;
}

export interface StoryTreeQualityAudit {
  score: number;
  label: string;
  summary: string;
  shouldRewrite: boolean;
  axes: StoryTreeQualityAxis[];
  topActions: string[];
}

export interface StoryTreeQualityChapterCard {
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift?: string | null;
  cliffhanger: string;
}

const hookWords = ["倒计时", "系统", "死亡", "背叛", "秘密", "危机", "求救", "选择", "任务", "trial", "system", "death", "secret", "choice"];
const endingWords = ["下一秒", "忽然", "刷新", "第二", "真相", "名单", "门开", "背面", "suddenly", "revealed", "message", "opened"];
const trunkWords = ["必须", "选择", "代价", "否则", "冲", "抓", "推", "追", "问", "拒绝", "反击", "but", "must", "cost", "choice"];
const branchWords = ["伏笔", "线索", "名单", "照片", "证据", "标记", "关系", "秘密", "真相", "thread", "clue", "mark", "proof"];
const soilWords = ["规则", "系统", "平台", "奖励", "惩罚", "禁忌", "世界", "组织", "土壤", "rule", "system", "reward", "penalty"];
const arcWords = ["意识到", "终于", "第一次", "不再", "决定", "承认", "害怕", "反过来", "realized", "decided", "no longer"];

function compact(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function phraseHit(text: string, phrase: string | null | undefined, length = 8) {
  const value = compact(phrase);
  return Boolean(value && text.includes(value.slice(0, Math.min(length, value.length))));
}

function statusFor(score: number): StoryTreeQualityStatus {
  if (score >= 80) return "pass";
  if (score >= 60) return "watch";
  return "fail";
}

function axis(
  id: StoryTreeQualityAxisId,
  label: string,
  score: number,
  evidence: string,
  suggestion: string,
): StoryTreeQualityAxis {
  const normalized = clampScore(score);
  return {
    id,
    label,
    score: normalized,
    status: statusFor(normalized),
    evidence,
    suggestion,
  };
}

function contextSignal(context: ProjectContextPack | null | undefined, blockId: string) {
  const block = context?.blocks.find((item) => item.id === blockId);
  if (!block) return { score: 0, label: "无上下文" };
  if (block.status === "pass") return { score: 12, label: "上下文可用" };
  if (block.status === "warn") return { score: 6, label: "上下文有缺口" };
  return { score: 0, label: "上下文缺失" };
}

export function buildStoryTreeQualityAudit(input: {
  content: string;
  chapter: StoryTreeQualityChapterCard;
  projectContext?: ProjectContextPack | null;
  startTactic?: ProjectStartTacticSummary | null;
}): StoryTreeQualityAudit {
  const content = compact(input.content);
  const wordCount = countWords(content);
  const opening = content.slice(0, 260);
  const ending = content.slice(Math.max(0, content.length - 280));

  if (!content) {
    return {
      score: 0,
      label: "结构缺失",
      summary: "大树质检：正文为空，开头、主干、分支、叶片和人物弧光都无法判断。",
      shouldRewrite: true,
      axes: [
        axis("opening_ending", "开头结尾", 0, "正文为空。", "重新生成正文，先定第一屏钩子和章末追读。"),
      ],
      topActions: ["重新生成正文，先定第一屏钩子和章末追读。"],
    };
  }

  const openingEndingScore = 30
    + (includesAny(opening, hookWords) || phraseHit(opening, input.chapter.hook) ? 35 : 0)
    + (includesAny(ending, endingWords) || phraseHit(ending, input.chapter.cliffhanger) ? 35 : 0);
  const trunkHits = trunkWords.filter((word) => content.toLowerCase().includes(word.toLowerCase())).length;
  const trunkScore = 35
    + Math.min(35, trunkHits * 7)
    + (wordCount >= 800 ? 15 : wordCount >= 400 ? 8 : 0)
    + (phraseHit(content, input.chapter.conflict, 6) ? 15 : 0);
  const branchContext = contextSignal(input.projectContext, "story_lines");
  const branchScore = 38
    + (includesAny(content, branchWords) ? 28 : 0)
    + (phraseHit(content, input.chapter.cliffhanger, 6) ? 12 : 0)
    + branchContext.score;
  const soilContext = contextSignal(input.projectContext, "world");
  const soilScore = 35
    + (includesAny(content, soilWords) ? 25 : 0)
    + (input.startTactic && includesAny(content, [input.startTactic.openingMove, input.startTactic.primaryTactic]) ? 14 : 0)
    + soilContext.score
    + (wordCount >= 600 ? 10 : 0);
  const characterContext = contextSignal(input.projectContext, "characters");
  const characterScore = 32
    + (includesAny(content, arcWords) ? 25 : 0)
    + (phraseHit(content, input.chapter.valueShift, 6) ? 18 : 0)
    + (includesAny(content, ["选择", "决定", "代价", "不再", "必须", "choice", "decided"]) ? 13 : 0)
    + characterContext.score;
  const axes = [
    axis(
      "opening_ending",
      "开头结尾",
      openingEndingScore,
      `开头${includesAny(opening, hookWords) || phraseHit(opening, input.chapter.hook) ? "有钩子" : "钩子弱"}，结尾${includesAny(ending, endingWords) || phraseHit(ending, input.chapter.cliffhanger) ? "有追读" : "追读弱"}。`,
      "先定第一屏危机和章末新问题，别让章节平开平收。",
    ),
    axis(
      "trunk_motion",
      "主干推进",
      trunkScore,
      `行动/选择词命中 ${trunkHits} 个，正文 ${wordCount} 字。`,
      "每 300-500 字推进一次目标、选择、冲突升级或价值变化。",
    ),
    axis(
      "branch_causality",
      "分支因果",
      branchScore,
      `${branchContext.label}，${includesAny(content, branchWords) ? "正文有线索/伏笔信号" : "正文缺少可追踪线索"}。`,
      "支线、关系和伏笔出现后，要立刻绑定主线压力或后续回收点。",
    ),
    axis(
      "leaf_soil",
      "叶片土壤",
      soilScore,
      `${soilContext.label}，${includesAny(content, soilWords) ? "正文有规则/世界土壤" : "正文缺少规则或平台土壤承托"}。`,
      "细节、情绪和世界规则只服务行动与选择，避免空铺设定。",
    ),
    axis(
      "character_arc",
      "人物弧光",
      characterScore,
      `${characterContext.label}，${includesAny(content, arcWords) || phraseHit(content, input.chapter.valueShift, 6) ? "人物变化可见" : "人物变化不清"}。`,
      "让主角在欲望、缺陷、需求之间做一个可见选择，并让结果改变局面。",
    ),
  ];
  const score = clampScore(axes.reduce((sum, item) => sum + item.score, 0) / axes.length);
  const weakAxes = axes.filter((item) => item.status !== "pass").sort((left, right) => left.score - right.score);
  const label = score >= 85 ? "结构可用" : score >= 70 ? "结构待精修" : score >= 55 ? "结构需二改" : "结构重写";
  const topActions = weakAxes.length
    ? weakAxes.slice(0, 3).map((item) => `${item.label}：${item.suggestion}`)
    : ["保留当前结构，进入平台发布前质检。"];

  return {
    score,
    label,
    summary: `大树质检：${label}，${score} 分；优先看${weakAxes.slice(0, 2).map((item) => item.label).join("、") || "发布细节"}。`,
    shouldRewrite: score < 75 || axes.some((item) => item.status === "fail"),
    axes,
    topActions,
  };
}
