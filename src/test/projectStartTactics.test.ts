import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { getPlatformWritingStyle } from "../lib/platforms/writingStyleTemplates.ts";
import type { GateBatchTacticEffectItem, GatePlatformTacticExperienceItem } from "../lib/projects/gateActionReceipts.ts";
import {
  buildProjectStartPlatformExperienceGuide,
  buildProjectStartTacticAdvice,
  buildProjectStartTacticWorldEntry,
  findProjectStartTacticSummary,
  parseProjectStartTacticSummary,
  selectProjectStartTemplateFromExperienceGuide,
} from "../lib/projects/projectStartTactics.ts";
import { getDefaultTemplateForPlatform, projectTemplates } from "../lib/projects/projectTemplates.ts";

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

  await t.test("prefers reusable batch tactic effects for new projects", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const batchEffect: GateBatchTacticEffectItem = {
      id: "fanqie:fast-hook",
      status: "usable",
      label: "可复用打法",
      tacticTitle: "首轮平台打法：番茄小说",
      tacticLabel: "批量可复用",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
      sampleBatches: 2,
      succeededTasks: 4,
      failedTasks: 0,
      successRatePercent: 100,
      averageQualityScore: 89,
      knownCostUsd: 0.03,
      latestAt: "2026-01-02T00:00:00.000Z",
      evidence: ["执行推荐批次：成功 2，失败 0，质量 90"],
      nextAction: "可以进入新项目开书参考。",
    };
    const advice = buildProjectStartTacticAdvice({ platform, template, style, batchEffect });

    assert.equal(advice.status, "history_usable");
    assert.equal(advice.label, "批量可复用");
    assert.ok(advice.openingMove.includes("身份暴露风险"));
    assert.ok(advice.evidence[0].includes("成功率 100%"));
  });

  await t.test("turns blocked batch tactic effects into avoidance advice", () => {
    const platform = getPlatformProfile("qimao");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const batchEffect: GateBatchTacticEffectItem = {
      id: "qimao:slow-open",
      status: "blocked",
      label: "避坑打法",
      tacticTitle: "首轮平台打法：七猫小说",
      tacticLabel: "批量避坑",
      primaryTactic: "慢铺关系再进冲突。",
      openingMove: "第一段慢慢铺关系。",
      verificationMove: "批量后复检前三章追读。",
      risk: "首屏太慢会掉读者。",
      sampleBatches: 1,
      succeededTasks: 0,
      failedTasks: 2,
      successRatePercent: 0,
      averageQualityScore: 68,
      knownCostUsd: 0.02,
      latestAt: "2026-01-03T00:00:00.000Z",
      evidence: ["执行推荐批次：成功 0，失败 2，质量 68"],
      nextAction: "先拆失败样本和低分原因，暂停把这套打法继续放进新批次。",
    };
    const advice = buildProjectStartTacticAdvice({ platform, template, style, batchEffect });

    assert.equal(advice.status, "history_blocked");
    assert.equal(advice.label, "批量避坑");
    assert.ok(advice.primaryTactic.includes("不要复用"));
    assert.ok(advice.openingMove.includes(style.openingHook));
    assert.ok(advice.evidence[1].includes("失败 2"));
  });

  await t.test("summarizes platform choices from final experience and batch avoidance", () => {
    const platforms = [getPlatformProfile("fanqie"), getPlatformProfile("qimao"), getPlatformProfile("webnovel")];
    const fanqieExperience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "三轮稳定加码打法",
      lesson: "三轮真实数据验证后可以进入稳定加码池。",
      reuseHint: "新项目可复用这套平台包装、前三章兑现和小步加码节奏，进入稳定加码池前仍要保留基准对照。",
      risk: "稳定加码不是无限放量。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "稳定加码",
      priorityScore: 96,
      latestAt: "2026-01-18T00:00:00.000Z",
      evidence: ["最终判定：稳定加码：三轮数据连续站住。"],
    };
    const webnovelExperience: GatePlatformTacticExperienceItem = {
      platformId: "webnovel",
      platformName: "WebNovel",
      status: "blocked",
      label: "避坑样本",
      tactic: "三轮归档暂停样本",
      lesson: "三轮后仍未形成有效转化。",
      reuseHint: "同类项目先复用暂停原因和避坑清单。",
      risk: "重启条件必须写清。",
      href: "/gate",
      sourceStatus: "blocked",
      sourceLabel: "归档暂停",
      priorityScore: 94,
      latestAt: "2026-01-18T00:10:00.000Z",
      evidence: ["最终判定：归档暂停：继续投入只会扩大损失。"],
    };
    const qimaoBatch: GateBatchTacticEffectItem = {
      id: "qimao:slow-open",
      status: "blocked",
      label: "避坑打法",
      tacticTitle: "首轮平台打法：七猫",
      tacticLabel: "批量避坑",
      primaryTactic: "慢铺关系再进冲突。",
      openingMove: "第一段慢慢铺关系。",
      verificationMove: "批量后复检前三章追读。",
      risk: "首屏太慢会掉读者。",
      sampleBatches: 1,
      succeededTasks: 0,
      failedTasks: 2,
      successRatePercent: 0,
      averageQualityScore: 68,
      knownCostUsd: 0.02,
      latestAt: "2026-01-03T00:00:00.000Z",
      evidence: ["执行推荐批次：成功 0，失败 2，质量 68"],
      nextAction: "先拆失败样本和低分原因。",
    };

    const guide = buildProjectStartPlatformExperienceGuide({
      platforms,
      experiences: [webnovelExperience, fanqieExperience],
      batchEffects: [qimaoBatch],
    });

    assert.equal(guide.summary.total, 3);
    assert.equal(guide.summary.recommended, 1);
    assert.equal(guide.summary.avoid, 2);
    assert.equal(guide.items[0].platformId, "fanqie");
    assert.equal(guide.items[0].status, "recommended");
    assert.ok(guide.items[0].detail.includes("稳定加码池"));
    assert.ok(guide.items[0].evidence[0].includes("最终判定"));
    assert.equal(guide.items.find((item) => item.platformId === "qimao")?.status, "avoid");
    assert.ok(guide.items.find((item) => item.platformId === "qimao")?.detail.includes("批量避坑"));
    assert.equal(guide.items.find((item) => item.platformId === "webnovel")?.status, "avoid");
    assert.ok(guide.nextActions.some((action) => action.includes("优先参考 番茄小说")));
    assert.ok(guide.nextActions.some((action) => action.includes("2 个平台有避坑信号")));
  });

  await t.test("selects a reusable platform template for new project defaults", () => {
    const fallbackTemplate = getDefaultTemplateForPlatform("qidian");
    const fanqieExperience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "首秀稳定加码打法",
      lesson: "首秀数据连续站住。",
      reuseHint: "新项目可复用首章高压钩子和前三章兑现节奏。",
      risk: "先小步验证，不要直接放量。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "稳定加码",
      priorityScore: 92,
      latestAt: "2026-01-18T00:00:00.000Z",
      evidence: ["最终判定：稳定加码。"],
    };
    const webnovelExperience: GatePlatformTacticExperienceItem = {
      platformId: "webnovel",
      platformName: "WebNovel",
      status: "blocked",
      label: "避坑样本",
      tactic: "海外转化暂停样本",
      lesson: "三轮仍未形成有效转化。",
      reuseHint: "同类项目先复用暂停原因。",
      risk: "重启条件必须写清。",
      href: "/gate",
      sourceStatus: "blocked",
      sourceLabel: "归档暂停",
      priorityScore: 98,
      latestAt: "2026-01-18T00:10:00.000Z",
      evidence: ["最终判定：归档暂停。"],
    };
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [getPlatformProfile("qidian"), getPlatformProfile("fanqie"), getPlatformProfile("webnovel")],
      experiences: [webnovelExperience, fanqieExperience],
    });

    const selected = selectProjectStartTemplateFromExperienceGuide({
      templates: projectTemplates,
      guide,
      fallbackTemplate,
    });

    assert.equal(selected.platformId, "fanqie");

    const avoidOnlyGuide = buildProjectStartPlatformExperienceGuide({
      platforms: [getPlatformProfile("qidian"), getPlatformProfile("webnovel")],
      experiences: [webnovelExperience],
    });

    const conservativeSelected = selectProjectStartTemplateFromExperienceGuide({
      templates: projectTemplates,
      guide: avoidOnlyGuide,
      fallbackTemplate,
    });

    assert.equal(conservativeSelected.id, fallbackTemplate.id);
  });

  await t.test("turns start advice into a reusable platform soil entry", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const advice = buildProjectStartTacticAdvice({ platform, template, style });
    const entry = buildProjectStartTacticWorldEntry(advice, platform.name);
    const summary = parseProjectStartTacticSummary(entry);

    assert.equal(entry.type, "platform_soil");
    assert.equal(entry.title, "首轮平台打法：番茄小说");
    assert.ok(entry.content.includes("状态：模板推荐"));
    assert.ok(entry.content.includes("开头动作："));
    assert.ok(entry.content.includes("验证动作："));
    assert.equal(summary?.label, "模板推荐");
    assert.ok(summary?.openingMove.includes("第一段"));
    assert.ok(summary?.verificationMove.includes("前三章"));
    assert.equal(findProjectStartTacticSummary([
      { type: "platform_soil", title: "普通平台土壤", content: "每章要有追读。" },
      entry,
    ])?.title, "首轮平台打法：番茄小说");
  });
});
