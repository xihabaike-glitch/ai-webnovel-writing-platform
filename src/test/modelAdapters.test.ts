import test from "node:test";
import assert from "node:assert/strict";
import { AnthropicMessagesAdapter, OpenAICompatibleAdapter, OllamaAdapter } from "../lib/model-gateway/adapters.ts";

const request = {
  providerId: "gpt" as const,
  model: "test-model",
  systemPrompt: "system",
  userPrompt: "user",
};

test("model adapters", async (t) => {
  await t.test("parses OpenAI-compatible chat completions", async () => {
    const adapter = new OpenAICompatibleAdapter(
      { providerId: "gpt", baseUrl: "https://api.example/v1", encryptedApiKey: "key" },
      async (url, init) => {
        assert.equal(url, "https://api.example/v1/chat/completions");
        assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer key");
        return Response.json({
          choices: [{ message: { content: "draft text" } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        });
      },
    );

    const result = await adapter.generate(request);
    assert.equal(result.text, "draft text");
    assert.equal(result.usage?.inputTokens, 10);
    assert.equal(result.usage?.outputTokens, 20);
  });

  await t.test("parses Anthropic Messages text blocks", async () => {
    const adapter = new AnthropicMessagesAdapter(
      { providerId: "claude", baseUrl: "https://api.anthropic.test", encryptedApiKey: "key" },
      async (url, init) => {
        assert.equal(url, "https://api.anthropic.test/v1/messages");
        assert.equal((init?.headers as Record<string, string>)["x-api-key"], "key");
        return Response.json({
          content: [{ type: "text", text: "claude draft" }],
          usage: { input_tokens: 11, output_tokens: 22 },
        });
      },
    );

    const result = await adapter.generate({ ...request, providerId: "claude" });
    assert.equal(result.text, "claude draft");
    assert.equal(result.usage?.inputTokens, 11);
    assert.equal(result.usage?.outputTokens, 22);
  });

  await t.test("parses Ollama chat response", async () => {
    const adapter = new OllamaAdapter(
      { providerId: "ollama", baseUrl: "http://localhost:11434", encryptedApiKey: null },
      async (url) => {
        assert.equal(url, "http://localhost:11434/api/chat");
        return Response.json({
          message: { content: "local draft" },
          prompt_eval_count: 12,
          eval_count: 24,
        });
      },
    );

    const result = await adapter.generate({ ...request, providerId: "ollama" });
    assert.equal(result.text, "local draft");
    assert.equal(result.usage?.inputTokens, 12);
    assert.equal(result.usage?.outputTokens, 24);
  });
});
