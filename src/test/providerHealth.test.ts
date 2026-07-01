import test from "node:test";
import assert from "node:assert/strict";
import { buildProviderHealthDashboard } from "../lib/model-gateway/providerHealth.ts";

test("buildProviderHealthDashboard", async (t) => {
  await t.test("blocks enabled paid providers without api keys", () => {
    const dashboard = buildProviderHealthDashboard([
      {
        id: "deepseek-provider",
        providerId: "deepseek",
        displayName: "DeepSeek",
        baseUrl: null,
        encryptedApiKey: null,
        defaultModel: "deepseek-chat",
        enabled: true,
        maxContextTokens: null,
      },
      {
        id: "mock-provider",
        providerId: "mock",
        displayName: "Mock",
        baseUrl: null,
        encryptedApiKey: null,
        defaultModel: "mock-writer",
        enabled: true,
        maxContextTokens: 16000,
      },
    ]);

    assert.equal(dashboard.status, "blocked");
    assert.equal(dashboard.summary.blockedProviders, 1);
    assert.equal(dashboard.summary.missingApiKeyProviders, 1);
    assert.ok(dashboard.topRisks.some((risk) => risk.includes("API Key")));
    assert.ok(dashboard.nextActions.some((action) => action.includes("不可调用")));
  });

  await t.test("marks high context providers as long-form ready", () => {
    const dashboard = buildProviderHealthDashboard([
      {
        id: "kimi-provider",
        providerId: "kimi",
        displayName: "Kimi",
        baseUrl: "https://api.moonshot.ai/v1",
        encryptedApiKey: "secret",
        defaultModel: "kimi-k2.6",
        enabled: true,
        maxContextTokens: 128000,
      },
    ]);

    assert.equal(dashboard.status, "healthy");
    assert.equal(dashboard.score, 100);
    assert.equal(dashboard.summary.readyProviders, 1);
    assert.ok(dashboard.rows[0].taskFit.includes("长篇大纲"));
    assert.ok(dashboard.rows[0].taskFit.includes("整卷审稿"));
  });
});
