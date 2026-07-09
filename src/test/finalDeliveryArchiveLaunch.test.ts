import test from "node:test";
import assert from "node:assert/strict";
import {
  preferLaunchExperience,
  type FinalDeliveryArchiveLaunch,
} from "../lib/projects/finalDeliveryArchiveLaunch.ts";
import type { GatePlatformTacticExperienceItem } from "../lib/projects/gateActionReceipts.ts";

function experience(overrides: Partial<GatePlatformTacticExperienceItem> = {}): GatePlatformTacticExperienceItem {
  return {
    platformId: "fanqie",
    platformName: "番茄小说",
    status: "usable",
    label: "可复用打法",
    tactic: "首章强钩子复用",
    lesson: "番茄小说 已验证首章钩子、三章兑现和数据回填。",
    reuseHint: "新项目先复用首章钩子，再跑小样本。",
    risk: "不要直接放量。",
    href: "/gate#platform-tactic-experience",
    sourceStatus: "healthy",
    sourceLabel: "健康",
    priorityScore: 88,
    latestAt: "2026-07-09T00:00:00.000Z",
    evidence: ["效果回填：曝光 3000，点击 600。"],
    ...overrides,
  };
}

test("preferLaunchExperience promotes an exact historical tactic match", () => {
  const other = experience({ platformId: "qidian", platformName: "起点中文网", tactic: "长线主干打法" });
  const matched = experience({ tactic: "最终交付打法：归档书名" });
  const launch: FinalDeliveryArchiveLaunch = {
    platformId: "fanqie",
    tactic: "最终交付打法：归档书名",
    source: "final-delivery-archive",
  };

  const result = preferLaunchExperience([other, matched], launch);

  assert.equal(result[0], matched);
  assert.deepEqual(result.slice(1), [other]);
});

test("preferLaunchExperience leaves ordinary launches unchanged without exact matches", () => {
  const items = [experience()];
  const launch: FinalDeliveryArchiveLaunch = {
    platformId: "fanqie",
    tactic: "番茄小说最终交付打法：新项目",
    source: "usable",
  };

  const result = preferLaunchExperience(items, launch);

  assert.equal(result, items);
});

test("preferLaunchExperience creates a reusable final delivery archive experience without exact matches", () => {
  const items = [experience({ tactic: "旧经验" })];
  const launch: FinalDeliveryArchiveLaunch = {
    platformId: "qidian",
    tactic: "起点中文网最终交付打法：归档项目",
    source: "final-delivery-archive",
  };

  const result = preferLaunchExperience(items, launch);

  assert.notEqual(result, items);
  assert.equal(result.length, 2);
  assert.equal(result[0].platformId, "qidian");
  assert.equal(result[0].platformName, "起点中文网");
  assert.equal(result[0].status, "usable");
  assert.equal(result[0].sourceStatus, "healthy");
  assert.equal(result[0].tactic, "起点中文网最终交付打法：归档项目");
  assert.ok(result[0].label.includes("最终交付"));
  assert.ok(result[0].reuseHint.includes("首章小样本"));
  assert.ok(result[0].risk.includes("停手线"));
  assert.equal(result[1], items[0]);
});
