import test from "node:test";
import assert from "node:assert/strict";
import { buildPresetRouteBlueprint } from "../lib/model-gateway/presetRouteBlueprint.ts";
import { selectModelProviderCandidatesForTask, selectModelProviderForTask } from "../lib/model-gateway/providerSelection.ts";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceRuleKey,
  buildRouteAvoidanceRulesFromDispatchTasks,
  buildRouteRecommendations,
} from "../lib/model-gateway/routeRecommendations.ts";
import { labelForRoutedTask, modelTaskRouteOptions } from "../lib/model-gateway/taskRouting.ts";

const mockProvider = {
  id: "mock-provider",
  providerId: "mock",
  displayName: "Mock",
  enabled: true,
  encryptedApiKey: null,
};

const gptProvider = {
  id: "gpt-provider",
  providerId: "gpt",
  displayName: "GPT",
  enabled: true,
  encryptedApiKey: "key",
};

const disabledClaude = {
  id: "claude-provider",
  providerId: "claude",
  displayName: "Claude",
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
    ]);

    const review = recommendations.find((item) => item.taskType === "chapter_review");
    const draft = recommendations.find((item) => item.taskType === "chapter_draft");

    assert.equal(review?.status, "ready");
    assert.equal(review?.recommendedPrimaryProviderConfigId, "gpt-provider");
    assert.equal(review?.successRatePercent, 100);
    assert.equal(review?.averageQualityScore, 89);
    assert.equal(review?.averageCostPerSucceededTaskUsd, 0.007);
    assert.equal(draft?.status, "insufficient");
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
});
