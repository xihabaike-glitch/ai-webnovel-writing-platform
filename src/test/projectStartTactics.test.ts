import test from "node:test";
import assert from "node:assert/strict";
import { buildModelRouteConfirmationReceipt } from "../lib/model-gateway/routeConfirmation.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { getPlatformWritingStyle } from "../lib/platforms/writingStyleTemplates.ts";
import type { GateBatchTacticEffectItem, GatePlatformTacticExperienceItem, PersistedGatePlatformDispatchTask } from "../lib/projects/gateActionReceipts.ts";
import {
  buildProjectStartPlatformExperienceGuide,
  buildProjectStartGateExperience,
  buildProjectStartModelRouteExperienceFromConfirmations,
  buildProjectStartModelRouteExperienceFromReceipts,
  buildProjectStartRiskGate,
  buildProjectStartTacticAdvice,
  buildProjectStartTacticWorldEntry,
  findProjectStartTacticSummary,
  parseProjectStartTacticSummary,
  selectProjectStartTacticEvidence,
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
      recoveryBatches: 0,
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

  await t.test("adds confirmed model routes to new project start advice", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const modelRoutes = buildProjectStartModelRouteExperienceFromReceipts([
      {
        id: "model-route:chapter_draft:2026-07-04T10:00:00.000Z",
        actionId: "model-route:chapter_draft:confirm",
        label: "正文初稿路由已确认",
        detail: "来源：系统建议；首选：DeepSeek · deepseek-chat；备用：Kimi · kimi-k2.6；推荐依据：历史样本 2 次；成本 $0.0000/次；依据：近 2 次样本成功率 100%。",
        href: "/settings/models",
        status: "succeeded",
        message: "已确认正文初稿模型路由。",
        executionType: "model_route",
        succeededCount: 1,
        failedCount: 0,
        taskId: null,
        platformId: "model-routing",
        platformName: "模型路由",
        recheck: {
          status: "ready",
          label: "复检模型路由",
          detail: "下一批任务后复看成功率、质量、成本和备用命中。",
          actionLabel: "查看模型设置",
        },
        createdAt: "2026-07-04T10:00:00.000Z",
      },
      {
        id: "model-route:chapter_review:2026-07-04T11:00:00.000Z",
        actionId: "model-route:chapter_review:confirm",
        label: "章节审稿路由已确认",
        detail: "来源：系统建议；首选：GPT · gpt-5-mini；备用：DeepSeek · deepseek-chat；推荐依据：历史样本 4 次；治理后复检 +30。",
        href: "/settings/models",
        status: "succeeded",
        message: "已确认章节审稿模型路由。",
        executionType: "model_route",
        succeededCount: 1,
        failedCount: 0,
        taskId: null,
        platformId: "model-routing",
        platformName: "模型路由",
        recheck: {
          status: "ready",
          label: "复检模型路由",
          detail: "下一批任务后复看成功率、质量、成本和备用命中。",
          actionLabel: "查看模型设置",
        },
        createdAt: "2026-07-04T11:00:00.000Z",
      },
    ]);

    const advice = buildProjectStartTacticAdvice({ platform, template, style, modelRoutes });

    assert.equal(modelRoutes.length, 2);
    assert.ok(advice.verificationMove.includes("模型路由复检"));
    assert.ok(advice.evidence.some((item) => item.includes("正文初稿首选 DeepSeek · deepseek-chat")));
    assert.ok(advice.evidence.some((item) => item.includes("治理后复检 +30")));
    assert.ok(advice.checklist.some((item) => item.includes("模型路线底座：正文初稿、章节审稿")));
  });

  await t.test("builds project start model route experience from backend confirmations", () => {
    const confirmations = [
      buildModelRouteConfirmationReceipt({
        taskType: "chapter_review",
        primaryProviderName: "GPT · gpt-5-mini",
        fallbackProviderName: "DeepSeek · deepseek-chat",
        source: "recommendation",
        recommendationExplanation: {
          headline: "推荐依据分解",
          items: [
            { id: "history", label: "历史样本", value: "4 次", detail: "成功率 100%。", tone: "positive" },
            { id: "governance_recheck", label: "治理后复检", value: "+30", detail: "当前路线获得加权保留。", tone: "positive" },
          ],
        },
        createdAt: "2026-07-04T11:00:00.000Z",
      }),
      buildModelRouteConfirmationReceipt({
        taskType: "chapter_draft",
        primaryProviderName: "DeepSeek · deepseek-chat",
        fallbackProviderName: "Kimi · kimi-k2.6",
        source: "recommendation",
        recommendationExplanation: {
          headline: "推荐依据分解",
          items: [
            { id: "history", label: "历史样本", value: "2 次", detail: "成功率 100%。", tone: "positive" },
            { id: "cost", label: "成本", value: "$0.0000/次", detail: "成本稳定。", tone: "neutral" },
          ],
        },
        createdAt: "2026-07-04T10:00:00.000Z",
      }),
    ];

    const modelRoutes = buildProjectStartModelRouteExperienceFromConfirmations(confirmations);

    assert.deepEqual(modelRoutes.map((route) => route.taskLabel), ["正文初稿", "章节审稿"]);
    assert.ok(modelRoutes[0].evidence.some((item) => item.includes("DeepSeek · deepseek-chat")));
    assert.ok(modelRoutes[1].evidence.some((item) => item.includes("治理后复检 +30")));
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
      recoveryBatches: 0,
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
      recoveryBatches: 0,
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

  await t.test("keeps the full platform matrix available for project creation", () => {
    const fanqieExperience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "watch",
      label: "观察样本",
      tactic: "验收标准修正打法",
      lesson: "返工链复盘发现验收标准不够硬。",
      reuseHint: "同类项目可复用这套验收收口流程。",
      risk: "缺复测前不能写成成功打法。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "复盘完成",
      priorityScore: 88,
      latestAt: "2026-01-18T00:00:00.000Z",
      evidence: ["复盘类型：验收标准修正"],
    };
    const webnovelExperience: GatePlatformTacticExperienceItem = {
      platformId: "webnovel",
      platformName: "WebNovel",
      status: "blocked",
      label: "避坑样本",
      tactic: "复盘止损样本",
      lesson: "返工链复盘已完成，结论是先暂停当前平台方向。",
      reuseHint: "同类项目遇到二轮以上投稿包返工时，先复用这条暂停条件。",
      risk: "没有写清恢复条件前，不要继续平台加码。",
      href: "/gate",
      sourceStatus: "blocked",
      sourceLabel: "复盘止损",
      priorityScore: 96,
      latestAt: "2026-01-18T00:10:00.000Z",
      evidence: ["复盘类型：平台方向暂停"],
    };

    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: projectTemplates.map((template) => getPlatformProfile(template.platformId)),
      experiences: [fanqieExperience, webnovelExperience],
      limit: projectTemplates.length,
    });

    assert.equal(guide.items.length, projectTemplates.length);
    assert.equal(guide.summary.watch, 1);
    assert.equal(guide.summary.avoid, 1);
    assert.ok(guide.summary.template >= 1);
    assert.equal(guide.items.find((item) => item.platformId === "fanqie")?.label, "验收观察");
    assert.equal(guide.items.find((item) => item.platformId === "webnovel")?.label, "复盘止损");
    assert.ok(guide.items.some((item) => item.status === "template"));
  });

  await t.test("requires confirmation before creating from avoidance platforms", () => {
    const avoidGate = buildProjectStartRiskGate({
      platformId: "qimao",
      platformName: "七猫小说",
      status: "avoid",
      label: "复盘止损",
      headline: "七猫小说 先暂停方向",
      detail: "历史返工复盘已经判定当前方向要止损。",
      priorityScore: 96,
      source: "experience",
      href: "/gate",
      evidence: ["复盘类型：平台方向暂停"],
    });
    const watchGate = buildProjectStartRiskGate({
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "watch",
      label: "验收观察",
      headline: "番茄小说 先补验收线",
      detail: "历史返工复盘暴露验收标准不硬。",
      priorityScore: 88,
      source: "experience",
      href: "/gate",
      evidence: ["复盘类型：验收标准修正"],
    });
    const recommendedGate = buildProjectStartRiskGate({
      platformId: "qidian",
      platformName: "起点中文网",
      status: "recommended",
      label: "历史可复用",
      headline: "起点中文网 优先参考",
      detail: "三轮稳定加码打法可作为新项目开书参考。",
      priorityScore: 92,
      source: "experience",
      href: "/gate",
      evidence: ["最终判定：稳定加码"],
    });

    assert.equal(avoidGate.level, "blocked");
    assert.equal(avoidGate.requiresConfirmation, true);
    assert.ok(avoidGate.detail.includes("恢复条件"));
    assert.ok(avoidGate.actionLabel.includes("确认"));
    assert.equal(watchGate.level, "watch");
    assert.equal(watchGate.requiresConfirmation, false);
    assert.ok(watchGate.detail.includes("首轮数据回收"));
    assert.equal(recommendedGate.level, "pass");
    assert.equal(recommendedGate.requiresConfirmation, false);
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

  await t.test("selects tactic evidence with the same priority as the platform guide", () => {
    const platform = getPlatformProfile("fanqie");
    const experience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "三轮稳定加码打法",
      lesson: "真实数据已经连续站住。",
      reuseHint: "新项目优先复用平台包装和前三章兑现。",
      risk: "仍要小步验证。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "稳定加码",
      priorityScore: 93,
      latestAt: "2026-01-18T00:00:00.000Z",
      evidence: ["最终判定：稳定加码。"],
    };
    const usableBatch: GateBatchTacticEffectItem = {
      id: "fanqie:fast-hook",
      status: "usable",
      label: "可复用打法",
      tacticTitle: "首轮平台打法：番茄小说",
      tacticLabel: "批量可复用",
      primaryTactic: "首章先给不可逆危机。",
      openingMove: "第一段给倒计时。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
      sampleBatches: 2,
      succeededTasks: 4,
      failedTasks: 0,
      successRatePercent: 100,
      averageQualityScore: 89,
      knownCostUsd: 0.03,
      recoveryBatches: 0,
      latestAt: "2026-01-02T00:00:00.000Z",
      evidence: ["执行推荐批次：成功 2，失败 0，质量 90"],
      nextAction: "可以进入新项目开书参考。",
    };
    const selection = selectProjectStartTacticEvidence({
      platform,
      experiences: [experience],
      batchEffects: [usableBatch],
    });

    assert.equal(selection.guideItem?.source, "experience");
    assert.equal(selection.experience?.tactic, "三轮稳定加码打法");
    assert.equal(selection.batchEffect, null);

    const blockedBatch: GateBatchTacticEffectItem = {
      ...usableBatch,
      status: "blocked",
      label: "避坑打法",
      tacticLabel: "批量避坑",
      failedTasks: 2,
      successRatePercent: 0,
      averageQualityScore: 68,
      nextAction: "先停用并复盘失败样本。",
    };
    const blockedSelection = selectProjectStartTacticEvidence({
      platform,
      experiences: [experience],
      batchEffects: [blockedBatch],
    });

    assert.equal(blockedSelection.guideItem?.source, "batch");
    assert.equal(blockedSelection.experience, null);
    assert.equal(blockedSelection.batchEffect?.status, "blocked");
  });

  await t.test("feeds evidence loop rechecks back into new project start advice", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const task: PersistedGatePlatformDispatchTask = {
      databaseId: "task-1",
      dispatchKey: "gate-evidence-loop:fanqie:2026-07-04",
      id: "gate-evidence-loop:fanqie:2026-07-04",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "watch",
      state: "completed",
      priorityScore: 88,
      ownerRole: "平台运营",
      title: "补齐番茄证据闭环",
      detail: "补平台包装、前三章兑现和复检证据。",
      dueLabel: "今日",
      actionLabel: "查看项目",
      href: "/projects/project-1",
      acceptanceCriteria: ["回填证据闭环复检"],
      evidence: ["证据闭环复检：53 -> 71 分，分数变好：继续观察"],
      sourceReceiptId: null,
      completionEvidence: "完成平台包装和前三章兑现复检。",
      reviewLatestAt: "2026-07-04T08:00:00.000Z",
      assignedAt: "2026-07-04T08:10:00.000Z",
      completedAt: "2026-07-04T09:00:00.000Z",
      createdAt: "2026-07-04T08:05:00.000Z",
      updatedAt: "2026-07-04T09:00:00.000Z",
    };

    const result = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: [],
      tasks: [task],
    });

    assert.equal(result.selection.experience?.status, "usable");
    assert.equal(result.selection.experience?.tactic, "证据闭环提分打法");
    assert.equal(result.advice.status, "history_usable");
    assert.equal(result.advice.label, "历史可复用");
    assert.ok(result.advice.title.includes("证据闭环提分打法"));
    assert.ok(result.advice.primaryTactic.includes("53 分提升到 71 分"));
    assert.ok(result.advice.evidence.some((item) => item.includes("分数变好")));
  });

  await t.test("feeds completed recheck review dispatches into new project start advice", () => {
    function reviewTask(input: {
      dispatchKey: string;
      platformId: "qimao" | "fanqie";
      platformName: string;
      stage: "pause_platform" | "watch";
      title: string;
      completionEvidence: string;
      completedAt: string;
      priorityScore: number;
      evidence: string[];
    }): PersistedGatePlatformDispatchTask {
      return {
        databaseId: `task-${input.platformId}-recheck-review`,
        dispatchKey: input.dispatchKey,
        id: input.dispatchKey,
        projectId: "project-1",
        platformId: input.platformId,
        platformName: input.platformName,
        stage: input.stage,
        state: "completed",
        priorityScore: input.priorityScore,
        ownerRole: "主编",
        title: input.title,
        detail: "返工链复盘派单。",
        dueLabel: "今天复盘",
        actionLabel: "查看复盘",
        href: "/dispatch",
        acceptanceCriteria: ["写清复盘结论和下一轮边界。"],
        evidence: input.evidence,
        sourceReceiptId: null,
        completionEvidence: input.completionEvidence,
        reviewLatestAt: input.completedAt,
        assignedAt: "2026-01-01T00:00:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const qimaoPlatform = getPlatformProfile("qimao");
    const qimaoResult = buildProjectStartGateExperience({
      platform: qimaoPlatform,
      template: getDefaultTemplateForPlatform(qimaoPlatform.id),
      style: getPlatformWritingStyle(qimaoPlatform.id),
      receipts: [],
      tasks: [
        reviewTask({
          dispatchKey: "recheck-review:direction_pause:submission-precheck-project-1-platform-risk:2",
          platformId: "qimao",
          platformName: "七猫小说",
          stage: "pause_platform",
          title: "七猫小说 · 平台方向先暂停",
          completionEvidence: "已暂停七猫加码，转回投稿包和前三章兑现重判。",
          completedAt: "2026-01-01T01:00:00.000Z",
          priorityScore: 96,
          evidence: ["返工链根：submission-precheck:project-1:platform-risk", "复盘建议：平台方向先暂停"],
        }),
      ],
    });

    assert.equal(qimaoResult.selection.guideItem?.label, "复盘止损");
    assert.equal(qimaoResult.selection.experience?.tactic, "复盘止损样本");
    assert.equal(qimaoResult.advice.status, "history_blocked");
    assert.equal(qimaoResult.advice.label, "复盘止损");
    assert.ok(qimaoResult.advice.title.includes("先不做主平台"));
    assert.ok(qimaoResult.advice.verificationMove.includes("不允许直接加码"));
    assert.ok(qimaoResult.advice.checklist.some((item) => item.includes("恢复条件")));

    const fanqiePlatform = getPlatformProfile("fanqie");
    const fanqieResult = buildProjectStartGateExperience({
      platform: fanqiePlatform,
      template: getDefaultTemplateForPlatform(fanqiePlatform.id),
      style: getPlatformWritingStyle(fanqiePlatform.id),
      receipts: [],
      tasks: [
        reviewTask({
          dispatchKey: "recheck-review:acceptance_mismatch:story-tree-project-1-chapter-1-chapter_draft-opening_ending:2",
          platformId: "fanqie",
          platformName: "番茄小说",
          stage: "watch",
          title: "番茄小说 · 验收标准先补清楚",
          completionEvidence: "已补通过线、不可接受项和下一轮只验证一个核心问题。",
          completedAt: "2026-01-01T02:00:00.000Z",
          priorityScore: 88,
          evidence: ["返工链根：story-tree:project-1:chapter-1:chapter_draft:opening_ending", "复盘建议：验收标准先补清楚"],
        }),
      ],
    });

    assert.equal(fanqieResult.selection.guideItem?.label, "验收观察");
    assert.equal(fanqieResult.selection.experience?.tactic, "验收标准修正打法");
    assert.equal(fanqieResult.advice.status, "history_watch");
    assert.equal(fanqieResult.advice.label, "验收观察");
    assert.ok(fanqieResult.advice.title.includes("先补验收标准"));
    assert.ok(fanqieResult.advice.verificationMove.includes("通过线"));
    assert.ok(fanqieResult.advice.checklist.some((item) => item.includes("不可接受项")));
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
