import assert from "node:assert/strict";
import test from "node:test";
import { OllamaAdapter, OpenAICompatibleAdapter } from "./adapters.ts";
import { testModelProviderConnection } from "./providerConnection.ts";
import { ModelGatewayError, type ModelRequest } from "./requestTransport.ts";

const credentialSecret = Buffer.alloc(32, 9).toString("base64");

test("Ollama sends no API key or Authorization header and does not require a credential secret", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  delete process.env.MODEL_CREDENTIAL_SECRET;
  let outbound: ModelRequest | undefined;

  try {
    const adapter = new OllamaAdapter(
      {
        providerId: "ollama",
        baseUrl: "http://localhost:11434",
        encryptedApiKey: "legacy-key-that-must-not-be-used",
      },
      {
        requestImpl: async (request) => {
          outbound = request;
          return { status: 200, headers: {}, payload: { message: { content: "local ok" } } };
        },
      },
    );

    const result = await adapter.generate({
      providerId: "ollama",
      model: "qwen",
      systemPrompt: "system",
      userPrompt: "user",
    });

    assert.equal(result.text, "local ok");
    assert.equal(outbound?.providerId, "ollama");
    assert.equal(hasHeader(outbound?.headers, "authorization"), false);
    assert.equal(hasHeader(outbound?.headers, "x-api-key"), false);
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

test("legacy plaintext runtime use fails with a stable credential configuration category", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  delete process.env.MODEL_CREDENTIAL_SECRET;
  let transportCalled = false;

  try {
    const adapter = new OpenAICompatibleAdapter(
      {
        providerId: "openai_compatible",
        baseUrl: "https://gateway.example.com/v1",
        encryptedApiKey: "legacy-api-key",
      },
      {
        requestImpl: async () => {
          transportCalled = true;
          throw new Error("must not run");
        },
      },
    );

    await assert.rejects(
      adapter.generate({
        providerId: "openai_compatible",
        model: "model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
      (error: unknown) => error instanceof ModelGatewayError
        && error.category === "credential_configuration_error",
    );
    assert.equal(transportCalled, false);
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

test("connection testing returns an actionable category for an invalid credential secret", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  process.env.MODEL_CREDENTIAL_SECRET = "placeholder";

  try {
    const result = await testModelProviderConnection(
      {
        providerId: "openai_compatible",
        baseUrl: "https://gateway.example.com/v1",
        encryptedApiKey: "legacy-api-key",
        defaultModel: "model",
      },
    );

    assert.equal(result.ok, false);
    assert.equal(result.errorCategory, "credential_configuration_error");
    assert.match(result.repairHint ?? "", /MODEL_CREDENTIAL_SECRET/);
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

test("valid JSON with an invalid provider shape stays in the invalid-response category", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  process.env.MODEL_CREDENTIAL_SECRET = credentialSecret;

  try {
    const adapter = new OpenAICompatibleAdapter(
      {
        providerId: "openai_compatible",
        baseUrl: "https://gateway.example.com/v1",
        encryptedApiKey: "legacy-api-key",
      },
      {
        requestImpl: async () => ({ status: 200, headers: {}, payload: null }),
      },
    );

    await assert.rejects(
      adapter.generate({
        providerId: "openai_compatible",
        model: "model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
      (error: unknown) => error instanceof ModelGatewayError && error.category === "invalid_response",
    );
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

test("OpenAI-compatible providers use their own default Base URL when none is saved", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  process.env.MODEL_CREDENTIAL_SECRET = credentialSecret;
  const expectedBaseUrls = {
    gpt: "https://api.openai.com/v1",
    deepseek: "https://api.deepseek.com",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  } as const;

  try {
    for (const providerId of ["gpt", "deepseek", "gemini"] as const) {
      const expectedBaseUrl = expectedBaseUrls[providerId];
      let outbound: ModelRequest | undefined;
      const adapter = new OpenAICompatibleAdapter(
        {
          providerId,
          baseUrl: null,
          encryptedApiKey: "legacy-api-key",
        },
        {
          requestImpl: async (request) => {
            outbound = request;
            return { status: 200, headers: {}, payload: { choices: [{ message: { content: "ok" } }] } };
          },
        },
      );

      const result = await adapter.generate({
        providerId,
        model: "model",
        systemPrompt: "system",
        userPrompt: "user",
      });

      assert.equal(result.text, "ok");
      assert.equal(outbound?.baseUrl, expectedBaseUrl, `${providerId} must use its provider default`);
    }
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

test("OpenAI-compatible custom provider rejects a missing Base URL before dispatch", async () => {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  process.env.MODEL_CREDENTIAL_SECRET = credentialSecret;
  let transportCalled = false;

  try {
    const adapter = new OpenAICompatibleAdapter(
      {
        providerId: "openai_compatible",
        baseUrl: null,
        encryptedApiKey: "legacy-api-key",
      },
      {
        requestImpl: async () => {
          transportCalled = true;
          return { status: 200, headers: {}, payload: { choices: [{ message: { content: "must not dispatch" } }] } };
        },
      },
    );

    await assert.rejects(
      adapter.generate({
        providerId: "openai_compatible",
        model: "model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
      (error: unknown) => error instanceof ModelGatewayError && error.category === "invalid_endpoint",
    );
    assert.equal(transportCalled, false);
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
});

function hasHeader(headers: Record<string, string> | undefined, name: string) {
  return Object.entries(headers ?? {}).some(([header]) => header.toLowerCase() === name);
}
