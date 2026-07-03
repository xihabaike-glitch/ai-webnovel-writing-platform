import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { PlatformWritingStyleTemplate } from "../platforms/writingStyleTemplates.ts";
import type { GateBatchTacticEffectItem, GatePlatformTacticExperienceItem } from "./gateActionReceipts.ts";
import type { ProjectTemplate } from "./projectTemplates.ts";

export type ProjectStartTacticAdviceStatus = "history_blocked" | "history_watch" | "history_usable" | "template";

export interface ProjectStartTacticAdvice {
  status: ProjectStartTacticAdviceStatus;
  label: string;
  title: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
  evidence: string[];
  checklist: string[];
}

export interface ProjectStartTacticWorldEntry {
  type: "platform_soil";
  title: string;
  content: string;
}

export interface ProjectStartTacticSummary {
  title: string;
  label: string;
  primaryTactic: string;
  openingMove: string;
  verificationMove: string;
  risk: string;
}

export interface ProjectStartTacticEntryLike {
  type: string;
  title: string;
  content: string;
}

function defaultTacticForCategory(platform: PlatformProfile) {
  if (platform.category === "paid") return "先搭长线主干，再用前三章证明升级期待。";
  if (platform.category === "free") return "先抓首章钩子，再用前三章连续兑现爽点和情绪回报。";
  if (platform.category === "female") return "先立人物关系张力，再让每章推进情感或人物弧光。";
  if (platform.category === "short") return "第一段进矛盾，前千字建立付费期待，结尾回收反转。";
  return "先让海外读者读懂承诺，再用清晰节奏验证题材标签。";
}

function historyStatus(experience: GatePlatformTacticExperienceItem): ProjectStartTacticAdviceStatus {
  if (experience.status === "blocked") return "history_blocked";
  if (experience.status === "watch") return "history_watch";
  return "history_usable";
}

function historyLabel(experience: GatePlatformTacticExperienceItem) {
  if (experience.status === "blocked") return "历史避坑";
  if (experience.status === "watch") return "历史观察";
  return "历史可复用";
}

