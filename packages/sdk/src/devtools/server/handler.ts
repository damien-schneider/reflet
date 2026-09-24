import {
  DEVTOOLS_ENDPOINTS,
  DEVTOOLS_ROUTE_BASE,
  DEVTOOLS_STATUS_MARKER,
  type DevtoolsStatus,
} from "../protocol";
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
import { rejectUntrustedRequest } from "./request-guard";
import { searchCode } from "./source/code-search";
import { type ProjectRoots, resolveProjectRoots } from "./source/project-roots";
import { readSourceFile } from "./source/source-file";

export type DevtoolsHandler = (request: Request) => Promise<Response>;

const TRAILING_SLASHES = /\/+$/;

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

async function routeRequest(
  request: Request,
  settings: ResolvedDevtoolsOptions,
  projectRoots: () => ProjectRoots
): Promise<Response> {
  const url = new URL(request.url);
  const subPath = routeSubPath(url.pathname);

  if (subPath?.startsWith(`${DEVTOOLS_ENDPOINTS.proxy}/`)) {
    const apiPath = subPath.slice(DEVTOOLS_ENDPOINTS.proxy.length);
    return await proxyToReflet(request, apiPath, settings);
  }

  const isReadEndpoint =
    subPath === DEVTOOLS_ENDPOINTS.status ||
    subPath === DEVTOOLS_ENDPOINTS.source ||
    subPath === DEVTOOLS_ENDPOINTS.search;
  if (isReadEndpoint && request.method !== "GET") {
    return errorResponse(`${subPath} only answers GET requests.`, 405);
  }

  switch (subPath) {
    case DEVTOOLS_ENDPOINTS.status:
      return jsonResponse({
        editor: settings.editor,
        hasSecretKey: settings.secretKey !== null,
        marker: DEVTOOLS_STATUS_MARKER,
      } satisfies DevtoolsStatus);
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
    const rejection = rejectUntrustedRequest(request, settings.allowedHosts);
    if (rejection) {
      return rejection;
    }
    try {
      return await routeRequest(request, settings, projectRoots);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return errorResponse(`Reflet devtools route failed: ${reason}`, 500);
    }
  };
}
