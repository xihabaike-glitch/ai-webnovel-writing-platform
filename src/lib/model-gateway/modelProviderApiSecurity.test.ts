import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { PassThrough } from "node:stream";
import test, { type TestContext } from "node:test";
import type { ModelProvider } from "@prisma/client";
import { POST as saveProvider } from "../../app/api/model-providers/route.ts";
import { POST as testProvider } from "../../app/api/model-providers/test/route.ts";
import { prisma } from "../db/prisma.ts";

const expectedFailure = {
  error: "模型凭据加密配置无效。",
  errorCategory: "credential_configuration_error",
  repairHint: "请运行 npm run setup，或将 MODEL_CREDENTIAL_SECRET 配置为解码后恰好 32 字节的值。",
};
const credentialSecret = Buffer.alloc(32, 12).toString("base64");
const require = createRequire(import.meta.url);

test("provider save returns a stable configuration error when the credential secret is missing", async () => {
  await withCredentialSecret(undefined, async () => {
    const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
      providerId: "openai_compatible",
      displayName: "Gateway",
      baseUrl: "https://gateway.example.com/v1",
      apiKey: "sk-secret",
      defaultModel: "model",
    }));

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), expectedFailure);
  });
});

test("provider connection API returns the same stable error for an invalid secret", async () => {
  await withCredentialSecret("placeholder", async () => {
    const response = await testProvider(jsonRequest("http://localhost/api/model-providers/test", {
      providerId: "openai_compatible",
      baseUrl: "https://gateway.example.com/v1",
      apiKey: "sk-secret",
      defaultModel: "model",
    }));

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), expectedFailure);
  });
});

test("provider save requires key re-entry when provider identity changes", async (t) => {
  const existing = storedProvider();
  replaceProviderMethod(t, "findUnique", async () => existing);
  replaceProviderMethod(t, "update", async () => {
    assert.fail("identity-changing save must not update before key re-entry");
  });

  const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
    id: existing.id,
    providerId: "gpt",
    displayName: "GPT",
    baseUrl: existing.baseUrl,
    defaultModel: "gpt-5-mini",
  }));

  await assertCredentialReentry(response);
});

test("provider save requires key re-entry when normalized endpoint origin changes", async (t) => {
  const existing = storedProvider();
  replaceProviderMethod(t, "findUnique", async () => existing);
  replaceProviderMethod(t, "update", async () => {
    assert.fail("origin-changing save must not update before key re-entry");
  });

  const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
    id: existing.id,
    providerId: existing.providerId,
    displayName: existing.displayName,
    baseUrl: "https://other.example.com/v1",
    defaultModel: existing.defaultModel,
  }));

  await assertCredentialReentry(response);
});

test("provider save may retain a key when raw URLs share one normalized origin", async (t) => {
  const existing = storedProvider({ baseUrl: "https://Gateway.Example.com:443/v1" });
  let updateData: Record<string, unknown> | undefined;
  replaceProviderMethod(t, "findUnique", async () => existing);
  replaceProviderMethod(t, "updateMany", async (args: { data: Record<string, unknown> }) => {
    updateData = args.data;
    return { count: 1 };
  });

  const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
    id: existing.id,
    providerId: existing.providerId,
    displayName: existing.displayName,
    baseUrl: "https://gateway.example.com/other-path",
    defaultModel: existing.defaultModel,
  }));

  assert.equal(response.status, 200);
  assert(updateData);
  assert.equal(Object.hasOwn(updateData, "encryptedApiKey"), false);
});

test("provider save clears a stored key only when explicitly requested", async (t) => {
  const existing = storedProvider();
  let updateData: Record<string, unknown> | undefined;
  replaceProviderMethod(t, "findUnique", async () => existing);
  replaceProviderMethod(t, "update", async (args: { data: Record<string, unknown> }) => {
    updateData = args.data;
    return { ...existing, ...args.data };
  });

  const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
    id: existing.id,
    providerId: existing.providerId,
    displayName: existing.displayName,
    baseUrl: existing.baseUrl,
    apiKey: "",
    defaultModel: existing.defaultModel,
    enabled: existing.enabled,
  }));

  assert.equal(response.status, 200);
  assert.equal(updateData?.encryptedApiKey, null);
  const payload = await response.json() as { provider?: { hasApiKey?: boolean } };
  assert.equal(payload.provider?.hasApiKey, false);
});

