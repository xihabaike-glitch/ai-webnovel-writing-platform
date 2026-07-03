import test from "node:test";
import assert from "node:assert/strict";
import { buildPresetRouteBlueprint } from "../lib/model-gateway/presetRouteBlueprint.ts";
import { selectModelProviderCandidatesForTask, selectModelProviderForTask } from "../lib/model-gateway/providerSelection.ts";
import { buildRouteRecommendations } from "../lib/model-gateway/routeRecommendations.ts";
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
});
