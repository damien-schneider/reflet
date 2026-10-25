import { readLiveHubFile } from "../../live/hub/hub-file";
import {
  encodeLiveAppHeader,
  LIVE_APP_HEADER,
  LIVE_STATUS_OFF,
  liveHubAddress,
} from "../../live/protocol";
import { DEVTOOLS_ENDPOINTS } from "../protocol";
import {
  errorResponse,
  JSON_RESPONSE_HEADERS,
  jsonResponse,
} from "./json-response";
import type { ProjectRoots } from "./source/project-roots";

const HUB_TIMEOUT_MS = 5000;
const COMMAND_TIMEOUT_MS = 8000;
const NOT_RUNNING_ERROR = "Reflet Live is not running.";
const TIMEOUT_ERROR = "Reflet Live did not answer in time.";

function hubUnavailable(subPath: string, error: unknown): Response {
  if (subPath === DEVTOOLS_ENDPOINTS.livePresence) {
    return jsonResponse(LIVE_STATUS_OFF);
  }
  const isTimeout =
    error instanceof DOMException && error.name === "TimeoutError";
  return isTimeout
    ? errorResponse(TIMEOUT_ERROR, 504)
    : errorResponse(NOT_RUNNING_ERROR, 409);
}

export async function forwardToLiveHub(
  request: Request,
  subPath: string,
  roots: ProjectRoots
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(`${subPath} only answers POST requests.`, 405);
  }
  const hub = await readLiveHubFile();
  if (!hub) {
    return hubUnavailable(subPath, null);
  }
  const appHeader = encodeLiveAppHeader({
    origin: new URL(request.url).origin,
    root: roots.root,
    workspaceRoot: roots.workspaceRoot,
  });
  const timeoutMs =
    subPath === DEVTOOLS_ENDPOINTS.liveCommand
      ? COMMAND_TIMEOUT_MS
      : HUB_TIMEOUT_MS;

  let upstream: Response;
  try {
    upstream = await fetch(`${liveHubAddress(hub.port)}${subPath}`, {
      body: await request.text(),
      headers: {
        authorization: `Bearer ${hub.secret}`,
        "content-type": "application/json",
        [LIVE_APP_HEADER]: appHeader,
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return hubUnavailable(subPath, error);
  }
  return new Response(upstream.body, {
    headers: JSON_RESPONSE_HEADERS,
    status: upstream.status,
  });
}
