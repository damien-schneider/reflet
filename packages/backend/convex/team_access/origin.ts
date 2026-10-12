import { v } from "convex/values";
import { isLoopbackHostname } from "../devtools/redirect_uri";
import { hostMatchesAllowedDomains } from "../http/public_api/allowed_domains";

export const teamOriginProblemValidator = v.union(
  v.literal("invalid"),
  v.literal("no_allowed_domains"),
  v.literal("not_allowed")
);

export type TeamOriginProblem = typeof teamOriginProblemValidator.type;

export const TEAM_ORIGIN_PROBLEM_MESSAGES = {
  invalid: "This sign-in link is invalid. Start again from your app.",
  no_allowed_domains:
    "Add this app's domain in Reflet → API keys to enable team tools.",
  not_allowed:
    "This app's domain isn't in the API key's allowed domains. Add it in Reflet → API keys to enable team tools.",
} as const satisfies Record<TeamOriginProblem, string>;

function parseSecureOrigin(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const isSecure =
    url.protocol === "https:" ||
    (url.protocol === "http:" && isLoopbackHostname(url.hostname));
  return url.origin === value && isSecure ? url : null;
}

/** The origin comes from the requesting page, so anything short of an exact allowed origin is refused. */
export function teamOriginProblem(
  origin: string,
  allowedDomains: string[] | undefined
): TeamOriginProblem | null {
  const url = parseSecureOrigin(origin);
  if (!url) {
    return "invalid";
  }
  if (!allowedDomains?.length) {
    return "no_allowed_domains";
  }
  return hostMatchesAllowedDomains(url.host, allowedDomains)
    ? null
    : "not_allowed";
}
