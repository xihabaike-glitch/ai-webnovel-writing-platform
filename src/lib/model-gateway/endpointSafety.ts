export type EndpointSafetyErrorCode =
  | "endpoint_invalid"
  | "endpoint_https_required"
  | "endpoint_credentials_forbidden"
  | "endpoint_not_public"
  | "endpoint_dns_failed";

export class EndpointSafetyError extends Error {
  readonly code: EndpointSafetyErrorCode;

  constructor(code: EndpointSafetyErrorCode) {
    super(code);
    this.name = "EndpointSafetyError";
    this.code = code;
  }
}

export interface EndpointAddress {
  address: string;
  family: 4 | 6;
}

export type EndpointLookup = (hostname: string) => Promise<EndpointAddress[]>;

export interface EndpointSafetyOptions {
  lookup?: EndpointLookup;
  providerId?: string;
}

export interface ResolvedModelBaseUrl {
  url: URL;
  addresses: EndpointAddress[];
}

function ipv4Number(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256) + parts[3];
}

function inIpv4Range(value: number, start: string, prefixLength: number) {
  const startValue = ipv4Number(start);
  if (startValue === null) return false;
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (value & mask) === (startValue & mask);
}

function isPublicIpv4(address: string) {
  const value = ipv4Number(address);
  if (value === null) return false;
  if (address === "192.0.0.9" || address === "192.0.0.10") return true;

  return ![
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
    ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
    ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
    ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
  ].some(([start, prefix]) => inIpv4Range(value, start as string, prefix as number));
}

function ipv6Number(address: string) {
  const embeddedIpv4Index = address.lastIndexOf(":");
  const normalized = address.includes(".")
    ? (() => {
      const ipv4 = ipv4Number(address.slice(embeddedIpv4Index + 1));
      if (ipv4 === null) return null;
      return `${address.slice(0, embeddedIpv4Index + 1)}${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
    })()
    : address;
  if (!normalized) return null;

  const compressedParts = normalized.split("::");
  if (compressedParts.length > 2) return null;
  const [before = "", after = ""] = compressedParts;
  const left = before ? before.split(":") : [];
  const right = after ? after.split(":") : [];
  const zeroes = 8 - left.length - right.length;
  if (zeroes < 0 || (!normalized.includes("::") && zeroes !== 0)) return null;
  const groups = [...left, ...Array(zeroes).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return groups.reduce((value, group) => (value << 16n) + BigInt(`0x${group}`), 0n);
}

function inIpv6Range(value: bigint, prefix: string, prefixLength: number) {
  const prefixValue = ipv6Number(prefix);
  if (prefixValue === null) return false;
  const shift = 128n - BigInt(prefixLength);
  return (value >> shift) === (prefixValue >> shift);
}

function isIpv4Loopback(address: string) {
  const value = ipv4Number(address);
  return value !== null && inIpv4Range(value, "127.0.0.0", 8);
}

function isLocalhostAddress({ address, family }: EndpointAddress) {
  return family === 4 ? isIpv4Loopback(address) : ipv6Number(address) === ipv6Number("::1");
}

function isPrivateDockerAddress({ address, family }: EndpointAddress) {
  if (family === 6) {
    const value = ipv6Number(address);
    return value !== null && (value === ipv6Number("::1") || inIpv6Range(value, "fc00::", 7));
  }
  const value = ipv4Number(address);
  return value !== null && (
    inIpv4Range(value, "127.0.0.0", 8)
    || inIpv4Range(value, "10.0.0.0", 8)
    || inIpv4Range(value, "172.16.0.0", 12)
    || inIpv4Range(value, "192.168.0.0", 16)
  );
}

async function lookupAddresses(hostname: string): Promise<EndpointAddress[]> {
  const { lookup } = await import(/* webpackIgnore: true */ "node:dns/promises");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.flatMap(({ address, family }) => family === 4 || family === 6
    ? [{ address, family }]
    : []);
}

function normalizedHostname(url: URL) {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function literalAddress(hostname: string): EndpointAddress | null {
  if (ipv4Number(hostname) !== null) return { address: hostname, family: 4 };
  if (ipv6Number(hostname) !== null) return { address: hostname, family: 6 };
  return null;
}

async function resolveAddresses(hostname: string, lookup: EndpointLookup) {
  try {
    return await lookup(hostname);
  } catch {
    throw new EndpointSafetyError("endpoint_dns_failed");
  }
}

export async function resolveModelBaseUrl(
  value: string,
  options: EndpointSafetyOptions = {},
): Promise<ResolvedModelBaseUrl> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EndpointSafetyError("endpoint_invalid");
  }
  if (url.username || url.password) throw new EndpointSafetyError("endpoint_credentials_forbidden");

  const hostname = normalizedHostname(url);
  const localTarget = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "host.docker.internal";
  const localOllama = options.providerId === "ollama" && localTarget;

  if (url.protocol === "http:" && !localOllama) {
    throw new EndpointSafetyError("endpoint_https_required");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EndpointSafetyError("endpoint_https_required");
  }
  if (!hostname || (!localOllama && (localTarget || hostname.endsWith(".localhost")))) {
    throw new EndpointSafetyError("endpoint_not_public");
  }

  const literal = literalAddress(hostname);
  if (localOllama && literal) return { url, addresses: [literal] };

  const addresses = literal
    ? [literal]
    : await resolveAddresses(hostname, options.lookup ?? lookupAddresses);
  if (addresses.length === 0) throw new EndpointSafetyError("endpoint_not_public");

  if (localOllama) {
    const allowed = hostname === "localhost"
      ? addresses.every(isLocalhostAddress)
      : addresses.every(isPrivateDockerAddress);
    if (!allowed) throw new EndpointSafetyError("endpoint_not_public");
    return { url, addresses };
  }

  const pinnedAddress = addresses.find((address) => address.family === 4 && isPublicIpv4(address.address));
  if (!pinnedAddress) throw new EndpointSafetyError("endpoint_not_public");
  return { url, addresses: [pinnedAddress] };
}

export async function validateModelBaseUrl(value: string, options: EndpointSafetyOptions = {}) {
  return (await resolveModelBaseUrl(value, options)).url;
}
