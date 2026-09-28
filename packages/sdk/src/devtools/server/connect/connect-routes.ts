import { z } from "zod";
import {
  type ConnectStartResponse,
  DEVTOOLS_ENDPOINTS,
  DEVTOOLS_ROUTE_BASE,
  type DisconnectResponse,
} from "../../protocol";
import { errorResponse, jsonResponse } from "../json-response";
import type { ResolvedDevtoolsOptions } from "../options";
import { isConnectableHost } from "./connectable-host";
import { removeConnection, saveConnection } from "./connection-store";
import { htmlPage } from "./html-page";
import { beginConnect, takeConnect } from "./pending-connects";

const publicKeySchema = z.object({
  publicKey: z.string().startsWith("fb_pub_").max(200),
});
const tokenExchangeSchema = z.object({
  organizationName: z.string(),
  token: z.string().startsWith("fb_dev_"),
});
const upstreamErrorSchema = z.object({ error: z.string() });

const redirectUriFor = (request: Request): string =>
  `${new URL(request.url).origin}${DEVTOOLS_ROUTE_BASE}${DEVTOOLS_ENDPOINTS.connectCallback}`;

async function readPublicKey(request: Request): Promise<string | null> {
  const parsed = publicKeySchema.safeParse(
    await request.json().catch(() => null)
  );
  return parsed.success ? parsed.data.publicKey : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function startConnect(
  request: Request,
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const publicKey = await readPublicKey(request);
  if (!publicKey) {
    return errorResponse(
      "Pass the widget's fb_pub_ public key to connect.",
      400
    );
  }
  if (settings.secretKey) {
    return errorResponse(
      "REFLET_SECRET_KEY is set, so this dev server already reaches your board.",
      409
    );
  }
  if (!isConnectableHost(new URL(request.url).hostname)) {
    return errorResponse(
      "Connecting from the browser works on localhost, *.localhost and *.test. Set REFLET_SECRET_KEY instead.",
      403
    );
  }

  const { codeChallenge, state } = beginConnect({
    apiUrl: settings.apiUrl,
    redirectUri: redirectUriFor(request),
    root: settings.root,
  });
  const authorizeUrl = new URL("/auth/devtools", settings.appUrl);
  authorizeUrl.searchParams.set("public_key", publicKey);
  authorizeUrl.searchParams.set("redirect_uri", redirectUriFor(request));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  return jsonResponse({
    authorizeUrl: authorizeUrl.toString(),
  } satisfies ConnectStartResponse);
}

export async function finishConnect(
  request: Request,
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const pending =
    code && state
      ? takeConnect(state, {
          apiUrl: settings.apiUrl,
          redirectUri: redirectUriFor(request),
          root: settings.root,
        })
      : null;
  if (!(code && pending)) {
    return htmlPage(
      "Link expired",
      "This connect link expired or was already used. Start again from the Board tab.",
      400
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${settings.apiUrl}/api/v1/devtools/token`, {
      body: JSON.stringify({
        code,
        codeVerifier: pending.codeVerifier,
        redirectUri: redirectUriFor(request),
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return htmlPage(
      "Connection failed",
      `Could not reach Reflet at ${settings.apiUrl}.`,
      502
    );
  }

  const payload = await readJson(upstream);
  if (!upstream.ok) {
    return htmlPage(
      "Connection refused",
      upstreamErrorSchema.safeParse(payload).data?.error ??
        "Reflet refused this connect code.",
      400
    );
  }
  const exchange = tokenExchangeSchema.safeParse(payload);
  if (!exchange.success) {
    return htmlPage(
      "Connection failed",
      "Reflet answered with an unexpected response.",
      502
    );
  }

  await saveConnection(settings.root, {
    apiUrl: settings.apiUrl,
    organizationName: exchange.data.organizationName,
    token: exchange.data.token,
  });
  return htmlPage(
    "Connected",
    `Connected to ${exchange.data.organizationName}. Go back to your app: the Board tab is ready.`,
    200
  );
}

async function revokeUpstream(apiUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/devtools/revoke`, {
      headers: { Authorization: `Bearer ${token}` },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function disconnect(
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const removed = await removeConnection(settings.root, settings.apiUrl);
  const revoked = removed
    ? await revokeUpstream(removed.apiUrl, removed.token)
    : false;
  return jsonResponse({ revoked } satisfies DisconnectResponse);
}
