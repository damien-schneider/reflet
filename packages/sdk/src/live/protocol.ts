import { z } from "zod";
import { sessionLimitsSchema } from "../sessions/protocol";

export const LIVE_HUB_DEFAULT_PORT = 47_417;
export const LIVE_APP_HEADER = "x-reflet-live-app";
export const LIVE_ROUTE_PREFIX = "/live";

export const LIVE_HUB_ENDPOINTS = {
  command: "/live/command",
  connection: "/live/connection",
  connections: "/live/connections",
  feed: "/live/feed",
  health: "/live/health",
  presence: "/live/presence",
  windowState: "/live/window/state",
  windowStream: "/live/window/stream",
} as const;

export const LIVE_APP_API_PATHS = [
  "/api/v1/sessions/events",
  "/api/v1/sessions/evidence",
  "/api/v1/sessions/upload-url",
] as const;
export type LiveAppApiPath = (typeof LIVE_APP_API_PATHS)[number];

export function liveAppApiRoute(apiPath: string): string {
  return `${LIVE_ROUTE_PREFIX}${apiPath}`;
}

export const LIVE_STATES = [
  "off",
  "no-window",
  "idle",
  "recording",
  "paused",
  "finishing",
] as const;
export type LiveState = (typeof LIVE_STATES)[number];

export const liveStatusSchema = z.object({
  canStart: z.boolean(),
  organizationName: z.string().nullable(),
  session: z
    .object({
      id: z.string(),
      limits: sessionLimitsSchema,
      startedAt: z.number(),
    })
    .nullable(),
  state: z.enum(LIVE_STATES),
});
export type LiveStatus = z.infer<typeof liveStatusSchema>;

export const LIVE_STATUS_OFF: LiveStatus = {
  canStart: false,
  organizationName: null,
  session: null,
  state: "off",
};

export const LIVE_COMMANDS = ["start", "pause", "resume", "stop"] as const;
export type LiveCommand = (typeof LIVE_COMMANDS)[number];
export const liveCommandRequestSchema = z.object({
  action: z.enum(LIVE_COMMANDS),
});

export const LIVE_FRAME_PATH_MAX = 2000;
export const LIVE_FRAME_TITLE_MAX = 300;

export const liveFrameSchema = z.object({
  path: z.string().max(LIVE_FRAME_PATH_MAX),
  title: z.string().max(LIVE_FRAME_TITLE_MAX).nullable(),
});
export type LiveFrame = z.infer<typeof liveFrameSchema>;

export const livePresenceSchema = z.object({
  at: z.number(),
  clientId: z.string().min(1).max(64),
  focused: z.boolean(),
  frame: liveFrameSchema,
});
export type LivePresence = z.infer<typeof livePresenceSchema>;

export const liveAppIdentitySchema = z.object({
  origin: z.string().min(1),
  root: z.string().min(1),
  workspaceRoot: z.string().min(1),
});
export type LiveAppIdentity = z.infer<typeof liveAppIdentitySchema>;

export function encodeLiveAppHeader(identity: LiveAppIdentity): string {
  return encodeURIComponent(JSON.stringify(identity));
}

