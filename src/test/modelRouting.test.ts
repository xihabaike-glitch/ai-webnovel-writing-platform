import test from "node:test";
import assert from "node:assert/strict";
import { selectModelProviderForTask } from "../lib/model-gateway/providerSelection.ts";
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
});
