import test from "node:test";
import assert from "node:assert/strict";
import { buildModelRoleMatrix, buildModelRoleMatrixPriorityBlocker } from "../lib/model-gateway/modelRoleMatrix.ts";

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
});
