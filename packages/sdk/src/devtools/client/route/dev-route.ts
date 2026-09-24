import type { FeedbackContext, FeedbackItem } from "../../../types";
import {
  type CodeSearchResult,
  DEVTOOLS_ENDPOINTS,
  DEVTOOLS_REQUEST_HEADER,
  DEVTOOLS_ROUTE_BASE,
  DEVTOOLS_STATUS_MARKER,
  type DevtoolsStatus,
  EDITORS,
  type PROXIED_API_PATHS,
  type SourceFile,
} from "../../protocol";

export interface BoardFeedback extends FeedbackItem {
  context?: FeedbackContext;
  isInternal?: boolean;
}

interface BoardFeedbackPage {
  hasMore: boolean;
  items: BoardFeedback[];
  total: number;
}

export interface SourceRequest {
  column: number | null;
  fileName: string;
  line: number | null;
}

type ProxiedApiPath = (typeof PROXIED_API_PATHS)[number];

const INBOX_PAGE_SIZE = 50;

export class DevRouteError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DevRouteError";
    this.status = status;
  }
}

function isDevtoolsStatus(value: unknown): value is DevtoolsStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "marker" in value &&
    value.marker === DEVTOOLS_STATUS_MARKER &&
    "hasSecretKey" in value &&
    typeof value.hasSecretKey === "boolean" &&
    "editor" in value &&
    EDITORS.some((known) => known === value.editor)
  );
}

async function callDevRoute<T>(
  endpoint: string,
  init: {
    body?: unknown;
    method?: "GET" | "POST";
    query?: Record<string, string>;
  } = {}
): Promise<T> {
  const search = init.query ? `?${new URLSearchParams(init.query)}` : "";
  const response = await fetch(`${DEVTOOLS_ROUTE_BASE}${endpoint}${search}`, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      "Content-Type": "application/json",
      [DEVTOOLS_REQUEST_HEADER]: "1",
    },
    method: init.method ?? "GET",
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const routeError =
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : null;
    throw new DevRouteError(
      typeof routeError === "string"
        ? routeError
        : `The Reflet dev route answered ${response.status}.`,
      response.status
    );
  }
  // Shapes owned by protocol.ts and the Reflet public API, same trust as client.ts.
  return body as T;
}

export async function probeDevRoute(): Promise<DevtoolsStatus | null> {
  try {
    const status = await callDevRoute<unknown>(DEVTOOLS_ENDPOINTS.status);
    return isDevtoolsStatus(status) ? status : null;
  } catch {
    return null;
  }
}

export function fetchSourceFile(request: SourceRequest): Promise<SourceFile> {
  const query: Record<string, string> = { file: request.fileName };
  if (request.line !== null) {
    query.line = String(request.line);
  }
  if (request.column !== null) {
    query.column = String(request.column);
  }
  return callDevRoute<SourceFile>(DEVTOOLS_ENDPOINTS.source, { query });
}

export function searchCode(text: string): Promise<CodeSearchResult> {
  return callDevRoute<CodeSearchResult>(DEVTOOLS_ENDPOINTS.search, {
    query: { q: text },
  });
}

export function callReflet<T>(
  apiPath: ProxiedApiPath,
  init: { body?: unknown; query?: Record<string, string> } = {}
): Promise<T> {
  return callDevRoute<T>(`${DEVTOOLS_ENDPOINTS.proxy}${apiPath}`, {
    body: init.body,
    method: init.body === undefined ? "GET" : "POST",
    query: init.query,
  });
}

export async function fetchBoardFeedbackForPage(
  pagePath: string
): Promise<BoardFeedback[]> {
  const page = await callReflet<BoardFeedbackPage>("/api/v1/feedback/list", {
    query: {
      limit: String(INBOX_PAGE_SIZE),
      pagePath,
      sortBy: "newest",
    },
  });
  return page.items;
}
