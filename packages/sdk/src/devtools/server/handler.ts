import {
  DEVTOOLS_ENDPOINTS,
  DEVTOOLS_ROUTE_BASE,
  DEVTOOLS_STATUS_MARKER,
  type DevtoolsStatus,
} from "../protocol";
import { boardAccess, boardCredential } from "./connect/board-credential";
import {
  disconnect,
  finishConnect,
  startConnect,
} from "./connect/connect-routes";
import { removeConnection } from "./connect/connection-store";
import {
  type DevtoolsOutcome,
  errorResponse,
  jsonResponse,
} from "./json-response";
import {
  type DevtoolsEnv,
  type DevtoolsServerOptions,
  type ResolvedDevtoolsOptions,
  resolveDevtoolsOptions,
} from "./options";
import { proxyToReflet } from "./reflet-proxy";
import { rejectUntrustedCaller, rejectUntrustedHost } from "./request-guard";
import { searchCode } from "./source/code-search";
import { type ProjectRoots, resolveProjectRoots } from "./source/project-roots";
import { readSourceFile } from "./source/source-file";

export type DevtoolsHandler = (request: Request) => Promise<Response>;

const TRAILING_SLASHES = /\/+$/;

const ENDPOINT_METHODS: Record<string, "GET" | "POST"> = {
  [DEVTOOLS_ENDPOINTS.connectCallback]: "GET",
  [DEVTOOLS_ENDPOINTS.connectStart]: "POST",
  [DEVTOOLS_ENDPOINTS.disconnect]: "POST",
  [DEVTOOLS_ENDPOINTS.search]: "GET",
  [DEVTOOLS_ENDPOINTS.source]: "GET",
  [DEVTOOLS_ENDPOINTS.status]: "GET",
};

function outcomeResponse<T>(outcome: DevtoolsOutcome<T>): Response {
  return outcome.ok
    ? jsonResponse(outcome.value)
    : errorResponse(outcome.error, outcome.status);
}

function routeSubPath(pathname: string): string | null {
  const baseIndex = pathname.indexOf(DEVTOOLS_ROUTE_BASE);
  if (baseIndex === -1) {
    return null;
  }
  return pathname
    .slice(baseIndex + DEVTOOLS_ROUTE_BASE.length)
    .replace(TRAILING_SLASHES, "");
}

function readInteger(value: string | null, minimum: number): number | null {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : null;
}

async function proxyWithBoardCredential(
  request: Request,
  apiPath: string,
  settings: ResolvedDevtoolsOptions
): Promise<Response> {
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

async function routeRequest(
  request: Request,
  subPath: string | null,
  settings: ResolvedDevtoolsOptions,
  projectRoots: () => ProjectRoots
): Promise<Response> {
  const url = new URL(request.url);

  if (subPath?.startsWith(`${DEVTOOLS_ENDPOINTS.proxy}/`)) {
    const apiPath = subPath.slice(DEVTOOLS_ENDPOINTS.proxy.length);
    return await proxyWithBoardCredential(request, apiPath, settings);
  }

  const requiredMethod = subPath ? ENDPOINT_METHODS[subPath] : undefined;
  if (requiredMethod && request.method !== requiredMethod) {
    return errorResponse(
      `${subPath} only answers ${requiredMethod} requests.`,
      405
    );
  }

  switch (subPath) {
    case DEVTOOLS_ENDPOINTS.status:
      return jsonResponse({
        board: await boardAccess(request, settings),
        editor: settings.editor,
        marker: DEVTOOLS_STATUS_MARKER,
      } satisfies DevtoolsStatus);
    case DEVTOOLS_ENDPOINTS.connectStart:
      return await startConnect(request, settings);
    case DEVTOOLS_ENDPOINTS.connectCallback:
      return await finishConnect(request, settings);
    case DEVTOOLS_ENDPOINTS.disconnect:
      return await disconnect(settings);
    case DEVTOOLS_ENDPOINTS.source:
      return outcomeResponse(
        await readSourceFile(
          {
            column: readInteger(url.searchParams.get("column"), 0),
            fileName: url.searchParams.get("file") ?? "",
            line: readInteger(url.searchParams.get("line"), 1),
          },
          projectRoots()
        )
      );
    case DEVTOOLS_ENDPOINTS.search:
      return outcomeResponse(
        await searchCode(
          projectRoots().workspaceRoot,
          url.searchParams.get("q") ?? ""
        )
      );
    default:
      return errorResponse(
        `No Reflet devtools endpoint at ${url.pathname}.`,
        404
      );
  }
}

export function createDevtoolsHandler(
  options: DevtoolsServerOptions = {},
  env: DevtoolsEnv = process.env
): DevtoolsHandler {
  const settings = resolveDevtoolsOptions(options, env);
  let roots: ProjectRoots | null = null;
  const projectRoots = (): ProjectRoots => {
    roots ??= resolveProjectRoots(settings.root);
    return roots;
  };

  return async (request) => {
    const hostRejection = rejectUntrustedHost(request, settings.allowedHosts);
    if (hostRejection) {
      return hostRejection;
    }
    const subPath = routeSubPath(new URL(request.url).pathname);
    const isConnectCallback =
      request.method === "GET" &&
      subPath === DEVTOOLS_ENDPOINTS.connectCallback;
    const callerRejection = isConnectCallback
      ? null
      : rejectUntrustedCaller(request, settings.allowedHosts);
    if (callerRejection) {
      return callerRejection;
    }
    try {
      return await routeRequest(request, subPath, settings, projectRoots);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return errorResponse(`Reflet devtools route failed: ${reason}`, 500);
    }
  };
}
