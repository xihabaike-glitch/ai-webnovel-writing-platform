import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { getPlatformWritingStyle } from "../platforms/writingStyleTemplates.ts";

export interface PlatformStyleChapterCard {
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
}

export interface PlatformStyleScoreItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  maxScore: number;
  evidence: string;
  suggestion: string;
}

export interface PlatformStyleScore {
  score: number;
  verdict: string;
  canGenerate: boolean;
  items: PlatformStyleScoreItem[];
  priorityFixes: string[];
  platformMustHave: string[];
}

const pressureWords = [
  "倒计时",
  "死亡",
  "死",
  "血",
  "系统",
  "背叛",
  "选择",
  "任务",
  "秘密",
  "真相",
  "契约",
  "重生",
  "危机",
  "monster",
  "system",
  "betrayal",
  "dead",
  "death",
  "choice",
  "secret",
  "contract",
  "trial",
  "debt",
];

const conflictWords = ["必须", "但", "却", "否则", "代价", "选择", "被迫", "输", "失去", "must", "but", "cost", "risk", "lose", "choose"];
const shiftWords = ["从", "到", "转向", "变成", "from", "to"];
const cliffhangerWords = ["第二", "新", "发现", "出现", "刷新", "背面", "抬起头", "名单", "reveal", "says", "arrives", "names", "opens", "belongs"];

const platformSignals: Record<PlatformProfile["category"], string[]> = {
  paid: ["升级", "体系", "世界", "规则", "势力", "宗门", "秘境", "progression", "faction"],
  free: ["系统", "倒计时", "反杀", "任务", "奖励", "重生", "选择"],
  female: ["关系", "情感", "秘密", "重逢", "误会", "婚", "家", "love", "relationship"],
  short: ["真相", "复仇", "反转", "证据", "骗", "死亡", "truth", "revenge"],
  overseas: ["system", "monster", "skill", "trial", "quest", "power", "contract", "reward", "debt"],
};

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function includesAny(value: string, words: string[]) {
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function itemStatus(score: number, maxScore: number): PlatformStyleScoreItem["status"] {
  if (score >= maxScore * 0.8) return "pass";
  if (score >= maxScore * 0.5) return "warn";
  return "fail";
}

function buildItem(
  id: string,
  label: string,
  score: number,
  maxScore: number,
  evidence: string,
  suggestion: string,
): PlatformStyleScoreItem {
  return {
    id,
    label,
    score: Math.min(maxScore, Math.max(0, score)),
    maxScore,
    status: itemStatus(score, maxScore),
    evidence,
    suggestion,
  };
}

function textLength(value: string) {
  return compact(value).length;
}

export function buildPlatformStyleScore(input: {
  platform: PlatformProfile;
  chapter: PlatformStyleChapterCard;
}): PlatformStyleScore {
  const style = getPlatformWritingStyle(input.platform.id);
  const chapter = {
    title: compact(input.chapter.title),
    goal: compact(input.chapter.goal),
    hook: compact(input.chapter.hook),
    conflict: compact(input.chapter.conflict),
    valueShift: compact(input.chapter.valueShift),
    cliffhanger: compact(input.chapter.cliffhanger),
  };
  const combined = Object.values(chapter).join(" ");
  const filledFields = [chapter.goal, chapter.hook, chapter.conflict, chapter.valueShift, chapter.cliffhanger]
    .filter((value) => value.length > 0).length;
  const completeScore = filledFields * 4;
  const hookScore = (chapter.hook ? 8 : 0)
    + (textLength(chapter.hook) >= 10 ? 4 : 0)
    + (includesAny(chapter.hook, pressureWords) ? 5 : 0)
    + (textLength(chapter.hook) >= 18 ? 3 : 0);
  const conflictScore = (chapter.conflict ? 6 : 0)
    + (textLength(chapter.conflict) >= 10 ? 4 : 0)
    + (includesAny(chapter.conflict, conflictWords) ? 5 : 0)
    + (textLength(chapter.conflict) >= 18 ? 3 : 0);
  const valueShiftScore = (chapter.valueShift ? 5 : 0)
    + (textLength(chapter.valueShift) >= 10 ? 4 : 0)
    + (includesAny(chapter.valueShift, shiftWords) ? 3 : 0)
    + (textLength(chapter.valueShift) >= 18 ? 2 : 0);
  const cliffhangerScore = (chapter.cliffhanger ? 6 : 0)
    + (textLength(chapter.cliffhanger) >= 10 ? 4 : 0)
    + (includesAny(chapter.cliffhanger, cliffhangerWords) ? 5 : 0)
    + (textLength(chapter.cliffhanger) >= 18 ? 3 : 0);
  const platformScore = includesAny(combined, platformSignals[input.platform.category])
    ? 10
    : filledFields === 5
      ? 6
      : 0;

  const items = [
    buildItem(
      "card-completeness",
      "章节卡完整度",
      completeScore,
      20,
      `已填写 ${filledFields}/5 个核心字段。`,
      "补齐章节目标、开头钩子、冲突、价值变化和章末悬念。",
    ),
    buildItem(
      "opening-hook",
      "首屏钩子",
      hookScore,
      20,
      chapter.hook || "开头钩子未填写。",
      `按${input.platform.name}写法，开头应做到：${style.openingHook}`,
    ),
    buildItem(
      "conflict-pressure",
      "冲突压力",
      conflictScore,
      18,
      chapter.conflict || "冲突未填写。",
      "写清楚主角被谁压迫、必须做什么选择、不做会失去什么。",
    ),
    buildItem(
      "value-shift",
      "价值变化",
      valueShiftScore,
      14,
      chapter.valueShift || "价值变化未填写。",
      "把本章从什么状态推到什么状态写出来，让剧情不是原地绕圈。",
    ),
    buildItem(
      "chapter-end",
      "章末悬念",
      cliffhangerScore,
      18,
      chapter.cliffhanger || "章末悬念未填写。",
      `章末应做到：${style.endingBeat}`,
    ),
    buildItem(
      "platform-fit",
      "平台风格命中",
      platformScore,
      10,
      platformScore >= 10 ? `命中${input.platform.name}关键期待。` : `暂未明显命中：${style.mustHave.join("、")}。`,
      `至少补一个平台关键词或场景承诺：${style.mustHave.join("、")}。`,
    ),
  ];

  const score = Math.round(items.reduce((sum, item) => sum + item.score, 0));
  const blockingItems = items.filter((item) => item.status === "fail");
  const priorityFixes = items
    .filter((item) => item.status !== "pass")
    .slice(0, 3)
    .map((item) => `${item.label}：${item.suggestion}`);
  const canGenerate = score >= 70 && blockingItems.length === 0;
  const verdict = canGenerate
    ? "章节卡已达到生成门槛，可以进入正文初稿。"
    : score >= 60
      ? "章节卡接近可生成，但还需要补强关键钩子或章末追读。"
      : "章节卡偏弱，先补强再生成正文。";

  return {
    score,
    verdict,
    canGenerate,
    items,
    priorityFixes,
    platformMustHave: style.mustHave,
  };
}
