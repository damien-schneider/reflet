export const DEVTOOLS_ROUTE_BASE = "/api/reflet-devtools";

/**
 * Sent on every devtools request. A custom header forces a CORS preflight, so
 * a page on another origin cannot drive the route from the developer's browser.
 */
export const DEVTOOLS_REQUEST_HEADER = "x-reflet-devtools";

export const DEVTOOLS_ENDPOINTS = {
  proxy: "/proxy",
  search: "/search",
  source: "/source",
  status: "/status",
} as const;

export const PROXIED_API_PATHS = [
  "/api/v1/feedback/create",
  "/api/v1/feedback/item",
  "/api/v1/feedback/list",
  "/api/v1/feedback/screenshot/save",
  "/api/v1/feedback/screenshot/upload-url",
] as const;

export const EDITORS = [
  "cursor",
  "vscode",
  "webstorm",
  "windsurf",
  "zed",
] as const;

export type EditorId = (typeof EDITORS)[number];

export const DEVTOOLS_STATUS_MARKER = "reflet-devtools";

export interface DevtoolsStatus {
  editor: EditorId;
  hasSecretKey: boolean;
  marker: typeof DEVTOOLS_STATUS_MARKER;
}

export interface LineRange {
  end: number;
  start: number;
}

export interface SourceFile {
  absolutePath: string;
  code: string;
  /** 0-based, like React's frames; null when the map only knows the line. */
  column: number | null;
  /** Lines spanned by the JSX element the frame points at, 1-based. */
  elementLines: LineRange | null;
  line: number | null;
  /** Relative to the repository root, for display. */
  path: string;
}

export interface CodeMatch {
  absolutePath: string;
  line: number;
  path: string;
  preview: string;
}

export interface CodeSearchResult {
  matches: CodeMatch[];
}

export interface DevtoolsErrorBody {
  error: string;
}
