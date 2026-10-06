import { isNonPublicIpAddress } from "./ip_ranges";

const MAX_REDIRECTS = 3;
const TRAILING_DOT_PATTERN = /\.$/;
const DNS_OVER_HTTPS_URL = "https://cloudflare-dns.com/dns-query";
const DNS_RECORD_TYPE_A = 1;
const DNS_RECORD_TYPE_AAAA = 28;
const INTERNAL_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home.arpa",
  ".corp",
];

export class NonPublicUrlError extends Error {}

/** DoH itself failed: callers must not treat this as the target being down. */
export class DnsResolutionUnavailableError extends Error {}

/**
 * Parses a user-supplied URL and rejects anything that is not plain http(s)
 * to a public-looking host. Hostnames still need `assertResolvesPublicly`
 * before fetching, which `fetchPublicUrl` does on every hop.
 */
export const assertPublicHttpUrl = (rawUrl: string): URL => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new NonPublicUrlError("URL is not valid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new NonPublicUrlError("URL must use http or https");
  }
  if (url.username || url.password) {
    throw new NonPublicUrlError("URL must not contain credentials");
  }
  const hostname = url.hostname.toLowerCase().replace(TRAILING_DOT_PATTERN, "");
  const ipLiteralIsNonPublic = isNonPublicIpAddress(hostname);
  if (ipLiteralIsNonPublic === true) {
    throw new NonPublicUrlError("URL must point to a public address");
  }
  const isSingleLabelHost =
    ipLiteralIsNonPublic === null && !hostname.includes(".");
  const isInternalHostname =
    hostname === "localhost" ||
    INTERNAL_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  if (isSingleLabelHost || isInternalHostname) {
    throw new NonPublicUrlError("URL must point to a public host");
  }
  return url;
};

interface DnsJsonAnswer {
  data: string;
  type: number;
}

const queryDnsOverHttps = async (
  hostname: string,
  { recordType, signal }: { recordType: number; signal?: AbortSignal | null }
): Promise<string[]> => {
  const query = new URL(DNS_OVER_HTTPS_URL);
  query.searchParams.set("name", hostname);
  query.searchParams.set("type", String(recordType));
  try {
    const response = await fetch(query, {
      headers: { accept: "application/dns-json" },
      signal,
    });
    if (!response.ok) {
      throw new DnsResolutionUnavailableError("DNS resolution unavailable");
    }
    const body: { Answer?: DnsJsonAnswer[] } = await response.json();
    return (body.Answer ?? [])
      .filter((answer) => answer.type === recordType)
      .map((answer) => answer.data);
  } catch {
    throw new DnsResolutionUnavailableError("DNS resolution unavailable");
  }
};

const resolveAddresses = async (
  hostname: string,
  signal?: AbortSignal | null
): Promise<string[]> => {
  const lookups = [DNS_RECORD_TYPE_A, DNS_RECORD_TYPE_AAAA].map((recordType) =>
    queryDnsOverHttps(hostname, { recordType, signal })
  );
  return (await Promise.all(lookups)).flat();
};

/**
 * Rejects hostnames whose DNS records point at private infrastructure, the
 * case a literal-only check misses (e.g. `127.0.0.1.nip.io`).
 */
const assertResolvesPublicly = async (
  url: URL,
  signal?: AbortSignal | null
): Promise<void> => {
  if (isNonPublicIpAddress(url.hostname) === false) {
    return;
  }
  const addresses = await resolveAddresses(url.hostname, signal);
  if (addresses.length === 0) {
    throw new NonPublicUrlError(`Could not resolve ${url.hostname}`);
  }
  if (addresses.some((address) => isNonPublicIpAddress(address) !== false)) {
    throw new NonPublicUrlError("URL must point to a public address");
  }
};

interface PublicFetchResult {
  requestDurationMs: number;
  response: Response;
}

/**
 * `fetch` for user-supplied URLs (webhooks, monitors). Validates the target
 * and every redirect hop so a public URL cannot bounce the request to an
 * internal address. `requestDurationMs` excludes DNS checks.
 */
export const fetchPublicUrl = async (
  rawUrl: string,
  init: RequestInit = {},
  { followRedirects = true }: { followRedirects?: boolean } = {}
): Promise<PublicFetchResult> => {
  let url = assertPublicHttpUrl(rawUrl);
  let requestDurationMs = 0;
  const maxHops = followRedirects ? MAX_REDIRECTS : 0;
  for (let hop = 0; hop <= maxHops; hop++) {
    await assertResolvesPublicly(url, init.signal);
    const requestStartedAt = Date.now();
    const response = await fetch(url, { ...init, redirect: "manual" });
    requestDurationMs += Date.now() - requestStartedAt;
    const location = response.headers.get("location");
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!(followRedirects && isRedirect && location)) {
      return { requestDurationMs, response };
    }
    await response.body?.cancel();
    url = assertPublicHttpUrl(new URL(location, url).href);
  }
  throw new NonPublicUrlError("Too many redirects");
};

/** User-facing reason for a failed outbound fetch; never echoes raw network errors. */
export const describeFetchFailure = (error: unknown): string => {
  if (
    error instanceof NonPublicUrlError ||
    error instanceof DnsResolutionUnavailableError
  ) {
    return error.message;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "Request timed out";
  }
  return "Request failed";
};
