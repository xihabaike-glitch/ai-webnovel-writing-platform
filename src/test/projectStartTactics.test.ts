import test from "node:test";
import assert from "node:assert/strict";
import { buildModelRouteConfirmationReceipt } from "../lib/model-gateway/routeConfirmation.ts";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";
import { getPlatformWritingStyle } from "../lib/platforms/writingStyleTemplates.ts";
import { parseProjectStartExperienceHandoffDispatchRequest } from "../lib/projects/projectStartHandoffDispatchRequest.ts";
import {
  buildGateActionReceipt,
  buildGateDispatchCompletionReceipt,
  buildGatePlatformTacticExperienceFollowupDispatch,
  buildGatePublishEffectReceipt,
  type GateBatchTacticEffectItem,
  type GatePlatformTacticExperienceItem,
  type PersistedGatePlatformDispatchTask,
} from "../lib/projects/gateActionReceipts.ts";
import {
  buildProjectStartExperienceHandoff,
  buildProjectStartExperienceHandoffDispatchPackage,
  buildProjectStartExperienceDigest,
  buildProjectStartRecoveryHandoffPanel,
  buildProjectStartPlatformExperienceGuide,
  buildProjectStartGateExperience,
  buildProjectStartKnowledgeFeedbackExperiences,
  buildProjectStartModelRouteExperienceFromConfirmations,
  buildProjectStartModelRouteExperienceFromReceipts,
  buildProjectStartRiskGate,
  buildProjectStartSoilWorldEntries,
  buildProjectStartTacticAdvice,
  buildProjectStartTacticWorldEntry,
  findProjectStartTacticSummary,
  parseProjectStartTacticSummary,
  selectProjectStartTacticEvidence,
  selectProjectStartTemplateFromExperienceGuide,
} from "../lib/projects/projectStartTactics.ts";
import { getDefaultTemplateForPlatform, projectTemplates } from "../lib/projects/projectTemplates.ts";

