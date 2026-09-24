import { DEVTOOLS_REQUEST_HEADER } from "../protocol";
import { errorResponse } from "./json-response";

const LOOPBACK_HOSTNAMES = ["localhost", "[::1]"];
const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;

function hostnameOf(host: string): string | null {
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  return (
    LOOPBACK_HOSTNAMES.includes(hostname) ||
    hostname.endsWith(".localhost") ||
    LOOPBACK_IPV4.test(hostname) ||
    allowedHosts.includes(hostname)
  );
}

/**
 * The Host check stops DNS rebinding: a hostile domain resolved to 127.0.0.1
 * is same-origin with itself, so origin checks alone would let it through.
 */
export function rejectUntrustedRequest(
  request: Request,
  allowedHosts: string[]
): Response | null {
  const hostname = hostnameOf(
    request.headers.get("host") ?? new URL(request.url).host
  );
  if (!(hostname && isAllowedHost(hostname, allowedHosts))) {
    return errorResponse(
      "Reflet devtools only answers on localhost. Add other dev hostnames to allowedHosts or REFLET_DEVTOOLS_HOSTS.",
      403
    );
  }

  if (request.headers.get(DEVTOOLS_REQUEST_HEADER) !== "1") {
    return errorResponse(
      `Reflet devtools requests must send the ${DEVTOOLS_REQUEST_HEADER} header.`,
      403
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const isTrustedSite =
    fetchSite === null || fetchSite === "same-origin" || fetchSite === "none";
  if (!isTrustedSite) {
    return errorResponse(
      "Reflet devtools only answers requests from the app's own origin.",
      403
    );
  }

  return null;
}
