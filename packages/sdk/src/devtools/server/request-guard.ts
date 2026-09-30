import { DEVTOOLS_REQUEST_HEADER } from "../protocol";
import { errorResponse } from "./json-response";

const LOOPBACK_HOSTNAMES = ["localhost", "[::1]"];
const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;
const IPV4_MAPPED_PREFIX = "::ffff:";
const TRUSTED_FETCH_SITES = ["same-origin", "none"];

function hostnameOf(request: Request): string | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return (
    LOOPBACK_HOSTNAMES.includes(hostname) ||
    hostname.endsWith(".localhost") ||
    LOOPBACK_IPV4.test(hostname)
  );
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  const ipv4 = address.startsWith(IPV4_MAPPED_PREFIX)
    ? address.slice(IPV4_MAPPED_PREFIX.length)
    : address;
  return address === "::1" || LOOPBACK_IPV4.test(ipv4);
}

/**
 * The Host check stops DNS rebinding: a hostile domain resolved to 127.0.0.1
 * is same-origin with itself, so origin checks alone would let it through.
 * Host and header checks only stop browsers; keeping other machines out is the
 * job of a dev server bound to loopback.
 */
export function rejectUntrustedHost(
  request: Request,
  allowedHosts: string[]
): Response | null {
  const hostname = hostnameOf(request);
  const isAllowedHost =
    hostname !== null &&
    (isLoopbackHostname(hostname) || allowedHosts.includes(hostname));
  if (!isAllowedHost) {
    return errorResponse(
      "Reflet devtools only answers on localhost. Add other dev hostnames to allowedHosts or REFLET_DEVTOOLS_HOSTS.",
      403
    );
  }
  return null;
}

export function rejectUntrustedCaller(
  request: Request,
  allowedHosts: string[]
): Response | null {
  if (request.headers.get(DEVTOOLS_REQUEST_HEADER) !== "1") {
    return errorResponse(
      `Reflet devtools requests must send the ${DEVTOOLS_REQUEST_HEADER} header.`,
      403
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const hostname = hostnameOf(request);
  // Browsers omit Sec-Fetch-Site only outside secure contexts: a plain-HTTP allowed host, never loopback.
  const mayOmitFetchSite =
    hostname !== null &&
    allowedHosts.includes(hostname) &&
    !isLoopbackHostname(hostname);
  const isTrustedSite =
    fetchSite === null
      ? mayOmitFetchSite
      : TRUSTED_FETCH_SITES.includes(fetchSite);
  if (!isTrustedSite) {
    return errorResponse(
      "Reflet devtools only answers requests from the app's own origin.",
      403
    );
  }

  return null;
}
