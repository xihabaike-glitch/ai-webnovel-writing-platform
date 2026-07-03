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

export type ProjectStartPlatformExperienceStatus = "recommended" | "watch" | "avoid" | "template";

export interface ProjectStartPlatformExperienceItem {
  platformId: PlatformProfile["id"];
  platformName: string;
  status: ProjectStartPlatformExperienceStatus;
  label: string;
  headline: string;
  detail: string;
  priorityScore: number;
  source: "experience" | "batch" | "template";
  href: string;
  evidence: string[];
}

export interface ProjectStartPlatformExperienceGuide {
  summary: {
    total: number;
    recommended: number;
    watch: number;
    avoid: number;
    template: number;
  };
  nextActions: string[];
  items: ProjectStartPlatformExperienceItem[];
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

function batchEffectForPlatform(batchEffects: GateBatchTacticEffectItem[], platform: PlatformProfile) {
  return batchEffects.find((item) => item.tacticTitle.includes(platform.name)) ?? null;
}

export function buildProjectStartPlatformExperienceGuide(input: {
  platforms: PlatformProfile[];
  experiences?: GatePlatformTacticExperienceItem[];
  batchEffects?: GateBatchTacticEffectItem[];
  limit?: number;
}): ProjectStartPlatformExperienceGuide {
  const experiences = input.experiences ?? [];
  const batchEffects = input.batchEffects ?? [];
  const items = input.platforms.map((platform): ProjectStartPlatformExperienceItem => {
    const experience = experiences.find((item) => item.platformId === platform.id) ?? null;
    const batchEffect = batchEffectForPlatform(batchEffects, platform);

    if (batchEffect?.status === "blocked") {
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "avoid",
        label: "批量避坑",
        headline: `${platform.name} 暂不优先`,
        detail: `批量样本已经标记为 ${batchEffect.tacticLabel}，先避开「${batchEffect.openingMove || batchEffect.primaryTactic}」。`,
        priorityScore: 100 + batchEffect.failedTasks,
        source: "batch",
        href: "/gate",
        evidence: [
          `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，失败 ${batchEffect.failedTasks}`,
          ...batchEffect.evidence.slice(0, 2),
        ],
      };
    }

    if (experience?.status === "blocked") {
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "avoid",
        label: "历史避坑",
        headline: `${platform.name} 先别硬上`,
        detail: `${experience.tactic} 已经沉淀为避坑样本。${experience.reuseHint}`,
        priorityScore: experience.priorityScore,
        source: "experience",
        href: experience.href,
        evidence: experience.evidence.slice(0, 3),
      };
    }

    if (experience?.status === "usable") {
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "recommended",
        label: "历史可复用",
        headline: `${platform.name} 优先参考`,
        detail: `${experience.tactic} 可作为新项目开书参考。${experience.reuseHint}`,
        priorityScore: experience.priorityScore,
        source: "experience",
        href: experience.href,
        evidence: experience.evidence.slice(0, 3),
      };
    }

    if (batchEffect?.status === "usable") {
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "recommended",
        label: "批量可复用",
        headline: `${platform.name} 可复用批量打法`,
        detail: `${batchEffect.primaryTactic} ${batchEffect.nextAction}`,
        priorityScore: batchEffect.successRatePercent,
        source: "batch",
        href: "/gate",
        evidence: [
          `批量样本：${batchEffect.sampleBatches} 批，成功率 ${batchEffect.successRatePercent}%，质量 ${batchEffect.averageQualityScore ?? "缺"}`,
          ...batchEffect.evidence.slice(0, 2),
        ],
      };
    }

    if (experience?.status === "watch" || batchEffect?.status === "watch") {
      const source = experience?.status === "watch" ? experience : batchEffect;
      return {
        platformId: platform.id,
        platformName: platform.name,
        status: "watch",
        label: experience?.status === "watch" ? "历史观察" : "批量观察",
        headline: `${platform.name} 小样本观察`,
        detail: experience?.status === "watch"
          ? `${experience.tactic} 还不能写成成功打法。${experience.reuseHint}`
          : `${batchEffect?.tacticLabel ?? "批量样本"} 样本还薄，只能小批验证。`,
        priorityScore: experience?.status === "watch" ? experience.priorityScore : batchEffect?.successRatePercent ?? 40,
        source: experience?.status === "watch" ? "experience" : "batch",
        href: experience?.href ?? "/gate",
        evidence: experience?.evidence.slice(0, 3) ?? batchEffect?.evidence.slice(0, 3) ?? [],
      };
    }

    return {
      platformId: platform.id,
      platformName: platform.name,
      status: "template",
      label: "模板默认",
      headline: `${platform.name} 按模板开书`,
      detail: `${defaultTacticForCategory(platform)} 暂无历史样本，先走平台模板和小步验证。`,
      priorityScore: 20,
      source: "template",
      href: "/projects",
      evidence: [`平台风险：${platform.risks[0] ?? "按平台反馈继续校准。"}`],
    };
  });

  const statusWeight: Record<ProjectStartPlatformExperienceStatus, number> = {
    recommended: 0,
    watch: 1,
    template: 2,
    avoid: 3,
  };
  const sortedItems = items
    .sort((left, right) => {
      const statusDiff = statusWeight[left.status] - statusWeight[right.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = right.priorityScore - left.priorityScore;
      if (priorityDiff !== 0) return priorityDiff;
      return left.platformName.localeCompare(right.platformName);
    })
    .slice(0, input.limit ?? items.length);
  const recommended = sortedItems.filter((item) => item.status === "recommended").length;
  const watch = sortedItems.filter((item) => item.status === "watch").length;
  const avoid = sortedItems.filter((item) => item.status === "avoid").length;
  const template = sortedItems.filter((item) => item.status === "template").length;
  const firstRecommended = sortedItems.find((item) => item.status === "recommended");

  return {
    summary: {
      total: sortedItems.length,
      recommended,
      watch,
      avoid,
      template,
    },
    nextActions: [
      firstRecommended ? `优先参考 ${firstRecommended.platformName}：${firstRecommended.detail}` : null,
      watch > 0 ? `${watch} 个平台只有观察样本，新项目只能小步验证。` : null,
      avoid > 0 ? `${avoid} 个平台有避坑信号，开书前先改入口、题材或验证口径。` : null,
      recommended === 0 ? "暂无可复用平台样本，先按模板开书并保留首轮数据回收。" : null,
    ].filter((action): action is string => Boolean(action)),
    items: sortedItems,
  };
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
