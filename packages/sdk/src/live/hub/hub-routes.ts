import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  DEVTOOLS_ENDPOINTS,
  DEVTOOLS_ROUTE_BASE,
} from "../../devtools/protocol";
import { listConnections } from "../../devtools/server/connect/connection-store";
import {
  errorResponse,
  jsonResponse,
  outcomeResponse,
} from "../../devtools/server/json-response";
import { proxyToReflet } from "../../devtools/server/reflet-proxy";
import {
  rejectUntrustedCaller,
  rejectUntrustedHost,
} from "../../devtools/server/request-guard";
import {
  decodeLiveAppHeader,
  LIVE_APP_API_PATHS,
  LIVE_APP_HEADER,
  LIVE_HUB_ENDPOINTS,
  type LiveAppApiPath,
  type LiveConnections,
  type LiveHubHealth,
  liveAppApiRoute,
  liveCommandRequestSchema,
  liveConnectionChoiceSchema,
  livePresenceSchema,
  liveWindowStateSchema,
} from "../protocol";
import type { LiveHubState } from "./hub-state";

export const OPEN_WINDOW_STREAM = Symbol("open-window-stream");
export type HubResponse = Response | typeof OPEN_WINDOW_STREAM;
type Route = (request: Request, path: string) => Promise<HubResponse>;
type Routes = Partial<Record<string, Route>>;

export const HUB_PAGE_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": "frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const WINDOW_BUNDLE = "live-window.js";
const WINDOW_PROXY_PREFIX = `${DEVTOOLS_ROUTE_BASE}${DEVTOOLS_ENDPOINTS.proxy}`;
const NO_ALLOWED_HOSTS: string[] = [];
const NOT_RECORDING = "Reflet Live is not recording.";
const PICK_ORGANIZATION =
  "Pick the Reflet organization in the Live window first.";
const sessionTargetSchema = z.object({ sessionId: z.string() });

