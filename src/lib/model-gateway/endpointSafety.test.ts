import assert from "node:assert/strict";
import test from "node:test";
import { EndpointSafetyError, resolveModelBaseUrl, validateModelBaseUrl } from "./endpointSafety.ts";

const resolvePublicIpv4 = async () => [{ address: "93.184.216.34", family: 4 as const }];

test("accepts public HTTPS endpoints and returns the validated addresses", async () => {
  const resolved = await resolveModelBaseUrl("https://gateway.example.com/v1", {
    lookup: resolvePublicIpv4,
    providerId: "openai_compatible",
  });

  assert.equal(resolved.url.toString(), "https://gateway.example.com/v1");
  assert.deepEqual(resolved.addresses, [{ address: "93.184.216.34", family: 4 }]);
});

test("rejects insecure, credentialed, localhost, and private non-Ollama endpoints", async () => {
  await assert.rejects(
    validateModelBaseUrl("http://gateway.example.com", { lookup: resolvePublicIpv4 }),
    endpointError("endpoint_https_required"),
  );
  await assert.rejects(
    validateModelBaseUrl("https://token@gateway.example.com", { lookup: resolvePublicIpv4 }),
    endpointError("endpoint_credentials_forbidden"),
  );
  await assert.rejects(
    validateModelBaseUrl("https://gateway.example.com", {
      lookup: async () => [{ address: "10.0.0.8", family: 4 as const }],
    }),
    endpointError("endpoint_not_public"),
  );
  await assert.rejects(
    validateModelBaseUrl("https://[::1]", { lookup: resolvePublicIpv4 }),
    endpointError("endpoint_not_public"),
  );
});

test("rejects all remote IPv6 DNS results including translation and overlay ranges", async () => {
  const deniedAddresses = [
    "64:ff9b::a00:1",
    "64:ff9b::808:808",
    "64:ff9b:1::1",
    "100::1",
    "2001::1",
    "2001:2::1",
    "2001:10::1",
    "2001:20::1",
    "2001:db8::1",
    "2002:808:808::1",
    "2001:4860:4860:0:0:5efe:8.8.8.8",
    "2606:4700:4700::1111",
    "3fff::1",
    "fc00::1",
    "fec0::1",
    "fe80::1",
    "ff00::1",
  ];

  for (const address of deniedAddresses) {
    await assert.rejects(
      validateModelBaseUrl("https://gateway.example.com", {
        lookup: async () => [{ address, family: 6 as const }],
      }),
      endpointError("endpoint_not_public"),
      address,
    );
  }
});

test("rejects remote IPv6 literals and IPv6-only remote hosts", async () => {
  await assert.rejects(
    validateModelBaseUrl("https://[2606:4700:4700::1111]/v1"),
    endpointError("endpoint_not_public"),
  );
  await assert.rejects(
    validateModelBaseUrl("https://gateway.example.com/v1", {
      lookup: async () => [{ address: "2606:4700:4700::1111", family: 6 as const }],
    }),
    endpointError("endpoint_not_public"),
  );
});

test("pins only one validated public IPv4 and ignores private or IPv6 extra answers", async () => {
  const resolved = await resolveModelBaseUrl("https://gateway.example.com/v1", {
    lookup: async () => [
      { address: "10.0.0.8", family: 4 as const },
      { address: "2606:4700:4700::1111", family: 6 as const },
      { address: "93.184.216.34", family: 4 as const },
      { address: "8.8.8.8", family: 4 as const },
    ],
  });

  assert.deepEqual(resolved.addresses, [{ address: "93.184.216.34", family: 4 }]);
});

test("allows plain HTTP only for exact local Ollama targets", async () => {
  const cases = [
    ["http://localhost:11434", async () => [{ address: "127.0.0.1", family: 4 as const }]],
    ["http://127.0.0.1:11434", resolvePublicIpv4],
    ["http://[::1]:11434", resolvePublicIpv4],
    ["http://host.docker.internal:11434", async () => [{ address: "192.168.65.2", family: 4 as const }]],
  ] as const;

  for (const [value, lookup] of cases) {
    const endpoint = await validateModelBaseUrl(value, { lookup, providerId: "ollama" });
    assert.equal(endpoint.protocol, "http:");
  }

  for (const value of [
    "http://localhost:11434",
    "http://127.0.0.1:11434",
    "http://[::1]:11434",
    "http://host.docker.internal:11434",
  ]) {
    await assert.rejects(
      validateModelBaseUrl(value, { lookup: resolvePublicIpv4, providerId: "openai_compatible" }),
      endpointError(value.includes("localhost") || value.includes("docker") ? "endpoint_https_required" : "endpoint_https_required"),
    );
  }

  await assert.rejects(
    validateModelBaseUrl("http://ollama.example.com:11434", {
      lookup: resolvePublicIpv4,
      providerId: "ollama",
    }),
    endpointError("endpoint_https_required"),
  );
  await assert.rejects(
    validateModelBaseUrl("http://192.168.1.20:11434", { providerId: "ollama" }),
    endpointError("endpoint_https_required"),
  );
});

function endpointError(code: EndpointSafetyError["code"]) {
  return (error: unknown) => error instanceof EndpointSafetyError && error.code === code;
}