test("provider save rejects stored-key reuse when a concurrent credential rotation wins", async (t) => {
  const existing = storedProvider();
  let staleUpdateData: Record<string, unknown> | undefined;
  replaceProviderMethod(t, "findUnique", async () => existing);
  replaceProviderMethod(t, "updateMany", async (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => {
    assert.deepEqual(args.where, {
      id: existing.id,
      providerId: existing.providerId,
      baseUrl: existing.baseUrl,
      encryptedApiKey: existing.encryptedApiKey,
    });
    assert.equal(Object.hasOwn(args.data, "encryptedApiKey"), false);
    return { count: 0 };
  });
  replaceProviderMethod(t, "update", async (args: { data: Record<string, unknown> }) => {
    // This simulates the old unconditional write pairing the stored key with stale identity data.
    staleUpdateData = args.data;
    return { ...existing, ...args.data };
  });

  const response = await saveProvider(jsonRequest("http://localhost/api/model-providers", {
    id: existing.id,
    providerId: existing.providerId,
    displayName: "Renamed Gateway",
    baseUrl: existing.baseUrl,
    defaultModel: existing.defaultModel,
  }));

  assert.equal(response.status, 409);
  assert.equal(staleUpdateData, undefined);
  assert.deepEqual(await response.json(), {
    error: "模型凭据已被其他保存操作更新，请重新加载后再试。",
    errorCategory: "credential_reuse_conflict",
    repairHint: "重新加载当前供应商配置，再决定是否保留或重新输入 API Key。",
  });
});

test("provider connection test requires key re-entry instead of replaying a key to a new origin", async (t) => {
  const existing = storedProvider();
  replaceProviderMethod(t, "findUnique", async () => existing);

  const response = await testProvider(jsonRequest("http://localhost/api/model-providers/test", {
    id: existing.id,
    providerId: existing.providerId,
    baseUrl: "https://192.0.2.2/v1",
    defaultModel: existing.defaultModel,
  }));

  await assertCredentialReentry(response);
});

test("provider connection test treats an explicit empty key as a safe credential clear", async (t) => {
  const existing = storedProvider();
  replaceProviderMethod(t, "findUnique", async () => existing);

  const response = await testProvider(jsonRequest("http://localhost/api/model-providers/test", {
    id: existing.id,
    providerId: existing.providerId,
    baseUrl: "https://192.0.2.2/v1",
    apiKey: "",
    defaultModel: existing.defaultModel,
  }));

  assert.equal(response.status, 200);
  const payload = await response.json() as { result?: { errorCategory?: string } };
  assert.equal(payload.result?.errorCategory, "missing_api_key");
});

test("provider connection test uses the new named provider default instead of a stale endpoint", async (t) => {
  const existing = storedProvider({ baseUrl: "https://stale.example.com/v1" });
  replaceProviderMethod(t, "findUnique", async () => existing);
  const transport = installHttpsTransport(t);

  await withCredentialSecret(credentialSecret, async () => {
    const response = await testProvider(jsonRequest("http://localhost/api/model-providers/test", {
      id: existing.id,
      providerId: "gpt",
      apiKey: "fresh-key",
      defaultModel: "gpt-5-mini",
    }));

    assert.equal(response.status, 200);
    const payload = await response.json() as { result?: { ok?: boolean } };
    assert.equal(payload.result?.ok, true);
    assert.equal(transport.outboundUrl?.toString(), "https://api.openai.com/v1/chat/completions");
  });
});

test("provider connection test rejects a changed custom provider without an endpoint", async (t) => {
  const existing = storedProvider({
    providerId: "gpt",
    displayName: "GPT",
    baseUrl: "https://stale.example.com/v1",
  });
  replaceProviderMethod(t, "findUnique", async () => existing);
  const transport = installHttpsTransport(t);

  await withCredentialSecret(credentialSecret, async () => {
    const response = await testProvider(jsonRequest("http://localhost/api/model-providers/test", {
      id: existing.id,
      providerId: "openai_compatible",
      apiKey: "fresh-key",
      defaultModel: "model",
    }));

    assert.equal(response.status, 200);
    const payload = await response.json() as { result?: { errorCategory?: string } };
    assert.equal(payload.result?.errorCategory, "invalid_endpoint");
    assert.equal(transport.outboundUrl, undefined);
  });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function withCredentialSecret(value: string | undefined, run: () => Promise<void>) {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  if (value === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
  else process.env.MODEL_CREDENTIAL_SECRET = value;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
}

function storedProvider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    id: "provider-1",
    providerId: "openai_compatible",
    displayName: "Gateway",
    baseUrl: "https://gateway.example.com/v1",
    encryptedApiKey: "enc:v1:stored-iv:stored-tag:stored-value",
    defaultModel: "model",
    enabled: true,
    maxContextTokens: null,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    ...overrides,
  };
}

function replaceProviderMethod(
  t: TestContext,
  methodName: "findUnique" | "update" | "updateMany",
  implementation: (...args: never[]) => unknown,
) {
  const delegate = prisma.modelProvider as unknown as Record<string, unknown>;
  const original = delegate[methodName];
  delegate[methodName] = implementation;
  t.after(() => {
    delegate[methodName] = original;
  });
}

function installHttpsTransport(t: TestContext) {
  const dns = require("node:dns") as typeof import("node:dns");
  const https = require("node:https") as typeof import("node:https");
  const dnsPromises = dns.promises as unknown as {
    lookup: (hostname: string, options?: { all?: boolean }) => Promise<unknown>;
  };
  const httpsModule = https as unknown as {
    request: (
      url: URL,
      options: object,
      callback: (response: import("node:http").IncomingMessage) => void,
    ) => import("node:http").ClientRequest;
  };
  const originalLookup = dnsPromises.lookup;
  const originalRequest = httpsModule.request;
  const transport: { outboundUrl?: URL } = {};

  dnsPromises.lookup = async (_hostname, options) => options?.all
    ? [{ address: "192.0.0.9", family: 4 }]
    : { address: "192.0.0.9", family: 4 };
  httpsModule.request = ((url, _options, callback) => {
    transport.outboundUrl = url;
    const request = new EventEmitter() as unknown as import("node:http").ClientRequest;
    request.end = () => {
      const responseStream = new PassThrough();
      const response = responseStream as unknown as import("node:http").IncomingMessage;
      response.statusCode = 200;
      response.headers = {};
      queueMicrotask(() => {
        callback(response);
        responseStream.end(JSON.stringify({ choices: [{ message: { content: "connected" } }] }));
      });
      return request;
    };
    request.destroy = () => request;
    return request;
  }) as typeof httpsModule.request;
  syncBuiltinESMExports();
  t.after(() => {
    dnsPromises.lookup = originalLookup;
    httpsModule.request = originalRequest;
    syncBuiltinESMExports();
  });

  return transport;
}

async function assertCredentialReentry(response: Response) {
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "更改供应商或接口域名后，请重新输入 API Key。",
    errorCategory: "credential_reentry_required",
    repairHint: "重新输入当前供应商和接口域名对应的 API Key，或明确清空该凭据。",
  });
}