export function decodeLiveAppHeader(
  value: string | null
): LiveAppIdentity | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = liveAppIdentitySchema.safeParse(
      JSON.parse(decodeURIComponent(value))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const liveAppSchema = z.object({
  id: z.string(),
  label: z.string(),
  origin: z.string(),
  repoRoot: z.string(),
  root: z.string(),
});
export type LiveApp = z.infer<typeof liveAppSchema>;

export const livePlaceSchema = z.discriminatedUnion("kind", [
  z.object({
    app: liveAppSchema,
    kind: z.literal("app"),
    page: liveFrameSchema.nullable(),
  }),
  z.object({ kind: z.literal("outside"), lastApp: liveAppSchema.nullable() }),
]);
export type LivePlace = z.infer<typeof livePlaceSchema>;

export const liveHubEntrySchema = z.object({
  atMs: z.number(),
  endMs: z.number(),
  id: z.string(),
  lines: z.array(z.string()),
  place: livePlaceSchema,
  screenshotIds: z.array(z.string()),
});
export type LiveHubEntry = z.infer<typeof liveHubEntrySchema>;

export const liveHubFeedSchema = z.object({
  entries: z.array(liveHubEntrySchema),
  screenshots: z.array(z.object({ id: z.string(), url: z.string() })),
  session: z
    .object({
      collection: z.enum(["recording", "paused", "ended"]),
      id: z.string(),
      organizationName: z.string(),
      startedAt: z.number(),
    })
    .nullable(),
  transcription: z.object({ running: z.number() }),
});
export type LiveHubFeed = z.infer<typeof liveHubFeedSchema>;

export const liveWindowStateSchema = z.object({
  canStart: z.boolean(),
  limits: sessionLimitsSchema.nullable(),
  pauseReason: z.enum(["paused", "hidden", "limit"]).nullable(),
  pendingUploads: z.number().int().min(0),
  phase: z.enum([
    "idle",
    "requesting",
    "recording",
    "paused",
    "finishing",
    "failed",
  ]),
  sessionId: z.string().nullable(),
  startedAt: z.number().nullable(),
});
export type LiveWindowState = z.infer<typeof liveWindowStateSchema>;

export const liveFocusSchema = z.object({
  appId: z.string(),
  page: liveFrameSchema.nullable(),
});
export type LiveFocus = z.infer<typeof liveFocusSchema>;

export const liveCaptureSchema = z.object({
  appId: z.string(),
  at: z.number(),
  element: z.object({ label: z.string(), role: z.string().nullable() }),
  kind: z.enum(["click", "pick"]),
});
export type LiveCapture = z.infer<typeof liveCaptureSchema>;

export const liveWindowMessageSchema = z.discriminatedUnion("kind", [
  z.object({
    action: z.enum(LIVE_COMMANDS),
    id: z.string(),
    kind: z.literal("command"),
  }),
  z.object({
    apps: z.array(liveAppSchema),
    focus: liveFocusSchema.nullable(),
    kind: z.literal("apps"),
  }),
  z.object({
    entries: z.array(liveHubEntrySchema),
    kind: z.literal("feed"),
    transcribing: z.number().int().min(0),
  }),
  z.object({ capture: liveCaptureSchema, kind: z.literal("capture") }),
  z.object({ following: z.boolean(), kind: z.literal("agent") }),
  z.object({ kind: z.literal("elsewhere") }),
  z.object({ kind: z.literal("ping") }),
]);
export type LiveWindowMessage = z.infer<typeof liveWindowMessageSchema>;

export const liveConnectionsSchema = z.object({
  connections: z.array(
    z.object({
      apiUrl: z.string(),
      id: z.string(),
      organizationName: z.string(),
    })
  ),
  selectedId: z.string().nullable(),
});
export type LiveConnections = z.infer<typeof liveConnectionsSchema>;

export const liveConnectionChoiceSchema = z.object({ id: z.string().min(1) });

export const liveHubHealthSchema = z.object({
  app: z.literal("reflet-live"),
  pid: z.number(),
  windowConnected: z.boolean(),
});
export type LiveHubHealth = z.infer<typeof liveHubHealthSchema>;

export const liveHubAddress = (port: number) => `http://127.0.0.1:${port}`;
export const liveWindowUrl = (port: number) => `http://localhost:${port}`;

export function describePlace(place: LivePlace): string {
  if (place.kind === "outside") {
    return place.lastApp
      ? `outside your apps (last: ${place.lastApp.label})`
      : "outside your apps";
  }
  const { app, page } = place;
  if (!page) {
    return app.label;
  }
  return page.title
    ? `${app.label} · ${page.title} (${page.path})`
    : `${app.label} · ${page.path}`;
}
