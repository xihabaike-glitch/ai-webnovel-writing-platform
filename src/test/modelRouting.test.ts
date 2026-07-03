import test from "node:test";
import assert from "node:assert/strict";
import { buildPresetRouteBlueprint } from "../lib/model-gateway/presetRouteBlueprint.ts";
import {
  selectForcedModelProviderCandidate,
  selectModelProviderCandidatesForTask,
  selectModelProviderForTask,
} from "../lib/model-gateway/providerSelection.ts";
import {
  buildRouteConfirmationRecheckAdvice,
  buildRouteConfirmationRecheckGovernanceAction,
  buildRouteConfirmationGovernanceEvidenceFromDispatchTasks,
  buildRouteConfirmationGovernanceFollowUpDispatches,
  buildModelRouteConfirmationDispatch,
  buildModelRouteConfirmationReceipt,
  buildRouteConfirmationRecheckEvidenceFromDispatchTasks,
  modelRouteConfirmationReceiptFromAudit,
} from "../lib/model-gateway/routeConfirmation.ts";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceDecisionHistory,
  buildRouteAvoidanceRetestDispatch,
  buildRouteAvoidanceRuleKey,
  buildRouteAvoidanceRulesFromDispatchTasks,
  buildRouteRecommendations,
} from "../lib/model-gateway/routeRecommendations.ts";
import {
  buildRouteAvoidanceRetestEvidence,
  buildRouteAvoidanceRetestSamplePlan,
} from "../lib/model-gateway/routeRetestSamples.ts";
import { labelForRoutedTask, modelTaskRouteOptions } from "../lib/model-gateway/taskRouting.ts";

const mockProvider = {
  id: "mock-provider",
  providerId: "mock",
  displayName: "Mock",
  defaultModel: "mock-writer",
  enabled: true,
  encryptedApiKey: null,
};

const gptProvider = {
  id: "gpt-provider",
  providerId: "gpt",
  displayName: "GPT",
  defaultModel: "gpt-5-mini",
  enabled: true,
  encryptedApiKey: "key",
};

const disabledClaude = {
  id: "claude-provider",
  providerId: "claude",
  displayName: "Claude",
  defaultModel: "claude-sonnet-4-5",
  enabled: false,
  encryptedApiKey: "key",
};

