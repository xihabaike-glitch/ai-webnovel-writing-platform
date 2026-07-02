import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { PlatformWritingStyleTemplate } from "../platforms/writingStyleTemplates.ts";
import type { GatePlatformTacticExperienceItem } from "./gateActionReceipts.ts";
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
}): ProjectStartTacticAdvice {
  const { platform, template, style, experience } = input;
  const firstThreeTitles = template.firstThree.map((chapter) => chapter.title).join(" / ");

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
