import test from "node:test";
import assert from "node:assert/strict";
import { buildModelSetupOnboarding } from "../lib/model-gateway/modelSetupOnboarding.ts";
import { getProviderModelPresets, providerInterfaceContracts, providerModelPresets, providerOptions } from "../lib/model-gateway/providerDefaults.ts";
import { buildProviderSetupGuide } from "../lib/model-gateway/providerSetupGuide.ts";
import { buildProviderSetupWizard } from "../lib/model-gateway/providerSetupWizard.ts";

test("provider model presets", async (t) => {
  await t.test("covers the named cloud providers with writing task presets", () => {
    const cloudProviderIds = ["gpt", "claude", "deepseek", "kimi"];

    for (const providerId of cloudProviderIds) {
      const option = providerOptions.find((item) => item.providerId === providerId);
      const presets = getProviderModelPresets(providerId);

      assert.ok(option, `${providerId} should be a provider option`);
      assert.ok(presets.length >= 2, `${providerId} should expose multiple model presets`);
      assert.ok(presets.every((preset) => preset.providerId === providerId));
      assert.ok(presets.some((preset) => preset.taskTags.includes("正文初稿") || preset.taskTags.includes("长篇规划")));
      assert.ok(presets.every((preset) => preset.model.trim().length > 0));
      assert.ok(presets.every((preset) => preset.maxContextTokens > 0));
    }
  });

  await t.test("keeps preset ids unique and exposes low cost batch options", () => {
    const ids = new Set(providerModelPresets.map((preset) => preset.id));

    assert.equal(ids.size, providerModelPresets.length);
    assert.ok(providerModelPresets.some((preset) => preset.providerId === "deepseek" && preset.taskTags.includes("低成本批量")));
    assert.ok(providerModelPresets.some((preset) => preset.providerId === "kimi" && preset.taskTags.includes("长篇规划")));
  });

  await t.test("documents concrete interface contracts for required cloud providers", () => {
    const requiredProviderIds = ["claude", "deepseek", "kimi", "gpt"];

    assert.deepEqual(providerInterfaceContracts.map((contract) => contract.providerId), requiredProviderIds);

    for (const contract of providerInterfaceContracts) {
      const option = providerOptions.find((item) => item.providerId === contract.providerId);

      assert.ok(option, `${contract.providerId} should link to a provider option`);
      assert.equal(contract.defaultBaseUrl, option?.defaultBaseUrl);
      assert.equal(contract.defaultModel, option?.defaultModel);
      assert.ok(contract.ownerRole.trim().length > 0);
      assert.ok(contract.connectionTestLabel.includes("连接测试"));
      assert.ok(contract.evidenceChecklist.includes("API Key"));
      assert.ok(contract.evidenceChecklist.includes("Base URL"));
      assert.ok(contract.evidenceChecklist.includes("默认模型"));
      assert.ok(contract.evidenceChecklist.includes("岗位路由"));
    }

    const claude = providerInterfaceContracts.find((contract) => contract.providerId === "claude");
    const openAiCompatible = providerInterfaceContracts.filter((contract) => contract.providerId !== "claude");

    assert.equal(claude?.protocolLabel, "Anthropic Messages API");
    assert.equal(claude?.authHeaderLabel, "x-api-key");
    assert.equal(claude?.requestPath, "/v1/messages");
    assert.ok(openAiCompatible.every((contract) => contract.protocolLabel === "OpenAI-compatible Chat Completions"));
    assert.ok(openAiCompatible.every((contract) => contract.authHeaderLabel === "Authorization: Bearer"));
    assert.ok(openAiCompatible.every((contract) => contract.requestPath === "/chat/completions"));
  });

  await t.test("builds a launch setup guide for required writing providers", () => {
    const guide = buildProviderSetupGuide({
      options: providerOptions,
      presets: providerModelPresets,
      providers: [
        {
          providerId: "deepseek",
          enabled: true,
          hasApiKey: true,
          baseUrl: "https://api.deepseek.com",
          defaultModel: "deepseek-chat",
          maxContextTokens: 64000,
        },
        {
          providerId: "kimi",
          enabled: true,
          hasApiKey: false,
          baseUrl: "https://api.moonshot.ai/v1",
          defaultModel: "kimi-k2.6",
          maxContextTokens: 128000,
        },
        {
          providerId: "ollama",
          enabled: true,
          hasApiKey: false,
          baseUrl: "http://localhost:11434",
          defaultModel: "qwen3:latest",
          maxContextTokens: null,
        },
      ],
    });

    const firstFour = guide.items.slice(0, 4).map((item) => item.providerId);
    const deepseek = guide.items.find((item) => item.providerId === "deepseek");
    const kimi = guide.items.find((item) => item.providerId === "kimi");
    const ollama = guide.items.find((item) => item.providerId === "ollama");
    const mock = guide.items.find((item) => item.providerId === "mock");

    assert.deepEqual(firstFour, ["deepseek", "kimi", "claude", "gpt"]);
    assert.equal(deepseek?.status, "ready");
    assert.equal(kimi?.status, "needs_key");
    assert.equal(ollama?.status, "needs_test");
    assert.equal(mock?.status, "optional");
    assert.ok(deepseek?.recommendedModels.includes("deepseek-chat"));
    assert.ok(kimi?.taskTags.includes("长篇规划"));
    assert.equal(guide.summary.ready, 1);
    assert.ok(guide.nextActions.some((action) => action.includes("API Key")));
  });

  await t.test("builds a true model setup wizard before first-day routing", () => {
    const wizard = buildProviderSetupWizard({
      options: providerOptions,
      presets: providerModelPresets,
      providers: [
        {
          providerId: "deepseek",
          enabled: true,
          hasApiKey: true,
          baseUrl: "https://api.deepseek.com",
          defaultModel: "deepseek-chat",
          maxContextTokens: 64000,
        },
        {
          providerId: "kimi",
          enabled: true,
          hasApiKey: false,
          baseUrl: "https://api.moonshot.ai/v1",
          defaultModel: "kimi-k2.6",
          maxContextTokens: 128000,
        },
        {
          providerId: "claude",
          enabled: false,
          hasApiKey: true,
          baseUrl: "https://api.anthropic.com",
          defaultModel: "claude-sonnet-4-5",
          maxContextTokens: 200000,
        },
      ],
    });

    const ids = wizard.items.map((item) => item.providerId);
    const deepseek = wizard.items.find((item) => item.providerId === "deepseek");
    const kimi = wizard.items.find((item) => item.providerId === "kimi");
    const claude = wizard.items.find((item) => item.providerId === "claude");
    const gpt = wizard.items.find((item) => item.providerId === "gpt");

    assert.deepEqual(ids, ["deepseek", "kimi", "claude", "gpt"]);
    assert.equal(deepseek?.status, "ready");
    assert.equal(kimi?.status, "needs_key");
    assert.equal(claude?.status, "needs_save");
    assert.equal(gpt?.status, "needs_key");
    assert.equal(wizard.summary.ready, 1);
    assert.equal(wizard.summary.needsKey, 2);
    assert.equal(wizard.summary.needsSave, 1);
    assert.ok(deepseek?.fitTags.includes("正文初稿"));
    assert.ok(wizard.nextActions.some((action) => action.includes("至少先接入 2 个真实模型")));
  });

  await t.test("builds a continuous setup onboarding flow before first-day execution", () => {
    const blocked = buildModelSetupOnboarding({
      providerSummary: {
        ready: 0,
        needsKey: 4,
        needsTest: 0,
      },
      firstDayRouteSummary: {
        configured: 0,
        needsRoute: 4,
        mockFallback: 0,
        applicableRecommendations: 0,
      },
    });
    const actionable = buildModelSetupOnboarding({
      providerSummary: {
        ready: 3,
        needsKey: 0,
        needsTest: 0,
      },
      firstDayRouteSummary: {
        configured: 1,
        needsRoute: 3,
        mockFallback: 0,
        applicableRecommendations: 3,
      },
    });

    assert.equal(blocked.currentStep.id, "providers");
    assert.equal(blocked.steps.find((item) => item.id === "connection")?.status, "blocked");
    assert.equal(actionable.currentStep.id, "routes");
    assert.equal(actionable.steps.find((item) => item.id === "providers")?.status, "done");
    assert.equal(actionable.steps.find((item) => item.id === "routes")?.action, "apply_routes");
    assert.ok(actionable.currentStep.detail.includes("3 条"));
  });
});
