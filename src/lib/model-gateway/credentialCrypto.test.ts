import assert from "node:assert/strict";
import { createCipheriv } from "node:crypto";
import test from "node:test";
import {
  CredentialCryptoError,
  decodeStoredApiKey,
  encryptApiKey,
  isEncryptedApiKey,
  migrateStoredApiKey,
} from "./credentialCrypto.ts";

const validSecret = Buffer.alloc(32, 7).toString("base64");

test("encrypts saved API keys with an unambiguous AES-256-GCM version", async () => {
  await withCredentialSecret(validSecret, async () => {
    const apiKey = "sk-live-secret-value";
    const encrypted = await encryptApiKey(apiKey);

    assert.match(encrypted, /^enc:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    assert.notEqual(encrypted, apiKey);
    assert.equal(isEncryptedApiKey(encrypted), true);
    assert.deepEqual(await decodeStoredApiKey(encrypted), { apiKey, isLegacy: false });
  });
});

test("treats ordinary plaintext beginning with v1. as legacy and migrates it", async () => {
  await withCredentialSecret(validSecret, async () => {
    const plaintext = "v1.ordinary-legacy-api-key";
    assert.equal(isEncryptedApiKey(plaintext), false);
    assert.deepEqual(await decodeStoredApiKey(plaintext), { apiKey: plaintext, isLegacy: true });

    const migrated = await migrateStoredApiKey(plaintext);
    assert.equal(migrated.migrated, true);
    assert.equal(isEncryptedApiKey(migrated.value), true);
    assert.deepEqual(await decodeStoredApiKey(migrated.value), { apiKey: plaintext, isLegacy: false });
  });
});

test("authenticates and migrates ciphertext written by the previous v1 format", async () => {
  await withCredentialSecret(validSecret, async () => {
    const previousCiphertext = legacyV1Ciphertext("sk-previous-format", validSecret);
    assert.equal(isEncryptedApiKey(previousCiphertext), false);
    assert.deepEqual(await decodeStoredApiKey(previousCiphertext), {
      apiKey: "sk-previous-format",
      isLegacy: true,
    });

    const migrated = await migrateStoredApiKey(previousCiphertext);
    assert.match(migrated.value, /^enc:v1:/);
    assert.deepEqual(await decodeStoredApiKey(migrated.value), {
      apiKey: "sk-previous-format",
      isLegacy: false,
    });
  });
});

test("rejects unknown encrypted versions instead of treating them as plaintext", async () => {
  await withCredentialSecret(validSecret, async () => {
    for (const value of ["enc:v2:a:b:c", "enc:", "enc:v1:a:b"]) {
      await assert.rejects(
        decodeStoredApiKey(value),
        (error: unknown) => error instanceof CredentialCryptoError && error.code !== "credential_secret_invalid",
      );
      assert.throws(
        () => isEncryptedApiKey(value),
        (error: unknown) => error instanceof CredentialCryptoError && error.code !== "credential_secret_invalid",
      );
    }
  });
});

test("fails closed for legacy plaintext when MODEL_CREDENTIAL_SECRET is missing or invalid", async () => {
  for (const secret of [undefined, "", "placeholder", Buffer.alloc(31, 1).toString("base64")]) {
    await withCredentialSecret(secret, async () => {
      await assert.rejects(
        decodeStoredApiKey("legacy-api-key"),
        (error: unknown) => error instanceof CredentialCryptoError && error.code === "credential_secret_invalid",
      );
    });
  }
});

test("rejects ciphertext decrypted with the wrong key or modified authentication data", async () => {
  const encrypted = await withCredentialSecret(validSecret, () => encryptApiKey("sk-sensitive"));

  await withCredentialSecret(Buffer.alloc(32, 8).toString("base64"), async () => {
    await assert.rejects(
      decodeStoredApiKey(encrypted),
      (error: unknown) => error instanceof CredentialCryptoError && error.code === "credential_ciphertext_invalid",
    );
  });

  const replacement = encrypted.endsWith("A") ? "B" : "A";
  const tampered = `${encrypted.slice(0, -1)}${replacement}`;
  await withCredentialSecret(validSecret, async () => {
    await assert.rejects(
      decodeStoredApiKey(tampered),
      (error: unknown) => error instanceof CredentialCryptoError && error.code === "credential_ciphertext_invalid",
    );
  });
});

async function withCredentialSecret<T>(value: string | undefined, run: () => Promise<T>) {
  const previous = process.env.MODEL_CREDENTIAL_SECRET;
  if (value === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
  else process.env.MODEL_CREDENTIAL_SECRET = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.MODEL_CREDENTIAL_SECRET;
    else process.env.MODEL_CREDENTIAL_SECRET = previous;
  }
}

function legacyV1Ciphertext(apiKey: string, secret: string) {
  const iv = Buffer.alloc(12, 3);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "base64"), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}
