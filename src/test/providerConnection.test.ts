import test from "node:test";
import assert from "node:assert/strict";
import { testModelProviderConnection } from "../lib/model-gateway/providerConnection.ts";

test("testModelProviderConnection", async (t) => {
  await t.test("returns latency and sample text for a reachable provider", async () => {
    const result = await testModelProviderConnection(
      {
        providerId: "gpt",
        baseUrl: "https://api.example/v1",
        encryptedApiKey: "key",
        defaultModel: "test-model",
      },
      {
        fetchImpl: async (url, init) => {
          assert.equal(url, "https://api.example/v1/chat/completions");
          assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer key");
          return Response.json({
            choices: [{ message: { content: "模型连接正常。" } }],
            usage: { prompt_tokens: 8, completion_tokens: 4 },
          });
        },
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.status, "connected");
    assert.equal(result.testedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(result.sampleText, "模型连接正常。");
    assert.equal(result.usage?.inputTokens, 8);
    assert.equal(result.usage?.outputTokens, 4);
  });

  await t.test("returns repair guidance when api key is missing", async () => {
    const result = await testModelProviderConnection({
      providerId: "deepseek",
      baseUrl: "https://api.deepseek.com",
      encryptedApiKey: null,
      defaultModel: "deepseek-chat",
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
    assert.ok(result.errorMessage?.includes("requires an API key"));
    assert.ok(result.repairHint?.includes("API Key"));
  });
});
