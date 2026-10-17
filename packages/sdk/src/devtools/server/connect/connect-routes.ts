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

export type ConnectOutcome =
  | { ok: true; organizationName: string }
  | { message: string; ok: false; status: number; title: string };

export type ConnectClient = "desktopApp" | "devServer";

const DESKTOP_APP_CLIENT_PARAM = "desktop";

export const connectCallbackUriFor = (origin: string): string =>
  `${origin}${DEVTOOLS_ROUTE_BASE}${DEVTOOLS_ENDPOINTS.connectCallback}`;

const redirectUriFor = (request: Request): string =>
  connectCallbackUriFor(new URL(request.url).origin);

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

/** Starts a pending connect: Reflet sends the member back to `redirectUri` with a code only this process can redeem. */
export function connectAuthorizeUrl(
  settings: ResolvedDevtoolsOptions,
  target: { client: ConnectClient; publicKey: string; redirectUri: string }
): { authorizeUrl: string; state: string } {
  const { codeChallenge, state } = beginConnect({
    apiUrl: settings.apiUrl,
    redirectUri: target.redirectUri,
    root: settings.root,
  });
  const authorizeUrl = new URL("/auth/devtools", settings.appUrl);
  authorizeUrl.searchParams.set("public_key", target.publicKey);
  authorizeUrl.searchParams.set("redirect_uri", target.redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  if (target.client === "desktopApp") {
    authorizeUrl.searchParams.set("client", DESKTOP_APP_CLIENT_PARAM);
  }
  return { authorizeUrl: authorizeUrl.toString(), state };
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
  const { authorizeUrl } = connectAuthorizeUrl(settings, {
    client: "devServer",
    publicKey,
    redirectUri: redirectUriFor(request),
  });
  return jsonResponse({ authorizeUrl } satisfies ConnectStartResponse);
}

/** Trades the code Reflet sent back for a token, kept outside the repository. */
export async function redeemConnectCode(
  settings: ResolvedDevtoolsOptions,
  callback: { code: string | null; redirectUri: string; state: string | null }
): Promise<ConnectOutcome> {
  const { code, redirectUri, state } = callback;
  const pending =
    code && state
      ? takeConnect(state, {
          apiUrl: settings.apiUrl,
          redirectUri,
          root: settings.root,
        })
      : null;
  if (!(code && pending)) {
    return {
      message:
        "This sign-in link expired or was already used. Start again from your app.",
      ok: false,
      status: 400,
      title: "Link expired",
    };
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${settings.apiUrl}/api/v1/devtools/token`, {
      body: JSON.stringify({
        code,
        codeVerifier: pending.codeVerifier,
        redirectUri,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return {
      message: `Could not reach Reflet at ${settings.apiUrl}.`,
      ok: false,
      status: 502,
      title: "Connection failed",
    };
  }
  const payload = await readJson(upstream);
  if (!upstream.ok) {
    return {
      message:
        upstreamErrorSchema.safeParse(payload).data?.error ??
        "Reflet refused this connect code.",
      ok: false,
      status: 400,
      title: "Connection refused",
    };
  }
  const exchange = tokenExchangeSchema.safeParse(payload);
  if (!exchange.success) {
    return {
      message: "Reflet answered with an unexpected response.",
      ok: false,
      status: 502,
      title: "Connection failed",
    };
  }
  await saveConnection(settings.root, {
    apiUrl: settings.apiUrl,
    organizationName: exchange.data.organizationName,
    token: exchange.data.token,
  });
  return { ok: true, organizationName: exchange.data.organizationName };
}

const READY_MESSAGES: Record<ConnectClient, string> = {
  desktopApp: "Go back to the app: you can record sessions now.",
  devServer: "Go back to your app: the Reflet devtools are ready.",
};

export function connectOutcomePage(
  outcome: ConnectOutcome,
  client: ConnectClient
): Response {
  if (!outcome.ok) {
    return htmlPage(outcome.title, outcome.message, outcome.status);
  }
  return htmlPage(
    "Connected",
    `Connected to ${outcome.organizationName}. ${READY_MESSAGES[client]}`,
    200
  );
}

export async function finishConnect(
  request: Request,
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const outcome = await redeemConnectCode(settings, {
    code: searchParams.get("code"),
    redirectUri: redirectUriFor(request),
    state: searchParams.get("state"),
  });
  return connectOutcomePage(outcome, "devServer");
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

/** Removes the stored token and revokes it on Reflet; false when nothing was revoked. */
export async function forgetConnection(
  settings: ResolvedDevtoolsOptions
): Promise<boolean> {
  const removed = await removeConnection(settings.root, settings.apiUrl);
  return removed ? await revokeUpstream(removed.apiUrl, removed.token) : false;
}

export async function disconnect(
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
  const revoked = await forgetConnection(settings);
  return jsonResponse({ revoked } satisfies DisconnectResponse);
}