const WINDOW_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reflet Live</title></head>
<body><div id="root"></div><script type="module" src="/${WINDOW_BUNDLE}"></script></body>
</html>
`;

async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const invalidBody = (what: string) =>
  errorResponse(`Reflet Live expected ${what}.`, 400);

async function serveWindowBundle(windowDirectory: string): Promise<Response> {
  const path = join(windowDirectory, WINDOW_BUNDLE);
  try {
    return new Response(await readFile(path), {
      headers: {
        ...HUB_PAGE_HEADERS,
        "content-type": "text/javascript; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return errorResponse(
        `The Live window bundle is missing at ${path}. Reinstall reflet-cli.`,
        404
      );
    }
    throw error;
  }
}

function hasBearer(request: Request, secret: string): boolean {
  const presented = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    presented.length === expected.length && timingSafeEqual(presented, expected)
  );
}

function windowRoutes(state: LiveHubState): Routes {
  const connections = async (): Promise<LiveConnections> => {
    const listed = await listConnections();
    const { selectedId } = state;
    return {
      connections: listed.map(({ apiUrl, id, organizationName }) => ({
        apiUrl,
        id,
        organizationName,
      })),
      selectedId: listed.some((connection) => connection.id === selectedId)
        ? selectedId
        : null,
    };
  };

  return {
    [`GET ${LIVE_HUB_ENDPOINTS.windowStream}`]: async () => OPEN_WINDOW_STREAM,
    [`GET ${LIVE_HUB_ENDPOINTS.connections}`]: async () =>
      jsonResponse(await connections()),
    [`POST ${LIVE_HUB_ENDPOINTS.connection}`]: async (request) => {
      const choice = await parseJson(request, liveConnectionChoiceSchema);
      if (!choice) {
        return invalidBody("a connection id");
      }
      const connection = (await listConnections()).find(
        (listed) => listed.id === choice.id
      );
      if (!connection) {
        return errorResponse("No Reflet connection has that id.", 404);
      }
      const refusal = state.selectConnection(connection);
      return refusal
        ? errorResponse(refusal, 409)
        : jsonResponse(await connections());
    },
    [`POST ${LIVE_HUB_ENDPOINTS.windowState}`]: async (request) => {
      const windowState = await parseJson(request, liveWindowStateSchema);
      return windowState
        ? jsonResponse(state.updateWindow(windowState))
        : invalidBody("the Live window state");
    },
  };
}

function appRoutes(state: LiveHubState): Routes {
  const forwarded = LIVE_APP_API_PATHS.map((apiPath): [string, Route] => [
    `POST ${liveAppApiRoute(apiPath)}`,
    (request) => forwardAppApi(state, request, apiPath),
  ]);
  return {
    ...Object.fromEntries(forwarded),
    [`GET ${LIVE_HUB_ENDPOINTS.feed}`]: async () =>
      jsonResponse(state.readFeed()),
    [`POST ${LIVE_HUB_ENDPOINTS.command}`]: async (request) => {
      const command = await parseJson(request, liveCommandRequestSchema);
      if (!command) {
        return invalidBody("start, pause, resume or stop");
      }
      return outcomeResponse(await state.command(command.action));
    },
    [`POST ${LIVE_HUB_ENDPOINTS.presence}`]: async (request) => {
      const identity = decodeLiveAppHeader(
        request.headers.get(LIVE_APP_HEADER)
      );
      if (!identity) {
        return errorResponse(
          `Reflet Live presence must send the ${LIVE_APP_HEADER} header.`,
          400
        );
      }
      const presence = await parseJson(request, livePresenceSchema);
      return presence
        ? jsonResponse(state.reportPresence(identity, presence))
        : invalidBody("a presence report");
    },
  };
}

async function forwardAppApi(
  state: LiveHubState,
  request: Request,
  apiPath: LiveAppApiPath
): Promise<Response> {
  const body = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return invalidBody("a JSON body");
  }
  const target = sessionTargetSchema.safeParse(payload);
  const connection = await state.connection();
  if (
    !(
      target.success &&
      connection &&
      state.isCurrentSession(target.data.sessionId)
    )
  ) {
    return errorResponse(NOT_RECORDING, 409);
  }
  return await proxyToReflet(
    new Request(request.url, { body, method: request.method }),
    apiPath,
    connection
  );
}

async function proxyForWindow(
  state: LiveHubState,
  request: Request,
  path: string
): Promise<Response> {
  const connection = await state.connection();
  if (!connection) {
    return errorResponse(PICK_ORGANIZATION, 503);
  }
  return await proxyToReflet(
    request,
    path.slice(WINDOW_PROXY_PREFIX.length),
    connection
  );
}

export function createHubRoutes(
  state: LiveHubState,
  secret: string,
  windowDirectory: string
): (request: Request) => Promise<HubResponse> {
  const open: Routes = {
    "GET /": async () =>
      new Response(WINDOW_PAGE, {
        headers: {
          ...HUB_PAGE_HEADERS,
          "content-type": "text/html; charset=utf-8",
        },
      }),
    [`GET /${WINDOW_BUNDLE}`]: () => serveWindowBundle(windowDirectory),
    [`GET ${LIVE_HUB_ENDPOINTS.health}`]: async () =>
      jsonResponse({
        app: "reflet-live",
        pid: process.pid,
        windowConnected: state.hasWindow,
      } satisfies LiveHubHealth),
  };
  const forWindow = windowRoutes(state);
  const forApps = appRoutes(state);

  const windowRoute = (key: string, path: string): Route | undefined =>
    forWindow[key] ??
    (path.startsWith(`${WINDOW_PROXY_PREFIX}/`)
      ? (request) => proxyForWindow(state, request, path)
      : undefined);

  return async (request) => {
    const path = new URL(request.url).pathname;
    const key = `${request.method} ${path}`;
    const hostRejection = rejectUntrustedHost(request, NO_ALLOWED_HOSTS);
    if (hostRejection) {
      return hostRejection;
    }
    const openRoute = open[key];
    if (openRoute) {
      return await openRoute(request, path);
    }
    const forApp = forApps[key];
    if (forApp) {
      return hasBearer(request, secret)
        ? await forApp(request, path)
        : errorResponse("Reflet Live needs the hub secret.", 401);
    }
    const forWindowCall = windowRoute(key, path);
    if (forWindowCall) {
      return (
        rejectUntrustedCaller(request, NO_ALLOWED_HOSTS) ??
        (await forWindowCall(request, path))
      );
    }
    return errorResponse(`No Reflet Live endpoint at ${key}.`, 404);
  };
}
