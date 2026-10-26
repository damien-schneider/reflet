import { SESSION_API_PATHS } from "../../sessions/api-paths";
import { DEVTOOLS_ACCOUNT_HEADER, PROXIED_API_PATHS } from "../protocol";
import { boardCredential } from "./connect/board-credential";
import {
  forgetToken,
  listConnectionsTo,
  removeConnection,
} from "./connect/connection-store";
import { errorResponse, JSON_RESPONSE_HEADERS } from "./json-response";
import type { ResolvedDevtoolsOptions } from "./options";

type ProxiedApiPath = (typeof PROXIED_API_PATHS)[number];

const CREATE_FEEDBACK_PATH: ProxiedApiPath = "/api/v1/feedback/create";
const ADD_TO_BOARD_PATH: ProxiedApiPath = "/api/v1/sessions/proposals/feedback";
const MISSING_BOARD_ACCESS_ERROR =
  "Connect to Reflet from the devtools panel footer, or set REFLET_SECRET_KEY in the dev server environment.";
const MACHINE_ACCOUNT_SESSIONS_ONLY =
  "An account connected in another app only records sessions here. Adding to a board needs this app's own Reflet connection.";
const MACHINE_ACCOUNT_GONE =
  "That Reflet account is no longer connected on this machine.";
const BODYLESS_STATUSES = [204, 205, 304];

export interface RefletProxyTarget {
  apiUrl: string;
  token: string | null;
}

export const refletApiHeaders = (token: string) => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

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
      headers: refletApiHeaders(target.token),
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

const machineAccountMayCall = (apiPath: string) =>
  apiPath !== ADD_TO_BOARD_PATH &&
  SESSION_API_PATHS.some((sessionPath) => sessionPath === apiPath);

async function proxyAsMachineAccount(
  request: Request,
  apiPath: string,
  target: { accountId: string; apiUrl: string }
): Promise<Response> {
  if (!machineAccountMayCall(apiPath)) {
    return errorResponse(MACHINE_ACCOUNT_SESSIONS_ONLY, 403);
  }
  const account = (await listConnectionsTo(target.apiUrl)).find(
    (listed) => listed.id === target.accountId
  );
  if (!account) {
    return errorResponse(MACHINE_ACCOUNT_GONE, 401);
  }
  const response = await proxyToReflet(request, apiPath, account);
  if (response.status === 401) {
    await forgetToken(account.token);
  }
  return response;
}

/** A stored token Reflet refuses is dropped, so the next status shows Connect again. */
export async function proxyWithBoardCredential(
  request: Request,
  apiPath: string,
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const accountId = request.headers.get(DEVTOOLS_ACCOUNT_HEADER);
  if (accountId !== null) {
    return await proxyAsMachineAccount(request, apiPath, {
      accountId,
      apiUrl: settings.apiUrl,
    });
  }
  const credential = await boardCredential(settings);
  const response = await proxyToReflet(request, apiPath, {
    apiUrl: settings.apiUrl,
    token: credential?.token ?? null,
  });
  if (credential?.isStored && response.status === 401) {
    await removeConnection(settings.root, settings.apiUrl, credential.token);
  }
  return response;
}
