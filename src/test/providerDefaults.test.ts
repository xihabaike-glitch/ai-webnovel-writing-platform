import test from "node:test";
import assert from "node:assert/strict";
import { getProviderModelPresets, providerModelPresets, providerOptions } from "../lib/model-gateway/providerDefaults.ts";
import { buildProviderSetupGuide } from "../lib/model-gateway/providerSetupGuide.ts";

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
});
