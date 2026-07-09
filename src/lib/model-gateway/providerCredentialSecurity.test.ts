import assert from "node:assert/strict";
import test from "node:test";
import {
  canReuseStoredProviderCredential,
  normalizedProviderOrigin,
} from "./providerCredentialSecurity.ts";

test("normalizes credential identity by URL origin rather than raw base URL", () => {
  assert.equal(
    normalizedProviderOrigin("gpt", "https://Gateway.Example.com:443/v1/chat?region=us"),
    "https://gateway.example.com",
  );
  assert.equal(
    normalizedProviderOrigin("gpt", ""),
    "https://api.openai.com",
  );
});

test("reuses a stored credential only for the same provider and normalized origin", () => {
  const existing = {
    providerId: "openai_compatible",
    baseUrl: "https://Gateway.Example.com:443/v1",
  };

  assert.equal(canReuseStoredProviderCredential(existing, {
    providerId: "openai_compatible",
    baseUrl: "https://gateway.example.com/chat/completions",
  }), true);
  assert.equal(canReuseStoredProviderCredential(existing, {
    providerId: "gpt",
    baseUrl: "https://gateway.example.com/another-path",
  }), false);
  assert.equal(canReuseStoredProviderCredential(existing, {
    providerId: "openai_compatible",
    baseUrl: "https://other.example.com/v1",
  }), false);
});

test("does not authorize reuse when either custom-provider origin is invalid or missing", () => {
  assert.equal(canReuseStoredProviderCredential({
    providerId: "openai_compatible",
    baseUrl: "not-a-url",
  }, {
    providerId: "openai_compatible",
    baseUrl: "not-a-url",
  }), false);
  assert.equal(canReuseStoredProviderCredential({
    providerId: "openai_compatible",
    baseUrl: null,
  }, {
    providerId: "openai_compatible",
    baseUrl: null,
  }), false);
});
