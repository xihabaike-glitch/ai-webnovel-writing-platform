const CIPHERTEXT_PREFIX = "enc";
const CIPHERTEXT_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type CredentialCryptoErrorCode =
  | "credential_secret_invalid"
  | "credential_ciphertext_invalid"
  | "credential_version_unsupported";

export class CredentialCryptoError extends Error {
  readonly code: CredentialCryptoErrorCode;

  constructor(code: CredentialCryptoErrorCode) {
    const message = code === "credential_secret_invalid"
      ? "MODEL_CREDENTIAL_SECRET must decode to exactly 32 bytes."
      : code === "credential_version_unsupported"
        ? "Stored model credential uses an unsupported encryption version."
        : "Stored model credential is invalid.";
    super(message);
    this.name = "CredentialCryptoError";
    this.code = code;
  }
}

export const CREDENTIAL_CONFIGURATION_API_ERROR = {
  error: "模型凭据加密配置无效。",
  errorCategory: "credential_configuration_error",
  repairHint: "请运行 npm run setup，或将 MODEL_CREDENTIAL_SECRET 配置为解码后恰好 32 字节的值。",
} as const;

async function cryptoModule() {
  return import(/* webpackIgnore: true */ "node:crypto");
}

function decodeSecret(value: string) {
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, "hex");
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value) || value.length % 4 === 1) return null;

  const unpadded = value.replace(/=+$/, "");
  const decoded = Buffer.from(unpadded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const canonical = unpadded.replace(/\+/g, "-").replace(/\//g, "_");
  return decoded.toString("base64url") === canonical ? decoded : null;
}

function credentialSecret() {
  const configured = process.env.MODEL_CREDENTIAL_SECRET?.trim();
  const secret = configured ? decodeSecret(configured) : null;
  if (!secret || secret.length !== 32) {
    throw new CredentialCryptoError("credential_secret_invalid");
  }
  return secret;
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new CredentialCryptoError("credential_ciphertext_invalid");
  }
  return Buffer.from(value, "base64url");
}

function encryptedParts(value: string) {
  if (!value.startsWith(`${CIPHERTEXT_PREFIX}:`)) return null;
  const parts = value.split(":");
  if (parts[1] !== CIPHERTEXT_VERSION) {
    throw new CredentialCryptoError("credential_version_unsupported");
  }
  if (parts.length !== 5 || parts[0] !== CIPHERTEXT_PREFIX) {
    throw new CredentialCryptoError("credential_ciphertext_invalid");
  }
  return parts.slice(2) as [string, string, string];
}

function legacyEncryptedParts(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== CIPHERTEXT_VERSION) return null;
  try {
    const decoded = parts.slice(1).map(fromBase64Url) as [Buffer, Buffer, Buffer];
    return decoded[0].length === IV_BYTES
      && decoded[1].length === AUTH_TAG_BYTES
      && decoded[2].length > 0
      ? parts.slice(1) as [string, string, string]
      : null;
  } catch {
    return null;
  }
}

export function isEncryptedApiKey(value: string | null | undefined) {
  return value ? encryptedParts(value) !== null : false;
}

export async function encryptApiKey(apiKey: string) {
  const secret = credentialSecret();
  const { createCipheriv, randomBytes } = await cryptoModule();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [
    CIPHERTEXT_PREFIX,
    CIPHERTEXT_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export async function decodeStoredApiKey(value: string) {
  const currentParts = encryptedParts(value);
  const legacyParts = currentParts ? null : legacyEncryptedParts(value);
  const parts = currentParts ?? legacyParts;
  if (!parts) {
    credentialSecret();
    return { apiKey: value, isLegacy: true };
  }

  const [ivValue, tagValue, ciphertextValue] = parts;
  const iv = fromBase64Url(ivValue);
  const authTag = fromBase64Url(tagValue);
  const ciphertext = fromBase64Url(ciphertextValue);
  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES || ciphertext.length === 0) {
    throw new CredentialCryptoError("credential_ciphertext_invalid");
  }

  try {
    const { createDecipheriv } = await cryptoModule();
    const decipher = createDecipheriv("aes-256-gcm", credentialSecret(), iv);
    decipher.setAuthTag(authTag);
    const apiKey = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    if (!apiKey) throw new CredentialCryptoError("credential_ciphertext_invalid");
    return { apiKey, isLegacy: Boolean(legacyParts) };
  } catch (error) {
    if (error instanceof CredentialCryptoError) throw error;
    throw new CredentialCryptoError("credential_ciphertext_invalid");
  }
}

export async function migrateStoredApiKey(value: string) {
  if (isEncryptedApiKey(value)) return { value, migrated: false };
  const decoded = await decodeStoredApiKey(value);
  return { value: await encryptApiKey(decoded.apiKey), migrated: true };
}
