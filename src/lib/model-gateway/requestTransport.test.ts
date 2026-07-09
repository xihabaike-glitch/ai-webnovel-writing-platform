import assert from "node:assert/strict";
import { createServer, type RequestListener, type Server } from "node:http";
import test from "node:test";
import {
  ModelGatewayError,
  createPinnedRequestOptions,
  requestModelJson,
} from "./requestTransport.ts";

test("pins the outbound connection to the one validated DNS answer", async () => {
  let hostHeader: string | undefined;
  await withServer((request, response) => {
    hostHeader = request.headers.host;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ message: { content: "ok" } }));
  }, async (port) => {
    let lookupCalls = 0;
    const result = await requestModelJson<{ message: { content: string } }>({
      baseUrl: `http://localhost:${port}`,
      path: "/api/chat",
      providerId: "ollama",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      lookup: async () => {
        lookupCalls += 1;
        return lookupCalls === 1
          ? [{ address: "127.0.0.1", family: 4 }]
          : [{ address: "169.254.169.254", family: 4 }];
      },
    });

    assert.equal(result.payload.message.content, "ok");
    assert.equal(lookupCalls, 1);
    assert.equal(hostHeader, `localhost:${port}`);
  });
});

test("preserves the original hostname for Host and TLS SNI while lookup returns the pinned IP", async () => {
  const options = createPinnedRequestOptions(
    new URL("https://gateway.example.com:8443/v1/chat"),
    { address: "93.184.216.34", family: 4 },
    { Authorization: "Bearer test" },
  );

  assert.equal((options.headers as Record<string, string>).Host, "gateway.example.com:8443");
  assert.equal(options.servername, "gateway.example.com");
  assert.equal(options.agent, false);

  const lookupResult = await new Promise<{ address: string; family: number }>((resolve, reject) => {
    options.lookup?.("gateway.example.com", {}, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address: address as string, family: family as number });
    });
  });
  assert.deepEqual(lookupResult, { address: "93.184.216.34", family: 4 });
});

test("uses one timeout budget for DNS, headers, and the complete response body", async () => {
  await assert.rejects(
    requestModelJson({
      baseUrl: "https://gateway.example.com",
      path: "/v1/chat",
      providerId: "openai_compatible",
      method: "POST",
      headers: {},
      body: "{}",
      timeoutMs: 20,
      lookup: async () => new Promise(() => undefined),
    }),
    gatewayError("request_timeout"),
  );

  await withServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.write('{"message":{"content":"');
    setTimeout(() => response.end('late"}}'), 80);
  }, async (port) => {
    await assert.rejects(
      requestModelJson({
        baseUrl: `http://localhost:${port}`,
        path: "/api/chat",
        providerId: "ollama",
        method: "POST",
        headers: {},
        body: "{}",
        timeoutMs: 20,
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
      gatewayError("request_timeout"),
    );
  });
});

test("rejects oversized successful responses as invalid without retaining the body", async () => {
  await withServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ text: "upstream-secret-".repeat(100) }));
  }, async (port) => {
    await assert.rejects(
      requestModelJson({
        baseUrl: `http://localhost:${port}`,
        path: "/api/chat",
        providerId: "ollama",
        method: "POST",
        headers: {},
        body: "{}",
        maxResponseBytes: 64,
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
      (error: unknown) => error instanceof ModelGatewayError
        && error.category === "invalid_response"
        && !error.message.includes("upstream-secret"),
    );
  });
});

test("does not follow redirects or include upstream error bodies", async () => {
  await withServer((_request, response) => {
    response.statusCode = 302;
    response.setHeader("Location", "http://169.254.169.254/latest/meta-data");
    response.setHeader("x-request-id", "req_123");
    response.end("upstream-secret-body");
  }, async (port) => {
    await assert.rejects(
      requestModelJson({
        baseUrl: `http://localhost:${port}`,
        path: "/api/chat",
        providerId: "ollama",
        method: "POST",
        headers: {},
        body: "{}",
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
      (error: unknown) => error instanceof ModelGatewayError
        && error.category === "upstream_http_error"
        && error.status === 302
        && error.requestId === "req_123"
        && !error.message.includes("upstream-secret-body"),
    );
  });
});

function gatewayError(category: ModelGatewayError["category"]) {
  return (error: unknown) => error instanceof ModelGatewayError && error.category === category;
}

async function withServer(listener: RequestListener, run: (port: number) => Promise<void>) {
  const server = createServer(listener);
  await listen(server);
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function listen(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}
