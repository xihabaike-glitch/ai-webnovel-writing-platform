import assert from "node:assert/strict";
import test from "node:test";
import type { ModelProvider } from "@prisma/client";
import {
  loadModelProviderById,
  loadModelProviders,
  type ProviderStoreDatabase,
} from "./providerStore.ts";

const credentialSecret = Buffer.alloc(32, 17).toString("base64");

test("migrates a legacy credential with a compare-and-swap update", async () => {
  await withCredentialSecret(async () => {
    const original = provider({ encryptedApiKey: "legacy-api-key" });
    const updateCalls: unknown[] = [];
    const database = fakeDatabase({
      findMany: async () => [original],
      updateMany: async (args) => {
        updateCalls.push(args);
        return { count: 1 };
      },
    });

    const [loaded] = await loadModelProviders(database);

    assert.match(loaded?.encryptedApiKey ?? "", /^enc:v1:/);
    assert.equal(updateCalls.length, 1);
    assert.deepEqual((updateCalls[0] as { where: unknown }).where, {
      id: original.id,
      encryptedApiKey: original.encryptedApiKey,
    });
  });
});

test("refetches after a migration CAS conflict and preserves a concurrent credential clear", async () => {
  await withCredentialSecret(async () => {
    const original = provider({ encryptedApiKey: "legacy-api-key" });
    const cleared = provider({ encryptedApiKey: null });
    let findUniqueCalls = 0;
    const database = fakeDatabase({
      findUnique: async () => {
        findUniqueCalls += 1;
        return findUniqueCalls === 1 ? original : cleared;
      },
      updateMany: async () => ({ count: 0 }),
    });

    const loaded = await loadModelProviderById(original.id, database);

    assert.equal(findUniqueCalls, 2);
    assert.equal(loaded?.encryptedApiKey, null);
  });
});

test("refetches after a migration CAS conflict and preserves a concurrent credential rotation", async () => {
  await withCredentialSecret(async () => {
    const original = provider({ encryptedApiKey: "legacy-api-key" });
    const rotated = provider({ encryptedApiKey: "enc:v1:rotated-iv:rotated-tag:rotated-value" });
    let findUniqueCalls = 0;
    const database = fakeDatabase({
      findUnique: async () => {
        findUniqueCalls += 1;
        return findUniqueCalls === 1 ? original : rotated;
      },
      updateMany: async () => ({ count: 0 }),
    });

    const loaded = await loadModelProviderById(original.id, database);

    assert.equal(findUniqueCalls, 2);
    assert.equal(loaded?.encryptedApiKey, rotated.encryptedApiKey);
  });
});

function provider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    id: "provider-1",
    providerId: "openai_compatible",
    displayName: "Gateway",
    baseUrl: "https://gateway.example.com/v1",
    encryptedApiKey: null,
    defaultModel: "model",
    enabled: true,
    maxContextTokens: null,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    ...overrides,
  };
}

function fakeDatabase(overrides: Partial<ProviderStoreDatabase["modelProvider"]>): ProviderStoreDatabase {
  return {
    modelProvider: {
      findMany: async () => [],
      findUnique: async () => null,
      updateMany: async () => ({ count: 0 }),
      ...overrides,
    },
  };
}

async function withCredentialSecret(run: () => Promise<void>) {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  process.env.MODEL_CREDENTIAL_SECRET = credentialSecret;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
}
