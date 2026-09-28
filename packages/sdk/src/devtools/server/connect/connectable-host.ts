import { isLoopbackHostname } from "../request-guard";

/** Mirrors the backend redirect allowlist, which stays the authority; this only decides whether Connect is offered. */
export function isConnectableHost(hostname: string): boolean {
  return isLoopbackHostname(hostname) || hostname.endsWith(".test");
}
