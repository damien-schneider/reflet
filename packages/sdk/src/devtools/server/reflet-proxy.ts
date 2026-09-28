import { PROXIED_API_PATHS } from "../protocol";
import { errorResponse, JSON_RESPONSE_HEADERS } from "./json-response";

type ProxiedApiPath = (typeof PROXIED_API_PATHS)[number];

const CREATE_FEEDBACK_PATH: ProxiedApiPath = "/api/v1/feedback/create";
const MISSING_BOARD_ACCESS_ERROR =
  "Connect to Reflet from the devtools Board tab, or set REFLET_SECRET_KEY in the dev server environment.";
const BODYLESS_STATUSES = [204, 205, 304];

export interface RefletProxyTarget {
  apiUrl: string;
  token: string | null;
}

type ForwardedBody = { body: string | undefined } | { error: string };

function isProxiedApiPath(path: string): path is ProxiedApiPath {
  return PROXIED_API_PATHS.some((proxiedPath) => proxiedPath === path);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readForwardedBody(
  request: Request,
  apiPath: ProxiedApiPath
): Promise<ForwardedBody> {
  if (request.method !== "POST") {
    return { body: undefined };
  }
  const text = await request.text();
  if (apiPath !== CREATE_FEEDBACK_PATH) {
    return { body: text || undefined };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { error: "Feedback must be a JSON object." };
  }
  if (!isJsonObject(payload)) {
    return { error: "Feedback must be a JSON object." };
  }
  return { body: JSON.stringify({ ...payload, internal: true }) };
}

/** Forwards an allowlisted Reflet API call with the board token; devtools notes are always internal. */
export async function proxyToReflet(
  request: Request,
  apiPath: string,
  target: RefletProxyTarget
): Promise<Response> {
  if (!isProxiedApiPath(apiPath)) {
    return errorResponse(
      `Reflet devtools does not forward ${apiPath || "/"}.`,
      404
    );
  }
  if (!target.token) {
    return errorResponse(MISSING_BOARD_ACCESS_ERROR, 503);
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return errorResponse(`${request.method} is not supported here.`, 405);
  }

  const forwarded = await readForwardedBody(request, apiPath);
  if ("error" in forwarded) {
    return errorResponse(forwarded.error, 400);
  }

  const { search } = new URL(request.url);
  let upstream: Response;
  try {
    upstream = await fetch(`${target.apiUrl}${apiPath}${search}`, {
      body: forwarded.body,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${target.token}`,
        "Content-Type": "application/json",
      },
      method: request.method,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return errorResponse(`Could not reach Reflet at ${target.apiUrl}.`, 502);
  }

  return new Response(
    BODYLESS_STATUSES.includes(upstream.status) ? null : upstream.body,
    { headers: JSON_RESPONSE_HEADERS, status: upstream.status }
  );
}
