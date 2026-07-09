import {
  EndpointSafetyError,
  resolveModelBaseUrl,
  type EndpointAddress,
  type EndpointLookup,
} from "./endpointSafety.ts";

type ClientRequest = import("node:http").ClientRequest;
type IncomingHttpHeaders = import("node:http").IncomingHttpHeaders;
type IncomingMessage = import("node:http").IncomingMessage;
type LookupFunction = import("node:net").LookupFunction;
type NodeRequestFunction = typeof import("node:http").request;
type RequestOptions = import("node:https").RequestOptions;

const MODEL_REQUEST_TIMEOUT_MS = 12_000;
const MODEL_RESPONSE_MAX_BYTES = 1_048_576;

export type ModelGatewayErrorCategory =
  | "credential_configuration_error"
  | "credential_error"
  | "invalid_endpoint"
  | "invalid_response"
  | "missing_api_key"
  | "network_error"
  | "request_timeout"
  | "upstream_http_error";

export class ModelGatewayError extends Error {
  readonly category: ModelGatewayErrorCategory;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(category: ModelGatewayErrorCategory, metadata: { status?: number; requestId?: string } = {}) {
    const status = metadata.status === undefined ? "" : ` status=${metadata.status}`;
    const requestId = metadata.requestId ? ` request_id=${metadata.requestId}` : "";
    super(`${category}${status}${requestId}`);
    this.name = "ModelGatewayError";
    this.category = category;
    this.status = metadata.status;
    this.requestId = metadata.requestId;
  }
}

export interface ModelRequest {
  baseUrl: string;
  path: string;
  providerId: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  lookup?: EndpointLookup;
}

export interface ModelResponse<T = unknown> {
  status: number;
  headers: IncomingHttpHeaders;
  payload: T;
}

export type ModelRequestTransport = (request: ModelRequest) => Promise<ModelResponse>;

function safeRequestId(headers: IncomingHttpHeaders) {
  const raw = headers["x-request-id"] ?? headers["request-id"];
  const requestId = Array.isArray(raw) ? raw[0] : raw;
  return requestId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestId) ? requestId : undefined;
}

export function createPinnedRequestOptions(
  url: URL,
  pinnedAddress: EndpointAddress,
  headers: Record<string, string>,
): RequestOptions {
  const lookup = ((_hostname, options, callback) => {
    if (options.all) {
      callback(null, [pinnedAddress]);
      return;
    }
    callback(null, pinnedAddress.address, pinnedAddress.family);
  }) as LookupFunction;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  return {
    agent: false,
    headers: { ...headers, Host: url.host },
    lookup,
    servername: hostname === pinnedAddress.address ? "" : hostname,
  };
}

function joinedRequestUrl(baseUrl: URL, path: string) {
  return new URL(`${baseUrl.toString().replace(/\/+$/, "")}${path}`);
}

function readSuccessfulResponse(
  response: IncomingMessage,
  maxResponseBytes: number,
  onResponse: (response: IncomingMessage) => void,
) {
  return new Promise<ModelResponse>((resolve, reject) => {
    const status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      const error = new ModelGatewayError("upstream_http_error", {
        status,
        requestId: safeRequestId(response.headers),
      });
      response.destroy();
      reject(error);
      return;
    }

    onResponse(response);
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    response.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxResponseBytes) {
        rejectOnce(new ModelGatewayError("invalid_response"));
        response.destroy();
        return;
      }
      chunks.push(buffer);
    });
    response.on("end", () => {
      if (settled) return;
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
        settled = true;
        resolve({ status, headers: response.headers, payload });
      } catch {
        rejectOnce(new ModelGatewayError("invalid_response"));
      }
    });
    response.on("error", rejectOnce);
    response.on("aborted", () => rejectOnce(new Error("response_aborted")));
  });
}

async function loadNodeRequest(protocol: string): Promise<NodeRequestFunction> {
  const requestModule = protocol === "https:"
    ? await import(/* webpackIgnore: true */ "node:https")
    : await import(/* webpackIgnore: true */ "node:http");
  return requestModule.request as NodeRequestFunction;
}

function performPinnedRequest(
  nodeRequest: NodeRequestFunction,
  url: URL,
  address: EndpointAddress,
  request: ModelRequest,
  maxResponseBytes: number,
  setActiveRequest: (active: ClientRequest) => void,
  setActiveResponse: (active: IncomingMessage) => void,
) {
  return new Promise<ModelResponse>((resolve, reject) => {
    const active = nodeRequest(
      url,
      {
        ...createPinnedRequestOptions(url, address, request.headers),
        method: request.method,
      },
      (response) => {
        readSuccessfulResponse(response, maxResponseBytes, setActiveResponse).then(resolve, reject);
      },
    );
    setActiveRequest(active);
    active.once("error", reject);
    active.end(request.body);
  });
}

export async function requestModelJson<T = unknown>(request: ModelRequest): Promise<ModelResponse<T>> {
  const timeoutMs = request.timeoutMs ?? MODEL_REQUEST_TIMEOUT_MS;
  const maxResponseBytes = request.maxResponseBytes ?? MODEL_RESPONSE_MAX_BYTES;
  let activeRequest: ClientRequest | undefined;
  let activeResponse: IncomingMessage | undefined;
  let timedOut = false;
  let rejectDeadline: ((error: ModelGatewayError) => void) | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const timeout = setTimeout(() => {
    timedOut = true;
    const error = new ModelGatewayError("request_timeout");
    activeResponse?.destroy(error);
    activeRequest?.destroy(error);
    rejectDeadline?.(error);
  }, timeoutMs);

  try {
    const resolved = await Promise.race([
      resolveModelBaseUrl(request.baseUrl, {
        lookup: request.lookup,
        providerId: request.providerId,
      }),
      deadline,
    ]);
    const url = joinedRequestUrl(resolved.url, request.path);
    const nodeRequest = await Promise.race([loadNodeRequest(url.protocol), deadline]);
    const response = await Promise.race([
      performPinnedRequest(
        nodeRequest,
        url,
        resolved.addresses[0],
        request,
        maxResponseBytes,
        (value) => { activeRequest = value; },
        (value) => { activeResponse = value; },
      ),
      deadline,
    ]);
    return response as ModelResponse<T>;
  } catch (error) {
    if (error instanceof ModelGatewayError) throw error;
    if (timedOut) throw new ModelGatewayError("request_timeout");
    if (error instanceof EndpointSafetyError) throw new ModelGatewayError("invalid_endpoint");
    throw new ModelGatewayError("network_error");
  } finally {
    clearTimeout(timeout);
  }
}
