import { DEVTOOLS_CALLBACK_PATH } from "./constants";

const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;

function isReservedDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    LOOPBACK_IPV4.test(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".test")
  );
}

/** Only names nobody can register publicly, so a phishing link cannot send the code to an attacker's host. */
export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.username === "" &&
    url.password === "" &&
    url.hash === "" &&
    url.search === "" &&
    url.pathname === DEVTOOLS_CALLBACK_PATH &&
    isReservedDevHostname(url.hostname.toLowerCase())
  );
}
