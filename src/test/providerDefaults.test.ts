import test from "node:test";
import assert from "node:assert/strict";
import { getProviderModelPresets, providerModelPresets, providerOptions } from "../lib/model-gateway/providerDefaults.ts";

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
});
