import { platformProfiles, type PlatformId } from "../platforms/platformProfiles.ts";
import type { GatePlatformTacticExperienceItem } from "./gateActionReceipts.ts";

export interface FinalDeliveryArchiveLaunch {
  platformId?: string;
  tactic?: string;
  source?: string;
}

export function launchPlatformId(input: FinalDeliveryArchiveLaunch | undefined): PlatformId | null {
  const platform = platformProfiles.find((profile) => profile.id === input?.platformId);
  return platform?.id ?? null;
}

function buildFinalDeliveryArchiveExperience(
  platformId: PlatformId,
  tactic: string,
): GatePlatformTacticExperienceItem {
  const platform = platformProfiles.find((profile) => profile.id === platformId) ?? platformProfiles[0];

  return {
    platformId: platform.id,
    platformName: platform.name,
    status: "usable",
    label: "最终交付归档打法",
    tactic,
    lesson: `${platform.name} 已完成最终交付归档，可作为下一本书开局打法土壤。`,
    reuseHint: "新项目可复用：先按归档平台模板跑首章小样本，再回填曝光、点击、收藏、追读或平台等价指标。",
    risk: "停手线：缺首章样本、缺人工采用、缺平台反馈或总闸门复检不过线时，不允许放量复用。",
    href: "/gate#pipeline-final-review",
    sourceStatus: "healthy",
    sourceLabel: "最终交付归档",
    priorityScore: 95,
    latestAt: "2026-07-09T00:00:00.000Z",
    evidence: [
      `归档来源：${platform.name} 最终交付打法。`,
      `复用打法：${tactic}`,
      "复用边界：首日只跑首章小样本，回填数据后再决定是否扩展。",
    ],
  };
}

export function preferLaunchExperience(
  items: GatePlatformTacticExperienceItem[],
  launch: FinalDeliveryArchiveLaunch | undefined,
) {
  const platformId = launchPlatformId(launch);
  const tactic = launch?.tactic?.trim();
  if (!platformId || !tactic) return items;

  const matched = items.find((item) => item.platformId === platformId && item.tactic === tactic);
  if (matched) return [matched, ...items.filter((item) => item !== matched)];

  if (launch?.source !== "final-delivery-archive") return items;

  return [buildFinalDeliveryArchiveExperience(platformId, tactic), ...items];
}
