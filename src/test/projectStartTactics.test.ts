import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { getPlatformWritingStyle } from "../lib/platforms/writingStyleTemplates.ts";
import type { GatePlatformTacticExperienceItem } from "../lib/projects/gateActionReceipts.ts";
import { buildProjectStartTacticAdvice } from "../lib/projects/projectStartTactics.ts";
import { getDefaultTemplateForPlatform } from "../lib/projects/projectTemplates.ts";

test("buildProjectStartTacticAdvice", async (t) => {
  await t.test("uses template advice when no historical platform experience exists", () => {
    const platform = getPlatformProfile("qidian");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const advice = buildProjectStartTacticAdvice({ platform, template, style });

    assert.equal(advice.status, "template");
    assert.equal(advice.label, "模板推荐");
    assert.ok(advice.primaryTactic.includes("长线主干"));
    assert.ok(advice.checklist.some((item) => item.includes(template.positioning)));
    assert.equal(advice.evidence.length, 0);
  });

  await t.test("prefers reusable historical experience for the selected platform", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const experience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "修复后重验打法",
      lesson: "番茄小说 已完成修复、复测、重验和效果回填，可以作为同类平台的恢复模板。",
      reuseHint: "新项目可复用：先修标题简介标签和前三章兑现，再小步重验。",
      risk: "不要直接放量，先保留小步验证窗口。",
      href: "/gate",
      sourceStatus: "recovering",
      sourceLabel: "修复后恢复",
      priorityScore: 90,
      latestAt: "2026-01-17T00:00:00.000Z",
      evidence: ["重验已回填：曝光 3200，点击 640，收藏 220，追读 130。"],
    };
    const advice = buildProjectStartTacticAdvice({ platform, template, style, experience });

    assert.equal(advice.status, "history_usable");
    assert.equal(advice.label, "历史可复用");
    assert.ok(advice.title.includes("修复后重验打法"));
    assert.ok(advice.openingMove.includes("小步重验"));
    assert.ok(advice.evidence[0].includes("重验已回填"));
    assert.ok(advice.checklist.some((item) => item.includes("首屏钩子")));
  });
});