test("model task routing", async (t) => {
  await t.test("prefers the configured primary provider when usable", () => {
    const selected = selectModelProviderForTask([mockProvider, gptProvider], {
      primaryProvider: gptProvider,
      fallbackProvider: mockProvider,
    });

    assert.equal(selected?.id, "gpt-provider");
  });

  await t.test("uses fallback provider when primary is unavailable", () => {
    const selected = selectModelProviderForTask([mockProvider, gptProvider], {
      primaryProvider: disabledClaude,
      fallbackProvider: mockProvider,
    });

    assert.equal(selected?.id, "mock-provider");
  });

  await t.test("builds an ordered failover candidate chain", () => {
    const candidates = selectModelProviderCandidatesForTask([mockProvider, gptProvider], {
      primaryProvider: gptProvider,
      fallbackProvider: mockProvider,
    });

    assert.deepEqual(candidates.map((candidate) => candidate.provider.id), ["gpt-provider", "mock-provider"]);
    assert.deepEqual(candidates.map((candidate) => candidate.role), ["primary", "fallback"]);
  });

  await t.test("selects a forced observed provider for route retests", () => {
    const selected = selectForcedModelProviderCandidate([mockProvider, gptProvider], {
      providerConfigId: "mock-provider",
      providerId: "mock",
      model: "mock-writer",
    });
    const disabled = selectForcedModelProviderCandidate([disabledClaude, gptProvider], {
      providerConfigId: "claude-provider",
      providerId: "claude",
      model: "claude-sonnet-4-5",
    });

    assert.equal(selected?.provider.id, "mock-provider");
    assert.equal(selected?.role, "forced");
    assert.equal(disabled, null);
  });

  await t.test("deduplicates the automatic fallback candidate", () => {
    const candidates = selectModelProviderCandidatesForTask([gptProvider, mockProvider], {
      primaryProvider: gptProvider,
      fallbackProvider: null,
    });

    assert.deepEqual(candidates.map((candidate) => candidate.provider.id), ["gpt-provider"]);
  });

  await t.test("falls back to default active provider without a route", () => {
    const selected = selectModelProviderForTask([mockProvider, gptProvider]);

    assert.equal(selected?.id, "gpt-provider");
  });

  await t.test("lists core writing task route options", () => {
    assert.ok(modelTaskRouteOptions.some((option) => option.taskType === "chapter_draft"));
    assert.ok(modelTaskRouteOptions.some((option) => option.taskType === "control_asset_generate"));
    assert.equal(labelForRoutedTask("chapter_second_pass"), "章节二改");
    assert.equal(labelForRoutedTask("control_asset_generate"), "总控资料生成");
  });

  await t.test("builds route confirmation receipts for applied recommendations", () => {
    const receipt = buildModelRouteConfirmationReceipt({
      taskType: "chapter_draft",
      primaryProviderName: "DeepSeek · deepseek-chat",
      fallbackProviderName: "Kimi · kimi-k2.6",
      reason: "复测通过，恢复候选：成功率 100%，质量 86。近 2 次样本成功率 100%。",
      source: "recommendation",
      createdAt: "2026-07-04T10:00:00.000Z",
    });

    assert.equal(receipt.executionType, "model_route");
    assert.equal(receipt.platformId, "model-routing");
    assert.equal(receipt.label, "正文初稿路由已确认");
    assert.ok(receipt.detail.includes("DeepSeek · deepseek-chat"));
    assert.ok(receipt.detail.includes("Kimi · kimi-k2.6"));
    assert.ok(receipt.message.includes("复测通过恢复候选"));
    assert.equal(receipt.recheck.label, "复检模型路由");
  });

  await t.test("turns route confirmations into follow-up dispatch tasks", () => {
    const receipt = buildModelRouteConfirmationReceipt({
      taskType: "chapter_review",
      primaryProviderName: "GPT · gpt-5-mini",
      fallbackProviderName: "DeepSeek · deepseek-chat",
      reason: "近 8 次样本成功率 100%，质量 71，单次成功成本 $0.0000。",
      source: "recommendation",
      createdAt: "2026-07-04T10:00:00.000Z",
    });

    const dispatch = buildModelRouteConfirmationDispatch(receipt);

    assert.equal(dispatch.dispatchKey, "model-route-confirmation-recheck:chapter_review:2026-07-04T10:00:00.000Z");
    assert.equal(dispatch.platformId, "model-routing");
    assert.equal(dispatch.platformName, "模型路由");
    assert.equal(dispatch.stage, "model_route_confirmation_recheck");
    assert.equal(dispatch.state, "assigned");
    assert.equal(dispatch.ownerRole, "模型治理");
    assert.equal(dispatch.href, "/settings/models");
    assert.equal(dispatch.actionLabel, "复检模型路由");
    assert.ok(dispatch.title.includes("章节审稿"));
    assert.ok(dispatch.detail.includes("GPT · gpt-5-mini"));
    assert.ok(dispatch.acceptanceCriteria.some((item) => item.includes("成功率")));
    assert.ok(dispatch.evidence.some((item) => item.includes("近 8 次样本成功率")));
  });

  await t.test("restores route confirmation receipts from persisted audits", () => {
    const receipt = buildModelRouteConfirmationReceipt({
      taskType: "chapter_second_pass",
      primaryProviderName: "Kimi · kimi-k2.6",
      reason: "人工保存模型路由。",
      source: "manual",
      createdAt: "2026-07-04T11:00:00.000Z",
    });

    const restored = modelRouteConfirmationReceiptFromAudit({
      receiptId: receipt.id,
      actionId: receipt.actionId,
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: receipt.message,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      platformId: receipt.platformId,
      platformName: receipt.platformName,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.action,
      payload: JSON.stringify(receipt.payload),
      createdAt: new Date(receipt.createdAt),
    });

    assert.equal(restored?.payload.taskType, "chapter_second_pass");
    assert.equal(restored?.payload.primaryProviderName, "Kimi · kimi-k2.6");
    assert.equal(restored?.createdAt, "2026-07-04T11:00:00.000Z");
    assert.equal(modelRouteConfirmationReceiptFromAudit({ ...restored!, executionType: "manual", receiptId: restored!.id, recheckStatus: "ready", recheckAction: restored!.recheck.action, payload: "{}" }), null);
  });

  await t.test("extracts route confirmation recheck evidence from completed dispatches", () => {
    const evidence = buildRouteConfirmationRecheckEvidenceFromDispatchTasks([{
      dispatchKey: "model-route-confirmation-recheck:chapter_review:2026-07-04T10:00:00.000Z",
      stage: "model_route_confirmation_recheck",
      state: "completed",
      completionEvidence: "完成 2 个章节审稿小样本，成功率 100%，质量 82，成本正常，未命中备用路线。",
      evidence: ["已确认章节审稿模型路由。"],
      completedAt: "2026-07-04T12:00:00.000Z",
    }]);

    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].taskType, "chapter_review");
    assert.equal(evidence[0].successRatePercent, 100);
    assert.equal(evidence[0].qualityScore, 82);
    assert.equal(evidence[0].recommendedAction, "keep");
    assert.ok(evidence[0].summary.includes("复检通过"));
  });

  await t.test("turns weak route confirmation rechecks into governance advice", () => {
    const evidence = buildRouteConfirmationRecheckEvidenceFromDispatchTasks([
      {
        dispatchKey: "model-route-confirmation-recheck:chapter_review:2026-07-04T10:00:00.000Z",
        stage: "model_route_confirmation_recheck",
        state: "completed",
        completionEvidence: "完成 2 个章节审稿小样本，1 个超时，成功率 50%，质量 62，命中备用路线。",
        evidence: ["已确认章节审稿模型路由。"],
        completedAt: "2026-07-04T12:00:00.000Z",
      },
      {
        dispatchKey: "model-route-confirmation-recheck:chapter_draft:2026-07-04T09:00:00.000Z",
        stage: "model_route_confirmation_recheck",
        state: "completed",
        completionEvidence: "完成 2 个正文初稿小样本，成功率 100%，质量 86，未命中备用路线。",
        evidence: [],
        completedAt: "2026-07-04T11:00:00.000Z",
      },
    ]);

    const advice = buildRouteConfirmationRecheckAdvice(evidence);

    assert.equal(advice.summary.total, 1);
    assert.equal(advice.summary.switchRoute, 1);
    assert.equal(advice.items[0].taskType, "chapter_review");
    assert.equal(advice.items[0].action, "switch_route");
    assert.equal(advice.items[0].severity, "blocked");
    assert.ok(advice.items[0].recommendation.includes("命中备用路线"));
  });

  await t.test("builds an auditable dispatch action from route recheck governance advice", () => {
    const evidence = buildRouteConfirmationRecheckEvidenceFromDispatchTasks([{
      dispatchKey: "model-route-confirmation-recheck:chapter_review:2026-07-04T10:00:00.000Z",
      stage: "model_route_confirmation_recheck",
      state: "completed",
      completionEvidence: "完成 2 个章节审稿小样本，1 个超时，成功率 50%，质量 62，命中备用路线。",
      evidence: ["已确认章节审稿模型路由。"],
      completedAt: "2026-07-04T12:00:00.000Z",
    }]);
    const advice = buildRouteConfirmationRecheckAdvice(evidence);

    const action = buildRouteConfirmationRecheckGovernanceAction(advice.items[0], {
      createdAt: "2026-07-04T13:00:00.000Z",
    });

    assert.equal(action.receipt.executionType, "model_route");
    assert.equal(action.receipt.platformId, "model-routing");
    assert.equal(action.receipt.label, "章节审稿路由治理已派单");
    assert.ok(action.receipt.message.includes("切备用/重分配"));
    assert.equal(action.dispatch.dispatchKey, "model-route-governance:chapter_review:switch_route:2026-07-04T13:00:00.000Z");
    assert.equal(action.dispatch.stage, "model_route_governance");
    assert.equal(action.dispatch.ownerRole, "模型治理");
    assert.ok(action.dispatch.acceptanceCriteria.some((item) => item.includes("首选模型")));
    assert.ok(action.payload.evidence.some((item) => item.includes("成功率 50")));
  });

  await t.test("builds a cold-start route blueprint from writing model presets", () => {
    const blueprint = buildPresetRouteBlueprint([
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "claude-provider",
        providerId: "claude",
        displayName: "Claude",
        defaultModel: "claude-sonnet-4-5",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "mock-provider",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-writer",
        enabled: true,
        encryptedApiKey: null,
      },
    ], []);

    const draft = blueprint.items.find((item) => item.taskType === "chapter_draft");
    const control = blueprint.items.find((item) => item.taskType === "control_asset_generate");

    assert.equal(blueprint.summary.ready, 6);
    assert.equal(draft?.status, "ready");
    assert.equal(draft?.recommendedPrimaryProviderConfigId, "deepseek-provider");
    assert.equal(draft?.recommendedFallbackProviderConfigId, "kimi-provider");
    assert.ok(draft?.reason.includes("低成本批量"));
    assert.equal(control?.recommendedPrimaryProviderConfigId, "kimi-provider");
    assert.equal(control?.recommendedFallbackProviderConfigId, "claude-provider");
    assert.ok(control?.reason.includes("长篇规划"));
  });

  await t.test("builds route recommendations from successful model samples", () => {
    const routeConfirmationRechecks = buildRouteConfirmationRecheckEvidenceFromDispatchTasks([{
      dispatchKey: "model-route-confirmation-recheck:chapter_review:2026-07-04T10:00:00.000Z",
      stage: "model_route_confirmation_recheck",
      state: "completed",
      completionEvidence: "完成 2 个章节审稿小样本，成功率 100%，质量 82，成本正常，未命中备用路线。",
      evidence: [],
      completedAt: "2026-07-04T12:00:00.000Z",
    }]);
    const recommendations = buildRouteRecommendations([
      {
        id: "review-1",
        taskType: "chapter_review",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 800,
        costUsd: 0.008,
        outputText: JSON.stringify({ score: 91 }),
      },
      {
        id: "review-2",
        taskType: "chapter_review",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 980,
        outputTokens: 780,
        costUsd: 0.006,
        outputText: JSON.stringify({ score: 87 }),
      },
      {
        id: "review-3",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        status: "failed",
        inputTokens: 900,
        outputTokens: 0,
        costUsd: 0,
        outputText: null,
      },
      {
        id: "review-4",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        status: "succeeded",
        inputTokens: 900,
        outputTokens: 620,
        costUsd: 0,
        outputText: JSON.stringify({ score: 70 }),
      },
      {
        id: "review-5",
        taskType: "chapter_review",
        providerConfigId: "mock-provider",
        status: "succeeded",
        inputTokens: 880,
        outputTokens: 640,
        costUsd: 0,
        outputText: JSON.stringify({ score: 72 }),
      },
      {
        id: "draft-1",
        taskType: "chapter_draft",
        providerConfigId: "mock-provider",
        status: "succeeded",
        inputTokens: 900,
        outputTokens: 1600,
        costUsd: 0,
        outputText: "正文",
      },
    ], [], [
      { ...mockProvider, defaultModel: "mock-novel" },
      { ...gptProvider, defaultModel: "gpt-4.1" },
      { ...disabledClaude, defaultModel: "claude-sonnet" },
    ], {
      routeConfirmationRechecks,
    });

    const review = recommendations.find((item) => item.taskType === "chapter_review");
    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(review?.status, "ready");
    assert.equal(review?.recommendedPrimaryProviderConfigId, "gpt-provider");
    assert.equal(review?.successRatePercent, 100);
    assert.equal(review?.averageQualityScore, 89);
    assert.equal(review?.averageCostPerSucceededTaskUsd, 0.007);
    assert.ok(review?.reason.includes("最近路由复检通过：成功率 100%，质量 82"));
    assert.equal(draft?.status, "insufficient");
  });

  await t.test("feeds completed route governance evidence back into recommendations", () => {
    const routeGovernanceEvidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks([{
      dispatchKey: "model-route-governance:chapter_review:switch_route:2026-07-04T13:00:00.000Z",
      stage: "model_route_governance",
      state: "completed",
      completionEvidence: "已处理章节审稿路由，复跑 2 个小样本仍命中备用，成功率 50%，质量 62，仍需换模型。",
      evidence: ["最近路由复检需观察：成功率 50%，质量 62，仍命中备用路线。"],
      completedAt: "2026-07-04T15:00:00.000Z",
    }]);
    const recommendations = buildRouteRecommendations([
      {
        id: "review-1",
        taskType: "chapter_review",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 800,
        costUsd: 0.008,
        outputText: JSON.stringify({ score: 91 }),
      },
      {
        id: "review-2",
        taskType: "chapter_review",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 980,
        outputTokens: 780,
        costUsd: 0.006,
        outputText: JSON.stringify({ score: 87 }),
      },
    ], [], [
      { ...gptProvider, defaultModel: "gpt-4.1" },
      { ...mockProvider, defaultModel: "mock-novel" },
    ], {
      routeGovernanceEvidence,
    });

    const review = recommendations.find((item) => item.taskType === "chapter_review");

    assert.equal(routeGovernanceEvidence[0].status, "needs_switch");
    assert.ok(review?.reason.includes("路由治理仍需换模型"));
    assert.ok(review?.reason.includes("成功率 50"));
  });

  await t.test("turns completed route governance evidence into follow-up dispatches", () => {
    const routeGovernanceEvidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks([
      {
        dispatchKey: "model-route-governance:chapter_review:switch_route:2026-07-04T13:00:00.000Z",
        stage: "model_route_governance",
        state: "completed",
        completionEvidence: "已处理章节审稿路由，复跑 2 个小样本仍命中备用，成功率 50%，质量 62，仍需换模型。",
        evidence: ["最近路由复检需观察：成功率 50%，质量 62，仍命中备用路线。"],
        completedAt: "2026-07-04T15:00:00.000Z",
      },
      {
        dispatchKey: "model-route-governance:chapter_draft:extend_watch:2026-07-04T14:00:00.000Z",
        stage: "model_route_governance",
        state: "completed",
        completionEvidence: "正文初稿路由已治理，已切换首选模型，复跑 2 个小样本成功率 100%，质量 86，未命中备用。",
        evidence: ["已生成模型路由治理派单。"],
        completedAt: "2026-07-04T16:00:00.000Z",
      },
    ]);

    const followUps = buildRouteConfirmationGovernanceFollowUpDispatches(routeGovernanceEvidence);
    const switchRoute = followUps.find((item) => item.dispatchKey.includes("chapter_review"));
    const recheck = followUps.find((item) => item.dispatchKey.includes("chapter_draft"));

    assert.equal(switchRoute?.stage, "model_route_governance");
    assert.equal(switchRoute?.priorityScore, 94);
    assert.equal(switchRoute?.actionLabel, "调整模型路由");
    assert.ok(switchRoute?.detail.includes("仍需换模型"));
    assert.equal(recheck?.stage, "model_route_confirmation_recheck");
    assert.equal(recheck?.actionLabel, "复检小样本");
    assert.ok(recheck?.acceptanceCriteria.some((item) => item.includes("成功率")));
  });

  await t.test("stops route adjustment follow-up after a newer route confirmation exists", () => {
    const routeGovernanceEvidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks([{
      dispatchKey: "model-route-governance:chapter_review:switch_route:2026-07-04T13:00:00.000Z",
      stage: "model_route_governance",
      state: "completed",
      completionEvidence: "已处理章节审稿路由，复跑 2 个小样本仍命中备用，成功率 50%，质量 62，仍需换模型。",
      evidence: ["最近路由复检需观察：成功率 50%，质量 62，仍命中备用路线。"],
      completedAt: "2026-07-04T15:00:00.000Z",
    }]);
    const confirmation = buildModelRouteConfirmationReceipt({
      taskType: "chapter_review",
      primaryProviderName: "DeepSeek · deepseek-chat",
      fallbackProviderName: "Kimi · kimi-k2.6",
      reason: "完成调整模型路由派单，已保存新首选模型。",
      source: "manual",
      createdAt: "2026-07-04T15:30:00.000Z",
    });

    const followUps = buildRouteConfirmationGovernanceFollowUpDispatches(routeGovernanceEvidence, {
      routeConfirmations: [confirmation],
    });
    const recheck = buildModelRouteConfirmationDispatch(confirmation);

    assert.equal(followUps.some((item) => item.actionLabel === "调整模型路由"), false);
    assert.equal(recheck.stage, "model_route_confirmation_recheck");
    assert.ok(recheck.detail.includes("DeepSeek"));
  });

  await t.test("marks the current route when it already matches the recommendation", () => {
    const recommendations = buildRouteRecommendations([
      {
        id: "asset-1",
        taskType: "control_asset_generate",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 1100,
        outputTokens: 700,
        costUsd: 0.004,
        outputText: JSON.stringify({ qualityGate: { score: 86 } }),
      },
      {
        id: "asset-2",
        taskType: "control_asset_generate",
        providerConfigId: "gpt-provider",
        status: "succeeded",
        inputTokens: 1150,
        outputTokens: 720,
        costUsd: 0.004,
        outputText: JSON.stringify({ qualityGate: { score: 84 } }),
      },
    ], [
      {
        taskType: "control_asset_generate",
        primaryProviderConfigId: "gpt-provider",
        fallbackProviderConfigId: null,
      },
    ], [
      { ...gptProvider, defaultModel: "gpt-4.1" },
    ]);

    const asset = recommendations.find((item) => item.taskType === "control_asset_generate");

    assert.equal(asset?.status, "current");
    assert.equal(asset?.averageQualityScore, 85);
  });

  await t.test("applies learned avoidance rules before recommending the next batch route", () => {
    const recommendations = buildRouteRecommendations([
      {
        id: "draft-deepseek-1",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1200,
        outputTokens: 2200,
        costUsd: 0.003,
        outputText: JSON.stringify({ score: 88 }),
      },
      {
        id: "draft-deepseek-2",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1180,
        outputTokens: 2100,
        costUsd: 0.003,
        outputText: JSON.stringify({ score: 86 }),
      },
      {
        id: "draft-kimi-1",
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        status: "succeeded",
        inputTokens: 1300,
        outputTokens: 2300,
        costUsd: 0.008,
        outputText: JSON.stringify({ score: 84 }),
      },
      {
        id: "draft-kimi-2",
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        status: "succeeded",
        inputTokens: 1320,
        outputTokens: 2350,
        costUsd: 0.008,
        outputText: JSON.stringify({ score: 83 }),
      },
    ], [], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], {
      avoidanceRules: [
        {
          taskType: "chapter_draft",
          providerId: "deepseek",
          model: "deepseek-chat",
          reason: "第三轮恢复闭环：DeepSeek 失败路线降级到 Kimi 备用模型。",
          evidence: ["已暂停 deepseek-chat 批量路线"],
        },
      ],
    });

    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(draft?.recommendedPrimaryProviderConfigId, "kimi-provider");
    assert.equal(draft?.avoidance.status, "applied");
    assert.equal(draft?.avoidance.appliedRules, 1);
    assert.ok(draft?.reason.includes("避开 DeepSeek"));
    assert.ok(draft?.avoidance.evidence.includes("已暂停 deepseek-chat 批量路线"));
  });

  await t.test("extracts learned avoidance rules from completed route repair dispatches", () => {
    const rules = buildRouteAvoidanceRulesFromDispatchTasks([
      {
        stage: "failure_route_repair",
        state: "completed",
        completionEvidence: "已把 DeepSeek 失败路线降级到 Kimi 备用模型，暂停 deepseek-chat 批量路线。",
        evidence: ["第三轮恢复闭环"],
      },
      {
        stage: "failure_config_repair",
        state: "completed",
        completionEvidence: "已补齐 Kimi Key。",
        evidence: [],
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
    ]);

    assert.equal(rules.length, 1);
    assert.equal(rules[0].providerConfigId, "deepseek-provider");
    assert.equal(rules[0].providerId, "deepseek");
    assert.equal(rules[0].model, "deepseek-chat");
    assert.ok(rules[0].reason.includes("降级到 Kimi"));
    assert.ok(rules[0].evidence?.includes("第三轮恢复闭环"));
  });

  await t.test("builds a governance view for learned route avoidance rules", () => {
    const governance = buildRouteAvoidanceGovernance([
      {
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "已把 DeepSeek 失败路线降级到 Kimi 备用模型，暂停 deepseek-chat 批量路线。",
        evidence: ["第三轮恢复闭环", "未恢复 0"],
      },
      {
        taskType: "chapter_review",
        providerConfigId: "gpt-provider",
        providerId: "gpt",
        model: "gpt-4.1",
        reason: "章节审稿 JSON 不稳定，先限定在审稿任务观察。",
        evidence: ["审稿失败 2 次"],
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "gpt-provider",
        providerId: "gpt",
        displayName: "GPT",
        defaultModel: "gpt-4.1",
        enabled: true,
        encryptedApiKey: "key",
      },
    ]);

    assert.equal(governance.summary.totalRules, 2);
    assert.equal(governance.summary.globalRules, 1);
    assert.equal(governance.summary.scopedRules, 1);
    assert.equal(governance.items[0].providerName, "DeepSeek");
    assert.equal(governance.items[0].taskScope, "全部写作任务");
    assert.equal(governance.items[0].riskLevel, "high");
    assert.equal(governance.items[0].actionLabel, "限定任务类型");
    assert.ok(governance.items[0].reviewAction.includes("人工解除观察"));
    assert.ok(governance.items[0].scopeOptions.some((option) => option.taskType === "chapter_draft" && option.label === "正文初稿"));
    assert.ok(governance.items[0].scopeOptions.some((option) => option.taskType === "first_three_rewrite" && option.label === "前三章改写"));
    assert.equal(governance.items[1].taskScope, "章节审稿");
    assert.ok(governance.nextActions.some((action) => action.includes("全局避坑规则")));
  });

  await t.test("applies manual avoidance governance actions before routing", () => {
    const rawRules = [
      {
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "DeepSeek 失败路线降级到 Kimi。",
        evidence: ["第三轮恢复闭环"],
      },
      {
        providerConfigId: "gpt-provider",
        providerId: "gpt",
        model: "gpt-4.1",
        reason: "GPT 审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
      },
    ];
    const effective = applyRouteAvoidanceOverrides(rawRules, [
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[0]),
        action: "scope_task",
        taskType: "chapter_review",
        note: "只在审稿任务继续观察。",
      },
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[1]),
        action: "dismiss",
        note: "人工复测通过，解除观察。",
      },
    ]);

    assert.equal(effective.length, 1);
    assert.equal(effective[0].providerId, "deepseek");
    assert.equal(effective[0].taskType, "chapter_review");
    assert.ok(effective[0].governanceNote?.includes("继续观察"));

    const recommendations = buildRouteRecommendations([
      {
        id: "draft-deepseek-1",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 86 }),
      },
      {
        id: "draft-deepseek-2",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 85 }),
      },
    ], [], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], { avoidanceRules: effective });

    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(draft?.recommendedPrimaryProviderConfigId, "deepseek-provider");
    assert.equal(draft?.avoidance.status, "none");
  });

  await t.test("explains restored candidates after dismissing a passed route retest", () => {
    const rawRules = [
      {
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "DeepSeek 初稿路线曾经失败。",
        evidence: ["第三轮恢复闭环"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ];
    const providers = [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ];
    const overrides = [
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[0]),
        action: "dismiss" as const,
        note: "复测通过，解除观察。",
        updatedAt: "2026-07-04T08:00:00.000Z",
      },
    ];
    const decisionHistory = buildRouteAvoidanceDecisionHistory(rawRules, overrides, providers, {
      retestDispatches: [
        {
          dispatchKey: "model-route-retest:deepseek-provider:deepseek-chat",
          stage: "model_route_retest",
          state: "completed",
          completionEvidence: "完成 3 个小样本复测，成功率 100%，质量 86，成本正常，未命中备用路线。",
          evidence: ["复测通过"],
          completedAt: "2026-07-04T07:30:00.000Z",
        },
      ],
    });
    const effective = applyRouteAvoidanceOverrides(rawRules, overrides);
    const recommendations = buildRouteRecommendations([
      {
        id: "draft-deepseek-1",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 88 }),
      },
      {
        id: "draft-deepseek-2",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 87 }),
      },
    ], [], providers, {
      avoidanceRules: effective,
      routeAvoidanceDecisionHistory: decisionHistory,
    });

    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(draft?.recommendedPrimaryProviderConfigId, "deepseek-provider");
    assert.equal(draft?.avoidance.status, "none");
    assert.ok(draft?.reason.includes("复测通过，恢复候选"));
    assert.ok(draft?.reason.includes("成功率 100%"));
    assert.ok(draft?.reason.includes("质量 86"));
  });

  await t.test("explains extended watch governance inside route recommendations", () => {
    const rawRules = [
      {
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "DeepSeek 批量路线需要继续观察。",
        evidence: ["第三轮恢复闭环"],
      },
    ];
    const effective = applyRouteAvoidanceOverrides(rawRules, [
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[0]),
        action: "extend_watch",
        expiresAt: "2026-07-18T00:00:00.000Z",
        note: "复测仍异常，延长观察。",
      },
    ]);
    const recommendations = buildRouteRecommendations([
      {
        id: "draft-deepseek-1",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 88 }),
      },
      {
        id: "draft-deepseek-2",
        taskType: "chapter_draft",
        providerConfigId: "deepseek-provider",
        status: "succeeded",
        inputTokens: 1000,
        outputTokens: 1200,
        costUsd: 0.002,
        outputText: JSON.stringify({ score: 86 }),
      },
    ], [], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], { avoidanceRules: effective });

    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(draft?.recommendedPrimaryProviderConfigId, null);
    assert.equal(draft?.avoidance.status, "applied");
    assert.ok(draft?.reason.includes("延长观察到 2026-07-18"));
    assert.ok(draft?.reason.includes("复测仍异常"));
    assert.ok(draft?.avoidance.evidence.some((item) => item.includes("延长观察到 2026-07-18")));
  });

  await t.test("shows extended watch windows in governance", () => {
    const rawRules = [
      {
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "DeepSeek 批量路线需要继续观察。",
        evidence: ["第三轮恢复闭环"],
      },
    ];
    const effective = applyRouteAvoidanceOverrides(rawRules, [
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[0]),
        action: "extend_watch",
        expiresAt: "2026-07-20T00:00:00.000Z",
        note: "再跑两批后复核。",
      },
    ]);
    const governance = buildRouteAvoidanceGovernance(effective, [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ]);

    assert.equal(governance.items[0].watchUntil, "2026-07-20T00:00:00.000Z");
    assert.ok(governance.items[0].reviewAction.includes("2026-07-20"));
    assert.ok(governance.items[0].reviewAction.includes("再跑两批"));
  });

  await t.test("builds a retest queue for expired and upcoming avoidance watch windows", () => {
    const governance = buildRouteAvoidanceGovernance([
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
      {
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        providerId: "kimi",
        model: "kimi-k2.6",
        reason: "正文初稿速度波动。",
        evidence: ["超时 1 次"],
        watchUntil: "2026-07-05T00:00:00.000Z",
      },
      {
        providerConfigId: "gpt-provider",
        providerId: "gpt",
        model: "gpt-4.1",
        reason: "全局成本异常。",
        evidence: ["成本偏高"],
        watchUntil: "2026-07-20T00:00:00.000Z",
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "gpt-provider",
        providerId: "gpt",
        displayName: "GPT",
        defaultModel: "gpt-4.1",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], { now: "2026-07-03T00:00:00.000Z" });

    assert.equal(governance.retestQueue.summary.total, 3);
    assert.equal(governance.retestQueue.summary.due, 1);
    assert.equal(governance.retestQueue.summary.upcoming, 1);
    assert.equal(governance.retestQueue.summary.waiting, 1);
    assert.equal(governance.retestQueue.items[0].status, "due");
    assert.equal(governance.retestQueue.items[0].providerName, "DeepSeek");
    assert.equal(governance.retestQueue.items[0].taskType, "chapter_review");
    assert.equal(governance.retestQueue.items[0].daysUntilDue, -2);
    assert.ok(governance.retestQueue.items[0].actionLabel.includes("立即复测"));
    assert.ok(governance.retestQueue.items[1].actionLabel.includes("即将复测"));
    assert.ok(governance.nextActions.some((action) => action.includes("1 条避坑规则已到复测日")));
  });

  await t.test("turns a due avoidance retest queue item into a dispatch task", () => {
    const governance = buildRouteAvoidanceGovernance([
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], { now: "2026-07-03T00:00:00.000Z" });
    const dispatch = buildRouteAvoidanceRetestDispatch(governance.retestQueue.items[0]);

    assert.equal(dispatch.dispatchKey, "model-route-retest:deepseek-provider:deepseek-chat");
    assert.equal(dispatch.platformId, "model-routing");
    assert.equal(dispatch.platformName, "模型路由");
    assert.equal(dispatch.stage, "model_route_retest");
    assert.equal(dispatch.state, "assigned");
    assert.equal(dispatch.priorityScore, 90);
    assert.equal(dispatch.ownerRole, "模型治理");
    assert.equal(dispatch.href, "/settings/models");
    assert.equal(dispatch.actionLabel, "运行复测样本");
    assert.ok(dispatch.title.includes("DeepSeek"));
    assert.ok(dispatch.detail.includes("章节审稿"));
    assert.ok(dispatch.acceptanceCriteria.some((item) => item.includes("2 个小样本")));
    assert.ok(dispatch.evidence.some((item) => item.includes("审稿失败 2 次")));
  });

  await t.test("recommends governance actions from completed route retest evidence", () => {
    const governance = buildRouteAvoidanceGovernance([
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
      {
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        providerId: "kimi",
        model: "kimi-k2.6",
        reason: "正文初稿速度波动。",
        evidence: ["超时 1 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], {
      now: "2026-07-03T00:00:00.000Z",
      retestDispatches: [
        {
          dispatchKey: "model-route-retest:deepseek-provider:deepseek-chat",
          stage: "model_route_retest",
          state: "completed",
          completionEvidence: "完成 3 个小样本复测，成功率 100%，质量 86，成本正常，未命中备用路线。",
          evidence: ["复测通过"],
          completedAt: "2026-07-03T02:00:00.000Z",
        },
        {
          dispatchKey: "model-route-retest:kimi-provider:kimi-k2.6",
          stage: "model_route_retest",
          state: "completed",
          completionEvidence: "完成 2 个小样本复测，1 个超时，成功率 50%，质量 62，命中备用路线。",
          evidence: ["复测失败"],
          completedAt: "2026-07-03T03:00:00.000Z",
        },
      ],
    });

    assert.equal(governance.retestReview.summary.total, 2);
    assert.equal(governance.retestReview.summary.dismissRecommended, 1);
    assert.equal(governance.retestReview.summary.extendWatchRecommended, 1);
    assert.equal(governance.retestReview.items[0].recommendedAction, "extend_watch");
    assert.equal(governance.retestReview.items[0].providerName, "Kimi");
    assert.equal(governance.retestReview.items[0].successRatePercent, 50);
    assert.equal(governance.retestReview.items[0].qualityScore, 62);
    assert.ok(governance.retestReview.items[0].actionLabel.includes("继续观察"));
    assert.equal(governance.retestReview.items[1].recommendedAction, "dismiss");
    assert.equal(governance.retestReview.items[1].confidence, "high");
    assert.equal(governance.retestReview.items[1].successRatePercent, 100);
    assert.equal(governance.retestReview.items[1].qualityScore, 86);
    assert.ok(governance.retestReview.items[1].actionLabel.includes("解除观察"));
    assert.ok(governance.nextActions.some((action) => action.includes("1 条复测已通过")));
  });

  await t.test("keeps applied retest governance decisions visible after overrides change active rules", () => {
    const rawRules = [
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
      {
        taskType: "chapter_draft",
        providerConfigId: "kimi-provider",
        providerId: "kimi",
        model: "kimi-k2.6",
        reason: "正文初稿速度波动。",
        evidence: ["超时 1 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ];
    const providers = [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
    ];
    const overrides = [
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[0]),
        action: "dismiss" as const,
        note: "复测通过，解除观察。",
        updatedAt: "2026-07-04T08:00:00.000Z",
      },
      {
        ruleKey: buildRouteAvoidanceRuleKey(rawRules[1]),
        action: "extend_watch" as const,
        expiresAt: "2026-07-18T00:00:00.000Z",
        note: "复测仍异常，延长观察。",
        updatedAt: "2026-07-04T09:00:00.000Z",
      },
    ];
    const retestDispatches = [
      {
        dispatchKey: "model-route-retest:deepseek-provider:deepseek-chat",
        stage: "model_route_retest",
        state: "completed",
        completionEvidence: "完成 3 个小样本复测，成功率 100%，质量 86，成本正常，未命中备用路线。",
        evidence: ["复测通过"],
        completedAt: "2026-07-04T07:30:00.000Z",
      },
      {
        dispatchKey: "model-route-retest:kimi-provider:kimi-k2.6",
        stage: "model_route_retest",
        state: "completed",
        completionEvidence: "完成 2 个小样本复测，1 个超时，成功率 50%，质量 62，命中备用路线。",
        evidence: ["复测失败"],
        completedAt: "2026-07-04T08:30:00.000Z",
      },
    ];

    const activeRules = applyRouteAvoidanceOverrides(rawRules, overrides);
    const history = buildRouteAvoidanceDecisionHistory(rawRules, overrides, providers, { retestDispatches });
    const dismissed = history.items.find((item) => item.ruleKey === "deepseek-provider:deepseek-chat");
    const extended = history.items.find((item) => item.ruleKey === "kimi-provider:kimi-k2.6");

    assert.equal(activeRules.length, 1);
    assert.equal(activeRules[0].providerId, "kimi");
    assert.equal(history.summary.total, 2);
    assert.equal(history.summary.dismissed, 1);
    assert.equal(history.summary.extendedWatch, 1);
    assert.equal(dismissed?.actionLabel, "已解除观察");
    assert.equal(dismissed?.latestRetest?.successRatePercent, 100);
    assert.equal(dismissed?.latestRetest?.qualityScore, 86);
    assert.ok(dismissed?.latestRetest?.completionEvidence.includes("未命中备用路线"));
    assert.equal(extended?.actionLabel, "已延长观察");
    assert.equal(extended?.expiresAt, "2026-07-18T00:00:00.000Z");
    assert.equal(extended?.latestRetest?.recommendedAction, "extend_watch");
  });

  await t.test("builds an executable sample plan for scoped route retests", () => {
    const governance = buildRouteAvoidanceGovernance([
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["审稿失败 2 次"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
      {
        providerConfigId: "kimi-provider",
        providerId: "kimi",
        model: "kimi-k2.6",
        reason: "全局路线异常。",
        evidence: ["全局失败"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        defaultModel: "kimi-k2.6",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], { now: "2026-07-03T00:00:00.000Z" });

    const scopedPlan = buildRouteAvoidanceRetestSamplePlan(governance.retestQueue.items[0], [
      {
        id: "project-1",
        title: "雨夜系统",
        targetPlatform: "fanqie",
        chapters: [
          {
            id: "chapter-1",
            order: 1,
            title: "第一章 雨夜系统",
            wordCount: 1200,
            status: "draft",
            goal: "遭遇系统",
            hook: "雨夜倒计时出现",
            conflict: "必须救人",
            valueShift: "普通生活转向危机",
            cliffhanger: "第二个任务刷新",
          },
          {
            id: "chapter-2",
            order: 2,
            title: "第二章 备用路线",
            wordCount: 1000,
            status: "draft",
            goal: "逃出小区",
            hook: "门外有人敲门",
            conflict: "邻居不可信",
            valueShift: "求生转向反击",
            cliffhanger: "奖励变成惩罚",
          },
        ],
        aiTasks: [
          {
            id: "old-review",
            chapterId: "chapter-2",
            taskType: "chapter_review",
            status: "succeeded",
            outputText: JSON.stringify({ score: 88, issues: [], summary: "ok" }),
            errorMessage: null,
            createdAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      },
    ]);
    const globalPlan = buildRouteAvoidanceRetestSamplePlan(governance.retestQueue.items[1], []);

    assert.equal(scopedPlan.canRun, true);
    assert.equal(scopedPlan.taskType, "chapter_review");
    assert.equal(scopedPlan.providerConfigId, "deepseek-provider");
    assert.equal(scopedPlan.providerId, "deepseek");
    assert.equal(scopedPlan.model, "deepseek-chat");
    assert.equal(scopedPlan.projectId, "project-1");
    assert.deepEqual(scopedPlan.chapterIds, ["chapter-1"]);
    assert.equal(scopedPlan.sampleCount, 1);
    assert.ok(scopedPlan.actionLabel.includes("运行"));
    assert.ok(scopedPlan.warning.includes("复测模式"));
    assert.equal(globalPlan.canRun, false);
    assert.equal(globalPlan.status, "needs_scope");
    assert.ok(globalPlan.reason.includes("限定任务"));
  });

  await t.test("turns forced retest sample results into governance evidence", () => {
    const evidence = buildRouteAvoidanceRetestEvidence({
      plan: {
        providerName: "DeepSeek",
        model: "deepseek-chat",
        taskScope: "章节审稿",
        sampleCount: 2,
      },
      results: [
        { status: "succeeded", score: 86, routeRole: "forced", error: null },
        { status: "succeeded", score: 84, routeRole: "forced", error: null },
      ],
    });
    const governance = buildRouteAvoidanceGovernance([
      {
        taskType: "chapter_review",
        providerConfigId: "deepseek-provider",
        providerId: "deepseek",
        model: "deepseek-chat",
        reason: "审稿 JSON 不稳定。",
        evidence: ["历史失败"],
        watchUntil: "2026-07-01T00:00:00.000Z",
      },
    ], [
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        defaultModel: "deepseek-chat",
        enabled: true,
        encryptedApiKey: "key",
      },
    ], {
      now: "2026-07-03T00:00:00.000Z",
      retestDispatches: [{
        dispatchKey: "model-route-retest:deepseek-provider:deepseek-chat",
        stage: "model_route_retest",
        state: "completed",
        completionEvidence: evidence.completionEvidence,
        evidence: evidence.evidence,
        completedAt: "2026-07-03T00:00:00.000Z",
      }],
    });

    assert.equal(evidence.successRatePercent, 100);
    assert.equal(evidence.averageQualityScore, 85);
    assert.ok(evidence.completionEvidence.includes("成功率 100%"));
    assert.ok(evidence.completionEvidence.includes("质量 85"));
    assert.ok(evidence.completionEvidence.includes("未命中备用路线"));
    assert.equal(governance.retestReview.items[0].recommendedAction, "dismiss");
  });
});