test("buildProjectStartTacticAdvice", async (t) => {
  await t.test("keeps template-only platform guide in configured platform order", () => {
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: platformProfiles,
      limit: platformProfiles.length,
    });

    assert.deepEqual(
      guide.items.map((item) => item.platformId),
      platformProfiles.map((platform) => platform.id),
    );
  });

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

  await t.test("keeps recovery scale-up batch advice in watch mode until repeated", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const batchEffect: GateBatchTacticEffectItem = {
      id: "fanqie:recovery-hook",
      status: "watch",
      label: "恢复放量观察",
      tacticTitle: "首轮平台打法：番茄小说",
      tacticLabel: "恢复放量观察",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
      sampleBatches: 1,
      succeededTasks: 2,
      failedTasks: 0,
      successRatePercent: 100,
      averageQualityScore: 88,
      knownCostUsd: 0.02,
      recoveryBatches: 1,
      latestAt: "2026-01-02T00:00:00.000Z",
      evidence: ["沉淀批量初稿 2 个经验｜恢复放量：成功 2，失败 0，质量 88"],
      nextAction: "恢复放量样本还薄，至少再跑一轮稳定批次后，才允许写成新项目可复用打法。",
    };
    const advice = buildProjectStartTacticAdvice({ platform, template, style, batchEffect });
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      batchEffects: [batchEffect],
    });

    assert.equal(advice.status, "history_watch");
    assert.equal(advice.label, "恢复放量观察");
    assert.ok(advice.verificationMove.includes("新项目先小样本复验"));
    assert.ok(advice.risk.includes("至少再跑一轮"));
    assert.ok(advice.evidence.some((item) => item.includes("恢复放量：1 批")));
    assert.ok(advice.checklist.some((item) => item.includes("恢复放量：已验证 1 批")));
    assert.equal(guide.items[0]?.label, "恢复放量观察");
    assert.equal(guide.items[0]?.status, "watch");
    assert.ok(guide.items[0]?.detail.includes("解除闸门"));
  });

  await t.test("surfaces repeated recovery scale-up as a cautious reusable tactic", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const batchEffect: GateBatchTacticEffectItem = {
      id: "fanqie:recovery-hook",
      status: "usable",
      label: "恢复放量打法",
      tacticTitle: "首轮平台打法：番茄小说",
      tacticLabel: "恢复放量打法",
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
      recoveryBatches: 2,
      latestAt: "2026-01-03T00:00:00.000Z",
      evidence: ["沉淀批量初稿 2 个经验｜恢复放量：成功 2，失败 0，质量 90"],
      nextAction: "恢复放量已经连续稳定，可作为观察平台解除闸门后的参考打法，但新项目仍先跑小样本。",
    };
    const advice = buildProjectStartTacticAdvice({ platform, template, style, batchEffect });
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      batchEffects: [batchEffect],
    });

    assert.equal(advice.status, "history_usable");
    assert.equal(advice.label, "恢复放量打法");
    assert.ok(advice.risk.includes("新项目仍先跑小样本"));
    assert.ok(advice.evidence.some((item) => item.includes("恢复放量：2 批")));
    assert.ok(advice.checklist.some((item) => item.includes("不直接批量生成前三章")));
    assert.equal(guide.items[0]?.status, "recommended");
    assert.equal(guide.items[0]?.label, "恢复放量打法");
    assert.ok(guide.items[0]?.detail.includes("新项目仍先跑小样本"));
  });

  await t.test("carries repeated recovery scale-up into gate experience for first-three starts", () => {
    const platform = getPlatformProfile("fanqie");
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "批量可复用",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读。",
      risk: "解释过多会掉首秀。",
    };
    const action = {
      id: "recommended-batch:standard:draft:project-1",
      label: "沉淀批量初稿经验",
      detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
      href: "/projects/project-1#ai-pipeline",
      tone: "primary" as const,
      execution: { type: "recommended_batch" as const, strategyId: "standard" as const },
    };
    const receipts = [
      buildGateActionReceipt({
        action,
        status: "succeeded",
        now: "2026-01-01T00:00:00.000Z",
        payload: {
          results: [{ status: "succeeded", taskId: "task-1" }],
          routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88 },
          plan: { strategyBases: [tactic], scaleGate: "cleared", actionLabel: "批量初稿 2 个", category: "draft" },
          batchReceipt: { status: "continue", headline: "准放量批次稳定，下一批仍小步走" },
        },
      }),
      buildGateActionReceipt({
        action,
        status: "succeeded",
        now: "2026-01-02T00:00:00.000Z",
        payload: {
          results: [{ status: "succeeded", taskId: "task-2" }],
          routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.02, averageQualityScore: 90 },
          plan: { strategyBases: [tactic], scaleGate: "cleared", actionLabel: "批量初稿 2 个", category: "draft" },
          batchReceipt: { status: "continue", headline: "准放量批次稳定，下一批仍小步走" },
        },
      }),
    ];

    const result = buildProjectStartGateExperience({
      platform,
      template: getDefaultTemplateForPlatform(platform.id),
      style: getPlatformWritingStyle(platform.id),
      receipts,
    });

    assert.equal(result.advice.label, "恢复放量打法");
    assert.equal(result.selection.batchEffect?.recoveryBatches, 2);
    assert.ok(result.experiences.some((item) => item.tactic === "恢复放量打法"));
    assert.ok(result.advice.verificationMove.includes("新项目先小样本复验"));
  });

  await t.test("turns platform knowledge feedback receipts into project start experience", () => {
    const experiences = buildProjectStartKnowledgeFeedbackExperiences([
      {
        id: "platform-knowledge:project-1:fanqie:publish_effect:metric-1",
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        actionLabel: "执行正反馈链",
        title: "番茄小说 正反馈经验已沉淀",
        message: "点击和追读变好，正反馈经验已经进入生成链路。",
        completedStepLabel: "发布效果正反馈",
        stopReason: "可复用信号：强钩子标题",
        nextAction: "复盘平台策略排序",
        href: "#platform-strategy-ranking",
        severity: "success",
        createdAt: "2026-07-05T10:00:00.000Z",
      },
      {
        id: "platform-knowledge:project-2:qimao:publish_effect:metric-2",
        projectId: "project-2",
        platformId: "qimao",
        platformName: "七猫",
        actionLabel: "执行避坑链",
        title: "七猫 避坑经验待执行",
        message: "负反馈提示七猫首屏太慢。",
        completedStepLabel: "发布效果负反馈",
        stopReason: "避坑信号：慢铺关系",
        nextAction: "先修标题和前三章钩子",
        href: "#first-three-rewrite",
        severity: "needs_action",
        createdAt: "2026-07-05T11:00:00.000Z",
      },
    ]);

    const fanqie = experiences.find((item) => item.platformId === "fanqie");
    const qimao = experiences.find((item) => item.platformId === "qimao");

    assert.equal(fanqie?.status, "usable");
    assert.equal(fanqie?.tactic, "发布效果正反馈打法");
    assert.ok(fanqie?.evidence.some((item) => item.includes("正反馈链")));
    assert.equal(qimao?.status, "blocked");
    assert.equal(qimao?.tactic, "发布效果避坑样本");
    assert.ok(qimao?.risk.includes("慢铺关系"));
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
    assert.equal(guide.items[0].label, "三轮稳住");
    assert.ok(guide.items[0].headline.includes("三轮已站住"));
    assert.ok(guide.items[0].detail.includes("稳定加码池"));
    assert.ok(guide.items[0].evidence[0].includes("最终判定"));
    assert.equal(guide.items.find((item) => item.platformId === "qimao")?.status, "avoid");
    assert.equal(guide.items.find((item) => item.platformId === "qimao")?.label, "批量避坑");
    assert.ok(guide.items.find((item) => item.platformId === "qimao")?.detail.includes("批量避坑"));
    assert.equal(guide.items.find((item) => item.platformId === "webnovel")?.status, "avoid");
    assert.equal(guide.items.find((item) => item.platformId === "webnovel")?.label, "三轮暂停");
    assert.ok(guide.nextActions.some((action) => action.includes("优先参考 番茄小说")));
    assert.ok(guide.nextActions.some((action) => action.includes("2 个平台有避坑信号")));
  });

  await t.test("turns third-round downgrade and pivot outcomes into strict start gates", () => {
    const qimao = getPlatformProfile("qimao");
    const royalRoad = getPlatformProfile("royal_road");
    const qimaoTemplate = getDefaultTemplateForPlatform(qimao.id);
    const royalRoadTemplate = getDefaultTemplateForPlatform(royalRoad.id);
    const qimaoExperience: GatePlatformTacticExperienceItem = {
      platformId: "qimao",
      platformName: "七猫小说",
      status: "watch",
      label: "观察样本",
      tactic: "三轮降档修复打法",
      lesson: "三轮数据没有崩，但稳定性不足，只能降档修复。",
      reuseHint: "同类项目只复用收紧投入、复检发布包和前三章兑现的流程。",
      risk: "修复后必须再看新一轮效果。",
      href: "/gate",
      sourceStatus: "rechecking",
      sourceLabel: "降档修复",
      priorityScore: 89,
      latestAt: "2026-01-18T00:00:00.000Z",
      evidence: ["最终判定：降档修复。"],
    };
    const royalRoadExperience: GatePlatformTacticExperienceItem = {
      platformId: "royal_road",
      platformName: "Royal Road",
      status: "blocked",
      label: "避坑样本",
      tactic: "三轮换平台样本",
      lesson: "三轮后平台匹配仍弱。",
      reuseHint: "同类项目优先复用平台转向条件和新平台验证清单。",
      risk: "未完成新平台小样本验证前，不要把旧平台失败包装成题材失败。",
      href: "/gate",
      sourceStatus: "blocked",
      sourceLabel: "换平台",
      priorityScore: 91,
      latestAt: "2026-01-18T00:10:00.000Z",
      evidence: ["最终判定：换平台。"],
    };

    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [qimao, royalRoad],
      experiences: [qimaoExperience, royalRoadExperience],
    });
    const qimaoAdvice = buildProjectStartTacticAdvice({
      platform: qimao,
      template: qimaoTemplate,
      style: getPlatformWritingStyle(qimao.id),
      experience: qimaoExperience,
    });
    const royalRoadAdvice = buildProjectStartTacticAdvice({
      platform: royalRoad,
      template: royalRoadTemplate,
      style: getPlatformWritingStyle(royalRoad.id),
      experience: royalRoadExperience,
    });

    assert.equal(guide.items.find((item) => item.platformId === "qimao")?.label, "三轮降档");
    assert.ok(guide.items.find((item) => item.platformId === "qimao")?.detail.includes("直接加码"));
    assert.equal(qimaoAdvice.label, "三轮降档");
    assert.ok(qimaoAdvice.verificationMove.includes("不允许直接进入稳定加码"));
    assert.equal(guide.items.find((item) => item.platformId === "royal_road")?.label, "三轮换平台");
    assert.ok(guide.items.find((item) => item.platformId === "royal_road")?.detail.includes("旧平台失败"));
    assert.equal(royalRoadAdvice.label, "三轮换平台");
    assert.ok(royalRoadAdvice.primaryTactic.includes("别把旧平台失败直接判成题材失败"));
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

  await t.test("routes dispatch completion experience into effect-gated start advice", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const completionExperience: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "watch",
      label: "待效果经验",
      tactic: "派单验收打法",
      lesson: "番茄小说 已经形成派单完成业务回执，说明验收口径可复用，但还需要发布效果证明业务改善。",
      reuseHint: "同类项目可以复用这次完成依据模板和验收标准，下一步必须补曝光、点击、收藏、追读。",
      risk: "派单完成只证明动作做完，不证明平台增长有效；缺效果前不要写成成功打法。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "派单完成回执",
      priorityScore: 82,
      latestAt: "2026-01-20T00:00:00.000Z",
      evidence: ["完成回执：已验收发布包定稿。"],
    };
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      experiences: [completionExperience],
    });
    const advice = buildProjectStartTacticAdvice({
      platform,
      template,
      style,
      experience: completionExperience,
    });

    assert.equal(guide.items[0]?.label, "验收待效果");
    assert.ok(guide.items[0]?.detail.includes("缺真实效果证明"));
    assert.equal(advice.status, "history_watch");
    assert.equal(advice.label, "验收待效果");
    assert.ok(advice.title.includes("不复用成功结论"));
    assert.ok(advice.verificationMove.includes("曝光、点击、收藏、追读"));
    assert.ok(advice.checklist.some((item) => item.includes("不复用成功结论")));
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
      tactic: "三轮稳定加码打法",
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
      tactic: "三轮归档暂停样本",
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

  await t.test("builds a start handoff that can switch away from avoidance platforms", () => {
    const selectedPlatform = getPlatformProfile("webnovel");
    const selectedTemplate = getDefaultTemplateForPlatform(selectedPlatform.id);
    const fanqieTemplate = getDefaultTemplateForPlatform("fanqie");
    const style = getPlatformWritingStyle(selectedPlatform.id);
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
      tactic: "三轮归档暂停样本",
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
      platforms: [getPlatformProfile("fanqie"), selectedPlatform],
      experiences: [fanqieExperience, webnovelExperience],
    });
    const guideItem = guide.items.find((item) => item.platformId === selectedPlatform.id) ?? null;
    const riskGate = buildProjectStartRiskGate(guideItem);
    const advice = buildProjectStartTacticAdvice({
      platform: selectedPlatform,
      template: selectedTemplate,
      style,
      experience: webnovelExperience,
    });
    const handoff = buildProjectStartExperienceHandoff({
      platform: selectedPlatform,
      template: selectedTemplate,
      guide,
      advice,
      riskGate,
      recommendedTemplate: fanqieTemplate,
    });

    assert.equal(handoff.status, "blocked");
    assert.equal(advice.label, "三轮暂停");
    assert.equal(handoff.label, "三轮避坑交接");
    assert.equal(handoff.shouldSwitchTemplate, true);
    assert.equal(handoff.recommendedPlatformId, "fanqie");
    assert.equal(handoff.recommendedTemplateId, fanqieTemplate.id);
    assert.ok(handoff.detail.includes("番茄小说"));
    assert.ok(handoff.firstDayActions.some((action) => action.includes("恢复条件")));
    assert.ok(handoff.avoidRules.some((rule) => rule.includes("不要直接复用")));
    assert.ok(handoff.evidence.some((item) => item.includes("归档暂停")));
  });

  await t.test("builds a reusable start handoff for recommended platforms", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
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
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      experiences: [experience],
    });
    const guideItem = guide.items[0] ?? null;
    const riskGate = buildProjectStartRiskGate(guideItem);
    const advice = buildProjectStartTacticAdvice({ platform, template, style, experience });
    const handoff = buildProjectStartExperienceHandoff({
      platform,
      template,
      guide,
      advice,
      riskGate,
      recommendedTemplate: template,
    });

    assert.equal(handoff.status, "reuse");
    assert.equal(guideItem?.label, "三轮稳住");
    assert.equal(advice.label, "三轮稳住");
    assert.equal(handoff.label, "三轮复用交接");
    assert.ok(handoff.title.includes("三轮站住"));
    assert.equal(handoff.shouldSwitchTemplate, false);
    assert.equal(handoff.recommendedPlatformId, "fanqie");
    assert.ok(handoff.firstDayActions.some((action) => action.includes("三轮复用")));
    assert.ok(handoff.firstDayActions.some((action) => action.includes("开头")));
    assert.ok(handoff.firstDayActions.some((action) => action.includes("回填")));
    assert.ok(handoff.evidence.some((item) => item.includes("稳定加码")));
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

  await t.test("feeds dispatch completion effect success into new project start advice", () => {
    const platform = getPlatformProfile("fanqie");
    const dispatch = {
      id: "submission-decision:fanqie:publish-finalize",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_publish_finalize" as const,
      state: "completed" as const,
      priorityScore: 92,
      ownerRole: "平台编辑",
      title: "番茄小说 发布包定稿",
      detail: "完成发布包验收。",
      dueLabel: "今日",
      actionLabel: "复检发布包",
      href: "/projects/project-1#platform-export",
      acceptanceCriteria: ["标题、简介、标签和前三章样章已完成验收。"],
      evidence: ["标题：夜雨系统：倒计时重生", "标签：系统、重生、强爽点"],
      reviewLatestAt: "2026-07-04T08:00:00.000Z",
    };
    const completionEvidence = [
      "番茄小说 发布包定稿",
      "标题：夜雨系统：倒计时重生",
      "简介：第一章直接给冲突和反转",
      "标签：系统、重生、强爽点",
      "结论：可发布",
    ].join("\n");
    const completionReceipt = buildGateDispatchCompletionReceipt({
      dispatch,
      completionEvidence,
      now: "2026-07-04T09:00:00.000Z",
    });
    const effectReceipt = buildGatePublishEffectReceipt({
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      now: "2026-07-05T09:00:00.000Z",
      metric: {
        views: 1200,
        clicks: 180,
        favorites: 72,
        follows: 36,
        snapshotDate: "2026-07-05T00:00:00.000Z",
      },
    });
    const result = buildProjectStartGateExperience({
      platform,
      template: getDefaultTemplateForPlatform(platform.id),
      style: getPlatformWritingStyle(platform.id),
      receipts: [completionReceipt, effectReceipt],
    });

    assert.equal(result.selection.experience?.status, "usable");
    assert.equal(result.selection.experience?.tactic, "验收后真实效果打法");
    assert.equal(result.advice.status, "history_usable");
    assert.equal(result.advice.label, "历史可复用");
    assert.ok(result.advice.primaryTactic.includes("点击率 15%"));
    assert.ok(result.advice.openingMove.includes("标题卖点"));
    assert.ok(result.advice.evidence.some((item) => item.includes("效果回填")));
  });

  await t.test("feeds platform knowledge feedback into new project start advice", () => {
    const platform = getPlatformProfile("fanqie");
    const result = buildProjectStartGateExperience({
      platform,
      template: getDefaultTemplateForPlatform(platform.id),
      style: getPlatformWritingStyle(platform.id),
      receipts: [],
      knowledgeFeedbackReceipts: [{
        id: "platform-knowledge:project-1:fanqie:publish_effect:metric-1",
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        actionLabel: "执行正反馈链",
        title: "番茄小说 正反馈经验已沉淀",
        message: "点击和追读变好，正反馈经验已经进入生成链路。",
        completedStepLabel: "发布效果正反馈",
        stopReason: "可复用信号：强钩子标题",
        nextAction: "复盘平台策略排序",
        href: "#platform-strategy-ranking",
        severity: "success",
        createdAt: "2026-07-05T10:00:00.000Z",
      }],
    });

    assert.equal(result.selection.experience?.tactic, "发布效果正反馈打法");
    assert.equal(result.selection.guideItem?.status, "recommended");
    assert.equal(result.advice.status, "history_usable");
    assert.ok(result.advice.primaryTactic.includes("点击和追读变好"));
    assert.ok(result.advice.openingMove.includes("复盘平台策略排序"));
    assert.ok(result.advice.evidence.some((item) => item.includes("发布效果正反馈")));
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

  await t.test("prioritizes completed first-day handoff experience for new project starts", () => {
    function handoffTask(input: {
      suffix: "opening" | "verification" | "platform-package";
      stage: "start_opening_diagnostic" | "start_first_three_review" | "start_platform_package";
      completionEvidence: string;
      completedAt: string;
    }): PersistedGatePlatformDispatchTask {
      return {
        databaseId: `task-fanqie-first-day-${input.suffix}`,
        dispatchKey: `first-day-handoff:project-1:${input.suffix}`,
        id: `first-day-handoff:project-1:${input.suffix}`,
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        stage: input.stage,
        state: "completed",
        priorityScore: 90,
        ownerRole: "主编",
        title: "番茄小说 新书开局交接",
        detail: "把平台打法库经验交接到新书第一天流程。",
        dueLabel: "今天",
        actionLabel: "查看交接",
        href: "/projects/project-1#first-day-launch",
        acceptanceCriteria: ["交接证据已写清", "下一步验收口径已明确"],
        evidence: ["经验来源：番茄强钩子打法", "目标：新书第一天开局"],
        sourceReceiptId: null,
        completionEvidence: input.completionEvidence,
        reviewLatestAt: input.completedAt,
        assignedAt: "2026-01-01T00:00:00.000Z",
        completedAt: input.completedAt,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: input.completedAt,
      };
    }

    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const result = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: [],
      tasks: [
        handoffTask({
          suffix: "opening",
          stage: "start_opening_diagnostic",
          completionEvidence: "已锁定前三段钩子、读者承诺和第一章冲突升级。",
          completedAt: "2026-01-01T01:00:00.000Z",
        }),
        handoffTask({
          suffix: "verification",
          stage: "start_first_three_review",
          completionEvidence: "已写清通过线、不可接受项和复查证据格式。",
          completedAt: "2026-01-01T02:00:00.000Z",
        }),
        handoffTask({
          suffix: "platform-package",
          stage: "start_platform_package",
          completionEvidence: "已把避坑边界回收到标题、简介、标签和卖点包装。",
          completedAt: "2026-01-01T03:00:00.000Z",
        }),
      ],
    });
    const ordinaryUsable: GatePlatformTacticExperienceItem = {
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "三轮稳定加码打法",
      lesson: "三轮真实数据验证后可以进入稳定加码池。",
      reuseHint: "新项目可复用平台包装和小步加码节奏。",
      risk: "仍要回填真实效果。",
      href: "/gate",
      sourceStatus: "healthy",
      sourceLabel: "稳定加码",
      priorityScore: 99,
      latestAt: "2026-01-05T00:00:00.000Z",
      evidence: ["最终判定：稳定加码。"],
    };
    const selection = selectProjectStartTacticEvidence({
      platform,
      experiences: [ordinaryUsable, ...result.experiences],
    });
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      experiences: [ordinaryUsable, ...result.experiences],
    });
    const riskGate = buildProjectStartRiskGate(guide.items[0] ?? null);
    const handoff = buildProjectStartExperienceHandoff({
      platform,
      template,
      guide,
      advice: result.advice,
      riskGate,
      recommendedTemplate: template,
    });

    assert.equal(result.selection.experience?.tactic, "新书开局闭环打法");
    assert.equal(result.advice.label, "开局闭环");
    assert.ok(result.advice.verificationMove.includes("开头钩子与读者承诺"));
    assert.ok(result.advice.checklist.some((item) => item.includes("闭环打法")));
    assert.equal(selection.experience?.tactic, "新书开局闭环打法");
    assert.equal(guide.items[0]?.label, "开局闭环");
    assert.equal(guide.items[0]?.headline, "番茄小说 优先开书");
    assert.ok(guide.nextActions[0]?.includes("优先参考 番茄小说"));
    assert.equal(handoff.label, "闭环交接");
    assert.ok(handoff.firstDayActions.some((action) => action.includes("闭环复用")));
    assert.ok(handoff.evidence.some((item) => item.includes("已用于新书开局并闭环")));
  });

  await t.test("builds a creation-page digest from reusable handoff evidence", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const advice = buildProjectStartTacticAdvice({ platform, template, style });
    const handoff = buildProjectStartExperienceHandoff({
      platform,
      template,
      guide: buildProjectStartPlatformExperienceGuide({
        platforms: [platform],
        experiences: [{
          platformId: "fanqie",
          platformName: "番茄小说",
          status: "usable",
          label: "可复用打法",
          tactic: "新书开局闭环打法",
          lesson: "已完成开局交接。",
          reuseHint: "先锁开头钩子，再把前三章兑现写进验收线。",
          risk: "不要直接放量，先做小样本。",
          href: "/gate#platform-tactic-experience",
          sourceStatus: "healthy",
          sourceLabel: "新书开局闭环",
          priorityScore: 94,
          latestAt: "2026-01-03T00:00:00.000Z",
          evidence: [
            "知识来源：番茄小说 正反馈经验已沉淀",
            "平台反哺：执行正反馈链",
            "交接动作已落地：开头：第一段给倒计时。",
            "避坑边界已确认：不要直接放量，先做小样本。",
          ],
        }],
      }),
      advice,
      riskGate: {
        level: "pass",
        requiresConfirmation: false,
        label: "可优先",
        title: "番茄小说 优先开书",
        detail: "新书开局闭环打法 已经被用于新书第一天流程并完成交接。",
        actionLabel: "创建作品",
        evidence: ["已用于新书开局并闭环"],
      },
      recommendedTemplate: template,
    });
    const digest = buildProjectStartExperienceDigest({
      platformName: platform.name,
      handoff,
      advice,
    });

    assert.equal(digest.title, "番茄小说 开书经验摘要");
    assert.ok(digest.reason.includes("已经被用于新书第一天流程"));
    assert.ok(digest.copyActions.some((action) => action.includes("闭环复用")));
    assert.ok(digest.copyActions.some((action) => action.includes("第一段给")));
    assert.ok(digest.avoidRules.some((rule) => rule.includes("不要直接放量")));
    assert.ok(digest.evidence.some((line) => line.includes("知识来源：番茄小说")));
    assert.ok(digest.evidence.some((line) => line.includes("平台反哺")));
  });

  await t.test("turns completed recovery follow-up experience into a first-day small-sample handoff", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const recoveryDispatch = buildGatePlatformTacticExperienceFollowupDispatch({
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "恢复放量打法",
      lesson: "恢复放量后续小样本已过线。",
      reuseHint: "新项目可以参考这套恢复放量节奏，但仍先跑小样本。",
      risk: "恢复放量不能跨题材无限复用。",
      href: "/gate#platform-tactic-experience",
      sourceStatus: "healthy",
      sourceLabel: "恢复放量闭环",
      priorityScore: 92,
      latestAt: "2026-01-02T00:00:00.000Z",
      evidence: ["恢复放量后续闭环：通过"],
    });
    assert.ok(recoveryDispatch);
    const task: PersistedGatePlatformDispatchTask = {
      ...recoveryDispatch,
      databaseId: "task-recovery-followup",
      dispatchKey: recoveryDispatch.id,
      projectId: null,
      sourceReceiptId: null,
      state: "completed",
      completionEvidence: "恢复放量继续小样本已通过：曝光 320，点击率 8%，追读率 2.4%，可以继续谨慎复用。",
      assignedAt: "2026-01-02T00:00:00.000Z",
      completedAt: "2026-01-02T03:00:00.000Z",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T03:00:00.000Z",
    };
    const result = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: [],
      tasks: [task],
    });
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      experiences: result.experiences,
    });
    const riskGate = buildProjectStartRiskGate(guide.items[0] ?? null);
    const handoff = buildProjectStartExperienceHandoff({
      platform,
      template,
      guide,
      advice: result.advice,
      riskGate,
      recommendedTemplate: template,
    });

    assert.equal(result.selection.experience?.tactic, "恢复放量打法");
    assert.equal(result.advice.label, "恢复放量打法");
    assert.equal(guide.items[0]?.label, "恢复放量打法");
    assert.equal(handoff.label, "恢复放量交接");
    assert.ok(handoff.title.includes("恢复放量小样本"));
    assert.ok(handoff.firstDayActions.some((action) => action.includes("恢复放量小样本")));
    assert.ok(handoff.avoidRules.some((rule) => rule.includes("不直接放量")));
  });

  await t.test("turns a recovery experience handoff into a first-day dispatch package", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const recoveryDispatch = buildGatePlatformTacticExperienceFollowupDispatch({
      platformId: "fanqie",
      platformName: "番茄小说",
      status: "usable",
      label: "可复用打法",
      tactic: "恢复放量打法",
      lesson: "恢复放量后续小样本已过线。",
      reuseHint: "新项目可以参考这套恢复放量节奏，但仍先跑小样本。",
      risk: "恢复放量不能跨题材无限复用。",
      href: "/gate#platform-tactic-experience",
      sourceStatus: "healthy",
      sourceLabel: "恢复放量闭环",
      priorityScore: 92,
      latestAt: "2026-01-02T00:00:00.000Z",
      evidence: ["加码范围：番茄小说 恢复放量继续小样本", "适用边界：只允许小步复用"],
    });
    assert.ok(recoveryDispatch);
    const task: PersistedGatePlatformDispatchTask = {
      ...recoveryDispatch,
      databaseId: "task-recovery-followup",
      dispatchKey: recoveryDispatch.id,
      projectId: null,
      sourceReceiptId: null,
      state: "completed",
      completionEvidence: "恢复放量继续小样本已通过：成功率 100%，质量 88，追读率 2.4%。",
      assignedAt: "2026-01-02T00:00:00.000Z",
      completedAt: "2026-01-02T03:00:00.000Z",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T03:00:00.000Z",
    };
    const result = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: [],
      tasks: [task],
    });
    const guide = buildProjectStartPlatformExperienceGuide({
      platforms: [platform],
      experiences: result.experiences,
    });
    const riskGate = buildProjectStartRiskGate(guide.items[0] ?? null);
    const handoff = buildProjectStartExperienceHandoff({
      platform,
      template,
      guide,
      advice: result.advice,
      riskGate,
      recommendedTemplate: template,
    });
    const handoffPackage = buildProjectStartExperienceHandoffDispatchPackage({
      project: { id: "project-new", title: "夜雨系统" },
      platform,
      handoff,
      now: "2026-01-03T00:00:00.000Z",
    });

    assert.equal(handoffPackage.label, "恢复放量交接");
    assert.deepEqual(handoffPackage.dispatches.map((item) => item.id), [
      "first-day-handoff:project-new:opening",
      "first-day-handoff:project-new:verification",
      "first-day-handoff:project-new:platform-package",
    ]);
    assert.deepEqual(handoffPackage.dispatches.map((item) => item.ownerRole), ["开头编辑", "审稿编辑", "平台运营"]);
    assert.ok(handoffPackage.dispatches[0]?.acceptanceCriteria.some((item) => item.includes("恢复放量小样本")));
    assert.ok(handoffPackage.dispatches[1]?.acceptanceCriteria.some((item) => item.includes("通过线")));
    assert.ok(handoffPackage.dispatches[2]?.acceptanceCriteria.some((item) => item.includes("首轮曝光")));
    assert.ok(handoffPackage.dispatches.every((item) => item.evidence.some((line) => line.includes("恢复放量"))));
    assert.ok(handoffPackage.nextAction.includes("派单中心"));
  });

  await t.test("keeps knowledge feedback source in first-day handoff dispatch evidence", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const handoffPackage = buildProjectStartExperienceHandoffDispatchPackage({
      project: { id: "project-knowledge", title: "夜雨系统" },
      platform,
      handoff: {
        status: "reuse",
        label: "复用交接",
        title: "番茄小说 正反馈开局交接",
        detail: "平台知识反馈已经证明强钩子标题和前三章兑现可复用。",
        selectedPlatformId: platform.id,
        selectedPlatformName: platform.name,
        recommendedPlatformId: platform.id,
        recommendedPlatformName: platform.name,
        recommendedTemplateId: template.id,
        shouldSwitchTemplate: false,
        firstDayActions: [
          "开头：第一段给不可逆危机。",
          "验证：回填前三章追读。",
          "平台包：标题必须兑现强钩子。",
          "模型复检：正文初稿走 DeepSeek，复查走 Kimi。",
        ],
        avoidRules: [
          "不要直接放量，先做小样本。",
          "不要只复用标题，不复用前三章兑现。",
          "不要省略平台反馈回收字段。",
        ],
        evidence: [
          "知识来源：番茄小说 正反馈经验已沉淀",
          "平台反哺：执行正反馈链",
        ],
      },
      now: "2026-01-03T00:00:00.000Z",
    });

    assert.ok(handoffPackage.dispatches.every((item) => item.evidence.some((line) => line.includes("知识来源：番茄小说"))));
  });

  await t.test("parses only complete first-day handoff dispatch requests", () => {
    const valid = parseProjectStartExperienceHandoffDispatchRequest({
      handoff: {
        status: "small_sample",
        label: "恢复放量交接",
        title: "番茄小说 恢复放量小样本交接",
        detail: "历史打法可参考，但首日只跑小样本。",
        selectedPlatformId: "fanqie",
        selectedPlatformName: "番茄小说",
        recommendedPlatformId: "fanqie",
        recommendedPlatformName: "番茄小说",
        recommendedTemplateId: "fanqie_system_reversal",
        shouldSwitchTemplate: false,
        firstDayActions: ["开头先跑恢复放量小样本。"],
        avoidRules: ["未过小样本前不直接放量。"],
        evidence: ["恢复放量：2 批稳定。"],
      },
    });
    const invalid = parseProjectStartExperienceHandoffDispatchRequest({
      handoff: {
        status: "small_sample",
        label: "恢复放量交接",
        title: "番茄小说 恢复放量小样本交接",
        detail: "缺少首日动作。",
        selectedPlatformId: "fanqie",
        selectedPlatformName: "番茄小说",
        recommendedPlatformId: "fanqie",
        recommendedPlatformName: "番茄小说",
        recommendedTemplateId: null,
        shouldSwitchTemplate: false,
        firstDayActions: [],
        avoidRules: ["未过小样本前不直接放量。"],
        evidence: ["恢复放量：2 批稳定。"],
      },
    });

    assert.equal(valid?.label, "恢复放量交接");
    assert.equal(valid?.firstDayActions[0], "开头先跑恢复放量小样本。");
    assert.equal(invalid, null);
  });

  await t.test("builds a focused recovery handoff panel only for recovery scale starts", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const recoveryPanel = buildProjectStartRecoveryHandoffPanel({
      status: "reuse",
      label: "恢复放量交接",
      title: "番茄小说 恢复放量小样本交接",
      detail: "恢复放量打法可复用，但新书首日不能直接放量。",
      selectedPlatformId: platform.id,
      selectedPlatformName: platform.name,
      recommendedPlatformId: platform.id,
      recommendedPlatformName: platform.name,
      recommendedTemplateId: template.id,
      shouldSwitchTemplate: false,
      firstDayActions: [
        "恢复放量小样本：只把历史打法当作解除闸门后的参考，首日先验证开头、前三章兑现和追读信号。",
        "验证：回填前三章追读、点击和收藏。",
      ],
      avoidRules: ["恢复放量经验不等于新书直接放量，未过小样本前不直接放量。"],
      evidence: ["恢复放量：2 批，仍按小样本节奏复用"],
    });
    const regularPanel = buildProjectStartRecoveryHandoffPanel({
      status: "reuse",
      label: "复用交接",
      title: "番茄小说 可复用历史打法",
      detail: "当前平台可以沿用历史高压钩子。",
      selectedPlatformId: platform.id,
      selectedPlatformName: platform.name,
      recommendedPlatformId: platform.id,
      recommendedPlatformName: platform.name,
      recommendedTemplateId: template.id,
      shouldSwitchTemplate: false,
      firstDayActions: ["开头：第一段给不可逆危机。"],
      avoidRules: ["不要直接放量，先做小样本。"],
      evidence: ["最终判定：稳定加码。"],
    });

    assert.equal(recoveryPanel?.title, "恢复放量首日小样本");
    assert.equal(recoveryPanel?.badge, "恢复放量交接");
    assert.ok(recoveryPanel?.primaryAction.includes("首日先验证"));
    assert.ok(recoveryPanel?.verificationTarget.includes("回填前三章追读"));
    assert.ok(recoveryPanel?.blockedRule.includes("未过小样本前不直接放量"));
    assert.deepEqual(recoveryPanel?.evidence, ["恢复放量：2 批，仍按小样本节奏复用"]);
    assert.equal(regularPanel, null);
  });

  await t.test("turns start advice into a reusable platform soil entry", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const advice = buildProjectStartTacticAdvice({ platform, template, style });
    const entry = buildProjectStartTacticWorldEntry(advice, platform.name, {
      status: "reuse",
      label: "复用交接",
      title: "番茄小说 可复用历史打法",
      detail: "当前平台可以沿用历史高压钩子，但仍要回填首轮数据。",
      selectedPlatformId: "fanqie",
      selectedPlatformName: "番茄小说",
      recommendedPlatformId: "fanqie",
      recommendedPlatformName: "番茄小说",
      recommendedTemplateId: template.id,
      shouldSwitchTemplate: false,
      firstDayActions: ["开头：第一段给不可逆危机。", "验证：回填前三章追读。"],
      avoidRules: ["不要直接放量，先做小样本。"],
      evidence: ["最终判定：稳定加码。"],
    });
    const summary = parseProjectStartTacticSummary(entry);

    assert.equal(entry.type, "platform_soil");
    assert.equal(entry.title, "首轮平台打法：番茄小说");
    assert.ok(entry.content.includes("状态：模板推荐"));
    assert.ok(entry.content.includes("交接状态：reuse"));
    assert.ok(entry.content.includes("首日动作：开头"));
    assert.ok(entry.content.includes("避坑边界：不要直接放量"));
    assert.ok(entry.content.includes("开头动作："));
    assert.ok(entry.content.includes("验证动作："));
    assert.equal(summary?.label, "模板推荐");
    assert.equal(summary?.handoffStatus, "reuse");
    assert.equal(summary?.handoffLabel, "复用交接");
    assert.equal(summary?.recommendedTemplateId, template.id);
    assert.deepEqual(summary?.firstDayActions, ["开头：第一段给不可逆危机。", "验证：回填前三章追读。"]);
    assert.deepEqual(summary?.avoidRules, ["不要直接放量，先做小样本。"]);
    assert.deepEqual(summary?.handoffEvidence, ["最终判定：稳定加码。"]);
    assert.ok(summary?.openingMove.includes("第一段"));
    assert.ok(summary?.verificationMove.includes("前三章"));
    assert.equal(findProjectStartTacticSummary([
      { type: "platform_soil", title: "普通平台土壤", content: "每章要有追读。" },
      entry,
    ])?.title, "首轮平台打法：番茄小说");
  });

  await t.test("keeps platform knowledge feedback evidence in start soil", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const result = buildProjectStartGateExperience({
      platform,
      template,
      style,
      receipts: [],
      knowledgeFeedbackReceipts: [{
        id: "platform-knowledge:project-1:fanqie:publish_effect:metric-1",
        projectId: "project-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        actionLabel: "执行正反馈链",
        title: "番茄小说 正反馈经验已沉淀",
        message: "点击和追读变好，正反馈经验已经进入生成链路。",
        completedStepLabel: "发布效果正反馈",
        stopReason: "可复用信号：强钩子标题",
        nextAction: "复盘平台策略排序",
        href: "#platform-strategy-ranking",
        severity: "success",
        createdAt: "2026-07-05T10:00:00.000Z",
      }],
    });
    const entry = buildProjectStartTacticWorldEntry(result.advice, platform.name);

    assert.ok(entry.content.includes("知识来源：番茄小说 正反馈经验已沉淀"));
    assert.ok(entry.content.includes("平台反哺：执行正反馈链"));
    assert.ok(entry.content.includes("已推进：发布效果正反馈"));
    assert.ok(entry.content.includes("可复用信号：强钩子标题"));
  });

  await t.test("turns start advice into editable opening soil assets", () => {
    const platform = getPlatformProfile("fanqie");
    const template = getDefaultTemplateForPlatform(platform.id);
    const style = getPlatformWritingStyle(platform.id);
    const advice = buildProjectStartTacticAdvice({ platform, template, style });
    const entries = buildProjectStartSoilWorldEntries({
      advice,
      platform,
      template,
      style,
      handoff: {
        status: "reuse",
        label: "复用交接",
        title: "番茄小说 可复用历史打法",
        detail: "当前平台可以沿用历史高压钩子。",
        selectedPlatformId: "fanqie",
        selectedPlatformName: "番茄小说",
        recommendedPlatformId: "fanqie",
        recommendedPlatformName: "番茄小说",
        recommendedTemplateId: template.id,
        shouldSwitchTemplate: false,
        firstDayActions: ["闭环复用：沿用已完成的新书开局三段交接。"],
        avoidRules: ["不要直接放量，先做小样本。"],
        evidence: [
          "知识来源：番茄小说 正反馈经验已沉淀",
          "平台反哺：执行正反馈链",
          "交接动作已落地：开头：第一段给不可逆危机。",
          "避坑边界已确认：不要直接放量，先做小样本。",
        ],
      },
      modelRoutes: [{
        taskLabel: "正文初稿",
        primaryProviderName: "DeepSeek · deepseek-chat",
        fallbackProviderName: "Kimi · kimi-k2.6",
        recommendationSummary: "历史样本 2 次",
        evidence: ["正文初稿首选 DeepSeek，备用 Kimi"],
      }],
    });

    assert.deepEqual(entries.map((entry) => entry.title), [
      "开局钩子土壤：番茄小说",
      "前三章节奏土壤：番茄小说",
      "人物弧光土壤：番茄小说",
      "大树结构土壤：番茄小说",
      "平台避坑清单：番茄小说",
      "模型分工土壤：番茄小说",
    ]);
    assert.ok(entries.every((entry) => entry.type === "platform_soil"));
    assert.ok(entries.find((entry) => entry.title.startsWith("开局钩子"))?.content.includes("首屏承诺"));
    assert.ok(entries.find((entry) => entry.title.startsWith("开局钩子"))?.content.includes("知识来源：番茄小说"));
    assert.ok(entries.find((entry) => entry.title.startsWith("开局钩子"))?.content.includes("第一段给不可逆危机"));
    assert.ok(entries.find((entry) => entry.title.startsWith("前三章"))?.content.includes(template.firstThree[0].cliffhanger));
    assert.ok(entries.find((entry) => entry.title.startsWith("人物弧光"))?.content.includes(template.protagonist.arcEnd));
    assert.ok(entries.find((entry) => entry.title.startsWith("大树结构"))?.content.includes("开头"));
    assert.ok(entries.find((entry) => entry.title.startsWith("平台避坑"))?.content.includes("不要直接放量"));
    assert.ok(entries.find((entry) => entry.title.startsWith("平台避坑"))?.content.includes("平台反哺：执行正反馈链"));
    assert.ok(entries.find((entry) => entry.title.startsWith("模型分工"))?.content.includes("DeepSeek"));
  });
});
