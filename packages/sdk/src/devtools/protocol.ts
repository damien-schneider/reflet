import { LIVE_HUB_ENDPOINTS } from "../live/protocol";
import { SESSION_API_PATHS } from "../sessions/api-paths";

export const DEVTOOLS_ROUTE_BASE = "/api/reflet-devtools";

/**
 * Sent on every devtools request. A custom header forces a CORS preflight, so
 * a page on another origin cannot drive the route from the developer's browser.
 */
export const DEVTOOLS_REQUEST_HEADER = "x-reflet-devtools";

export const DEVTOOLS_ACCOUNT_HEADER = "x-reflet-account";

export const DEVTOOLS_ENDPOINTS = {
  connectCallback: "/connect/callback",
  connectStart: "/connect/start",
  disconnect: "/connect/disconnect",
  liveCommand: LIVE_HUB_ENDPOINTS.command,
  livePresence: LIVE_HUB_ENDPOINTS.presence,
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
  ...SESSION_API_PATHS,
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

export type BoardAccess =
  | { kind: "secretKey" }
  | { kind: "connected"; organizationName: string }
  | { canConnect: boolean; kind: "disconnected" };

export interface MachineAccount {
  id: string;
  organizationName: string;
}

export interface DevtoolsStatus {
  board: BoardAccess;
  editor: EditorId;
  machineAccounts: MachineAccount[];
  marker: typeof DEVTOOLS_STATUS_MARKER;
}

export interface ConnectStartResponse {
  authorizeUrl: string;
}

export interface DisconnectResponse {
  revoked: boolean;
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

/** Server Components' frames point into the dev server's own chunks: only the route can map them. */
export const SERVER_FRAME_ORIGIN = "(?:about|rsc)://React/Server/";
export const SERVER_FRAME_PREFIX = new RegExp(`^${SERVER_FRAME_ORIGIN}`);

export function isServerFrame(fileName: string): boolean {
  return SERVER_FRAME_PREFIX.test(fileName);
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
