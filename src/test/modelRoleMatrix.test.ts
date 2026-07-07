import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModelRoleMatrix,
  buildModelRoleMatrixPmFocusNotice,
  buildModelRoleMatrixPriorityBlocker,
  buildModelRoleRouteDraft,
  buildModelRoleRouteBatchSavePlan,
  buildModelRoleRouteRecheckAdviceFromBatchPlan,
} from "../lib/model-gateway/modelRoleMatrix.ts";

test("buildModelRoleMatrix", async (t) => {
  await t.test("marks the four writing roles ready with Claude, DeepSeek, Kimi and GPT", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "claude",
        providerId: "claude",
        displayName: "Claude",
        hasApiKey: true,
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        maxContextTokens: 200000,
      },
      {
        id: "deepseek",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
      {
        id: "kimi",
        providerId: "kimi",
        displayName: "Kimi",
        hasApiKey: true,
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
      {
        id: "gpt",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 128000,
      },
    ]);

    assert.equal(matrix.status, "ready");
    assert.equal(matrix.summary.readyRoles, 4);
    assert.equal(matrix.interfaceCoverage.readyInterfaces, 4);
    assert.equal(matrix.interfaceCoverage.missingInterfaces, 0);
    assert.equal(matrix.interfaceCoverage.actionHref, "/settings/models#model-provider-interfaces");
    assert.ok(matrix.interfaceCoverage.headline.includes("4/4"));
    assert.deepEqual(
      matrix.interfaceCoverage.items.map((item) => item.providerId),
      ["claude", "deepseek", "kimi", "gpt"],
    );
    assert.equal(matrix.roles.find((role) => role.id === "structure_editor")?.providerName, "Claude");
    assert.equal(matrix.roles.find((role) => role.id === "draft_writer")?.providerName, "DeepSeek");
    assert.equal(matrix.roles.find((role) => role.id === "context_librarian")?.providerName, "Kimi");
    assert.equal(matrix.roles.find((role) => role.id === "overseas_packager")?.providerName, "GPT / OpenAI");
  });

  await t.test("blocks missing editorial roles when only Mock is available", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "mock",
        providerId: "mock",
        displayName: "Mock",
        hasApiKey: false,
        defaultModel: "mock-writer",
        enabled: true,
        maxContextTokens: 16000,
      },
    ]);

    assert.equal(matrix.status, "blocked");
    assert.equal(matrix.summary.missingRoles, 4);
    assert.equal(matrix.interfaceCoverage.readyInterfaces, 0);
    assert.equal(matrix.interfaceCoverage.missingInterfaces, 4);
    assert.ok(matrix.interfaceCoverage.headline.includes("0/4"));
    assert.ok(matrix.interfaceCoverage.detail.includes("Claude"));
    assert.ok(matrix.interfaceCoverage.detail.includes("DeepSeek"));
    assert.ok(matrix.interfaceCoverage.detail.includes("Kimi"));
    assert.ok(matrix.interfaceCoverage.detail.includes("GPT"));
    assert.ok(matrix.headline.includes("缺岗位"));
    assert.ok(matrix.nextAction.includes("配置"));
  });

  await t.test("surfaces a PM blocker for missing model roles", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "mock",
        providerId: "mock",
        displayName: "Mock",
        hasApiKey: false,
        defaultModel: "mock-writer",
        enabled: true,
        maxContextTokens: 16000,
      },
    ]);

    const blocker = buildModelRoleMatrixPriorityBlocker(matrix);

    assert.equal(blocker?.tone, "blocked");
    assert.equal(blocker?.title, "模型编辑部缺岗");
    assert.ok(blocker?.detail.includes("4 个岗位"));
    assert.equal(blocker?.actionLabel, "去配置模型岗位");
    assert.equal(blocker?.actionHref, "/settings/models#model-role-matrix");
  });

  await t.test("builds the PM focus notice for model task routing", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "mock",
        providerId: "mock",
        displayName: "Mock",
        hasApiKey: false,
        defaultModel: "mock-writer",
        enabled: true,
        maxContextTokens: 16000,
      },
    ]);

    const notice = buildModelRoleMatrixPmFocusNotice(matrix);

    assert.equal(notice.headline, "当前优先：模型任务化，别再做聊天壳。");
    assert.ok(notice.reason.includes("聊天"));
    assert.ok(notice.proof.includes("失败替代"));
    assert.ok(notice.proof.includes("复检"));
    assert.equal(notice.tone, "blocked");
    assert.equal(notice.actionHref, "/settings/models#model-role-matrix");
    assert.equal(notice.pipelineActionLabel, "验收真实流水线");
    assert.equal(notice.pipelineActionHref, "/projects#pipeline-projects");
    assert.ok(notice.pipelineValidationHint.includes("开书"));
    assert.ok(notice.pipelineValidationHint.includes("首章"));
    assert.ok(notice.pipelineValidationHint.includes("审稿"));
    assert.ok(notice.pipelineValidationHint.includes("发布包"));
    assert.ok(notice.pipelineValidationHint.includes("复盘"));
  });

  await t.test("allows fallback providers but warns when context is too short", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "gpt-small",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 16000,
      },
      {
        id: "deepseek",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
    ]);

    const structure = matrix.roles.find((role) => role.id === "structure_editor");
    const overseas = matrix.roles.find((role) => role.id === "overseas_packager");

    assert.equal(matrix.status, "partial");
    assert.equal(structure?.status, "partial");
    assert.ok(structure?.reason.includes("上下文低于"));
    assert.equal(overseas?.status, "partial");
    assert.ok(matrix.nextAction.includes("上下文"));
  });

  await t.test("surfaces a PM watch card when roles are only partial", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "gpt-small",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 16000,
      },
      {
        id: "deepseek",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
    ]);

    const blocker = buildModelRoleMatrixPriorityBlocker(matrix);

    assert.equal(blocker?.tone, "watch");
    assert.equal(blocker?.title, "模型岗位上下文不够");
    assert.ok(blocker?.detail.includes("3 个岗位"));
    assert.equal(blocker?.actionHref, "/settings/models#model-role-matrix");
  });

  await t.test("does not show a PM blocker once all model roles are ready", () => {
    const matrix = buildModelRoleMatrix([
      {
        id: "claude",
        providerId: "claude",
        displayName: "Claude",
        hasApiKey: true,
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        maxContextTokens: 200000,
      },
      {
        id: "deepseek",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
      {
        id: "kimi",
        providerId: "kimi",
        displayName: "Kimi",
        hasApiKey: true,
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
      {
        id: "gpt",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 128000,
      },
    ]);

    assert.equal(buildModelRoleMatrixPriorityBlocker(matrix), null);
  });

  await t.test("builds task route drafts from the editorial role matrix", () => {
    const providers = [
      {
        id: "claude-config",
        providerId: "claude",
        displayName: "Claude",
        hasApiKey: true,
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        maxContextTokens: 200000,
      },
      {
        id: "deepseek-config",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
      {
        id: "kimi-config",
        providerId: "kimi",
        displayName: "Kimi",
        hasApiKey: true,
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
      {
        id: "gpt-config",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 128000,
      },
    ];

    const draft = buildModelRoleRouteDraft(providers, [
      {
        taskType: "chapter_review",
        primaryProviderConfigId: "claude-config",
        fallbackProviderConfigId: "kimi-config",
      },
    ]);
    const chapterDraft = draft.items.find((item) => item.taskType === "chapter_draft");
    const chapterReview = draft.items.find((item) => item.taskType === "chapter_review");
    const packageOptimize = draft.items.find((item) => item.taskType === "submission_package_optimize");
    const controlAsset = draft.items.find((item) => item.taskType === "control_asset_generate");

    assert.equal(draft.summary.total, 6);
    assert.equal(draft.summary.ready, 5);
    assert.equal(draft.summary.current, 1);
    assert.equal(draft.summary.missing, 0);
    assert.equal(chapterDraft?.primaryProviderConfigId, "deepseek-config");
    assert.equal(chapterDraft?.fallbackProviderConfigId, "kimi-config");
    assert.equal(chapterDraft?.ownerRoleTitle, "中文网文写手");
    assert.equal(chapterDraft?.costWatchLabel, "成本观察：低成本批量");
    assert.ok(chapterDraft?.recheckAction.includes("质量、成本和备用命中"));
    assert.equal(chapterReview?.status, "current");
    assert.equal(chapterReview?.primaryProviderName, "Claude · claude-sonnet-4-5");
    assert.equal(chapterReview?.fallbackProviderName, "Kimi · kimi-k2.6");
    assert.equal(chapterReview?.costWatchLabel, "成本观察：高成本结构审稿");
    assert.ok(chapterReview?.recheckAction.includes("同章复检"));
    assert.equal(packageOptimize?.primaryProviderConfigId, "gpt-config");
    assert.equal(packageOptimize?.ownerRoleTitle, "海外投稿包装编辑");
    assert.equal(packageOptimize?.costWatchLabel, "成本观察：中成本包装");
    assert.equal(controlAsset?.primaryProviderConfigId, "kimi-config");
    assert.equal(controlAsset?.costWatchLabel, "成本观察：长上下文消耗");
    assert.ok(draft.nextActions.some((action) => action.includes("5 条")));
  });

  await t.test("keeps route drafts missing when required model roles are absent", () => {
    const draft = buildModelRoleRouteDraft([
      {
        id: "mock",
        providerId: "mock",
        displayName: "Mock",
        hasApiKey: false,
        defaultModel: "mock-writer",
        enabled: true,
        maxContextTokens: 16000,
      },
    ], []);

    assert.equal(draft.summary.missing, 6);
    assert.equal(draft.items.every((item) => item.status === "missing"), true);
    assert.equal(draft.items.every((item) => item.primaryProviderConfigId === null), true);
    assert.ok(draft.nextActions.some((action) => action.includes("先补模型岗位")));
  });

  await t.test("builds a batch save plan only for ready role routes", () => {
    const draft = buildModelRoleRouteDraft([
      {
        id: "claude-config",
        providerId: "claude",
        displayName: "Claude",
        hasApiKey: true,
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        maxContextTokens: 200000,
      },
      {
        id: "deepseek-config",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
      {
        id: "kimi-config",
        providerId: "kimi",
        displayName: "Kimi",
        hasApiKey: true,
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
      {
        id: "gpt-config",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 128000,
      },
    ], [
      {
        taskType: "chapter_review",
        primaryProviderConfigId: "claude-config",
        fallbackProviderConfigId: "kimi-config",
      },
    ]);

    const plan = buildModelRoleRouteBatchSavePlan(draft);
    const firstItem = plan.items[0];

    assert.equal(plan.summary.readyToSave, 5);
    assert.equal(plan.summary.alreadyCurrent, 1);
    assert.equal(plan.summary.missing, 0);
    assert.equal(plan.items.some((item) => item.taskType === "chapter_review"), false);
    assert.equal(firstItem.confirmation.source, "manual");
    assert.equal(firstItem.confirmation.routeStatus, "ready");
    assert.ok(firstItem.confirmation.reason.includes(firstItem.label));
    assert.ok(firstItem.confirmation.reason.includes(firstItem.ownerRoleTitle));
    assert.ok(firstItem.confirmation.reason.includes(firstItem.manualGate));
  });

  await t.test("turns saved role routes into route recheck advice", () => {
    const draft = buildModelRoleRouteDraft([
      {
        id: "claude-config",
        providerId: "claude",
        displayName: "Claude",
        hasApiKey: true,
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        maxContextTokens: 200000,
      },
      {
        id: "deepseek-config",
        providerId: "deepseek",
        displayName: "DeepSeek",
        hasApiKey: true,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: 64000,
      },
      {
        id: "kimi-config",
        providerId: "kimi",
        displayName: "Kimi",
        hasApiKey: true,
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
      {
        id: "gpt-config",
        providerId: "gpt",
        displayName: "GPT / OpenAI",
        hasApiKey: true,
        defaultModel: "gpt-5-mini",
        enabled: true,
        maxContextTokens: 128000,
      },
    ], []);
    const plan = buildModelRoleRouteBatchSavePlan(draft);

    const advice = buildModelRoleRouteRecheckAdviceFromBatchPlan(plan, "2026-07-06T08:00:00.000Z");
    const draftAdvice = advice.find((item) => item.taskType === "chapter_draft");

    assert.equal(advice.length, 6);
    assert.equal(draftAdvice?.id, "role-route-recheck:chapter_draft:2026-07-06T08:00:00.000Z");
    assert.equal(draftAdvice?.severity, "warning");
    assert.equal(draftAdvice?.action, "manual_review");
    assert.equal(draftAdvice?.actionLabel, "跑小样本复检");
    assert.ok(draftAdvice?.recommendation.includes("中文网文写手"));
    assert.ok(draftAdvice?.evidence.some((item) => item.includes("DeepSeek · deepseek-chat")));
    assert.equal(draftAdvice?.sampleCount, null);
    assert.equal(draftAdvice?.successRatePercent, null);
  });
});