export function buildProjectStartTacticAdvice(input: {
  platform: PlatformProfile;
  template: ProjectTemplate;
  style: PlatformWritingStyleTemplate;
  experience?: GatePlatformTacticExperienceItem | null;
  batchEffect?: GateBatchTacticEffectItem | null;
}): ProjectStartTacticAdvice {
  const { platform, template, style, experience, batchEffect } = input;
  const firstThreeTitles = template.firstThree.map((chapter) => chapter.title).join(" / ");

  if (batchEffect) {
    const batchEvidence = [
      `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，质量 ${batchEffect.averageQualityScore ?? "缺"}`,
      `任务结果：成功 ${batchEffect.succeededTasks}，失败 ${batchEffect.failedTasks}，成本 $${batchEffect.knownCostUsd.toFixed(4)}`,
      ...batchEffect.evidence.slice(0, 2),
    ];

    if (batchEffect.status === "blocked") {
      return {
        status: "history_blocked",
        label: "批量避坑",
        title: `${platform.name}：避开已跑崩打法`,
        primaryTactic: `不要复用「${batchEffect.openingMove || batchEffect.primaryTactic}」。先回到平台模板打法，再重做钩子、节奏和前三章兑现。`,
        openingMove: `避开已验证失败开头：${batchEffect.openingMove || batchEffect.primaryTactic}；改用：${style.openingHook}`,
        verificationMove: "创建后只做小批验证，先看前三章审稿分、失败率和平台包装，不允许直接放量。",
        risk: batchEffect.nextAction,
        evidence: batchEvidence,
        checklist: [
          `模板前三章：${firstThreeTitles}`,
          `必须具备：${style.mustHave.join("、")}`,
          `避坑动作：不要复制 ${batchEffect.tacticLabel}`,
        ],
      };
    }

    return {
      status: batchEffect.status === "usable" ? "history_usable" : "history_watch",
      label: batchEffect.status === "usable" ? "批量可复用" : "批量观察",
      title: `${platform.name}：${batchEffect.tacticLabel} 批量复盘`,
      primaryTactic: batchEffect.primaryTactic,
      openingMove: batchEffect.openingMove || style.openingHook,
      verificationMove: `${batchEffect.verificationMove || "创建后跑前三章与批量审稿。"}；首批复盘继续看成功率、质量分和失败样本。`,
      risk: batchEffect.status === "usable" ? batchEffect.risk : batchEffect.nextAction,
      evidence: batchEvidence,
      checklist: [
        `批量状态：${batchEffect.label}`,
        `模板前三章：${firstThreeTitles}`,
        `必须具备：${style.mustHave.join("、")}`,
      ],
    };
  }

  if (experience) {
    return {
      status: historyStatus(experience),
      label: historyLabel(experience),
      title: `${platform.name}：${experience.tactic}`,
      primaryTactic: experience.lesson,
      openingMove: experience.status === "blocked"
        ? `先按避坑样本修正开头：${style.openingHook}`
        : experience.reuseHint,
      verificationMove: experience.status === "usable"
        ? "创建后先跑前三章和平台包装，再记录首轮曝光、点击、收藏、追读。"
        : "创建后只复用流程，不复用成功结论，必须等第一轮真实数据回填。",
      risk: experience.risk,
      evidence: experience.evidence,
      checklist: [
        `模板前三章：${firstThreeTitles}`,
        `首屏钩子：${style.firstScreen}`,
        `必须具备：${style.mustHave.join("、")}`,
      ],
    };
  }

  return {
    status: "template",
    label: "模板推荐",
    title: `${platform.name} 首轮开书打法`,
    primaryTactic: defaultTacticForCategory(platform),
    openingMove: style.openingHook,
    verificationMove: "创建后先完成前三章、人物弧光、世界规则和平台包装，再进入总闸复盘。",
    risk: platform.risks.join("；"),
    evidence: [],
    checklist: [
      `模板定位：${template.positioning}`,
      `模板前三章：${firstThreeTitles}`,
      `必须具备：${style.mustHave.join("、")}`,
    ],
  };
}

function trimLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildProjectStartTacticWorldEntry(
  advice: ProjectStartTacticAdvice,
  platformName: string,
): ProjectStartTacticWorldEntry {
  const evidence = advice.evidence.slice(0, 2).map((item) => `证据：${trimLine(item)}`);
  const checklist = advice.checklist.slice(0, 3).map((item) => `检查：${trimLine(item)}`);

  return {
    type: "platform_soil",
    title: `首轮平台打法：${platformName}`,
    content: [
      `状态：${advice.label}`,
      `打法：${trimLine(advice.primaryTactic)}`,
      `开头动作：${trimLine(advice.openingMove)}`,
      `验证动作：${trimLine(advice.verificationMove)}`,
      `风险：${trimLine(advice.risk)}`,
      ...checklist,
      ...evidence,
    ].join("\n"),
  };
}

function lineValue(lines: string[], prefix: string) {
  const line = lines.find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

export function parseProjectStartTacticSummary(entry: { title: string; content: string } | null | undefined): ProjectStartTacticSummary | null {
  if (!entry) return null;
  const lines = entry.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const label = lineValue(lines, "状态：");
  const primaryTactic = lineValue(lines, "打法：");
  const openingMove = lineValue(lines, "开头动作：");
  const verificationMove = lineValue(lines, "验证动作：");
  const risk = lineValue(lines, "风险：");

  if (!primaryTactic && !openingMove && !verificationMove) return null;

  return {
    title: entry.title,
    label: label || "首轮打法",
    primaryTactic,
    openingMove,
    verificationMove,
    risk,
  };
}

export function findProjectStartTacticSummary(entries: ProjectStartTacticEntryLike[]): ProjectStartTacticSummary | null {
  const entry = entries.find((item) => item.type === "platform_soil" && item.title.startsWith("首轮平台打法：")) ?? null;
  return parseProjectStartTacticSummary(entry);
}
