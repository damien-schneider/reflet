export const SESSION_API_PATHS = [
  "/api/v1/sessions/analyze",
  "/api/v1/sessions/collection",
  "/api/v1/sessions/delete",
  "/api/v1/sessions/detail",
  "/api/v1/sessions/events",
  "/api/v1/sessions/evidence",
  "/api/v1/sessions/evidence/remove",
  "/api/v1/sessions/handoffs",
  "/api/v1/sessions/handoffs/delivered",
  "/api/v1/sessions/handoffs/preview",
  "/api/v1/sessions/identity",
  "/api/v1/sessions/intentions/accept",
  "/api/v1/sessions/intentions/answer",
  "/api/v1/sessions/intentions/attach",
  "/api/v1/sessions/intentions/change",
  "/api/v1/sessions/intentions/detach",
  "/api/v1/sessions/intentions/keep-separate",
  "/api/v1/sessions/list",
  "/api/v1/sessions/live",
  "/api/v1/sessions/proposals/clarify",
  "/api/v1/sessions/proposals/decide",
  "/api/v1/sessions/proposals/delete",
  "/api/v1/sessions/proposals/edit",
  "/api/v1/sessions/proposals/feedback",
  "/api/v1/sessions/proposals/merge",
  "/api/v1/sessions/proposals/separate",
  "/api/v1/sessions/proposals/verify",
  "/api/v1/sessions/segments",
  "/api/v1/sessions/segments/context",
  "/api/v1/sessions/segments/context-choices",
  "/api/v1/sessions/segments/correct",
  "/api/v1/sessions/segments/retry",
  "/api/v1/sessions/speakers",
  "/api/v1/sessions/speakers/token",
  "/api/v1/sessions/start",
  "/api/v1/sessions/update",
  "/api/v1/sessions/upload-url",
] as const;

export type SessionApiPath = (typeof SESSION_API_PATHS)[number];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const SESSION_LIMITS = {
  audioRetentionMs: DAY_MS,
  maxDurationMs: 30 * MINUTE_MS,
  maxEvents: 5000,
  maxEventsPerBatch: 200,
  maxEvidence: 60,
  maxImageBytes: 2_500_000,
  maxLocalBufferBytes: 60_000_000,
  maxSegmentBytes: 1_100_000,
  maxSegmentMs: 30_000,
  maxSegments: 400,
  maxVisibleElements: 80,
  minAutoCaptureIntervalMs: 10_000,
  warnBeforeLimitMs: 5 * MINUTE_MS,
} as const;

export const LIVE_SESSION_LIMITS = {
  ...SESSION_LIMITS,
  maxDurationMs: 4 * HOUR_MS,
  maxEvents: 20_000,
  maxEvidence: 240,
  maxSegments: 2000,
  warnBeforeLimitMs: 10 * MINUTE_MS,
} as const;

export type SessionLimits = typeof SESSION_LIMITS | typeof LIVE_SESSION_LIMITS;

export const sessionLimitsFor = (
  surface: "app" | "devtools" | "live"
): SessionLimits => (surface === "live" ? LIVE_SESSION_LIMITS : SESSION_LIMITS);

export const SPEAKER_TURN_LIMITS = {
  maxPerBatch: 200,
  maxPerSession: 5000,
} as const;

export const SESSION_TEXT_LIMITS = {
  callout: 60,
  clarification: 1000,
  label: 160,
  linkAccess: 200,
  linkLabel: 120,
  listItem: 300,
  listItems: 8,
  need: 300,
  note: 1000,
  observed: 2000,
  pageTitle: 300,
  response: 1000,
  segmentText: 5000,
  selector: 600,
  sessionTitle: 120,
  url: 2000,
} as const;

export const SESSION_START_PAST_TOLERANCE_MS = DAY_MS;
export const SESSION_START_FUTURE_TOLERANCE_MS = MINUTE_MS;
export const SESSION_INTERRUPT_AFTER_MS =
  SESSION_LIMITS.maxDurationMs + 30 * MINUTE_MS;
export const LIVE_SESSION_INTERRUPT_AFTER_MS =
  LIVE_SESSION_LIMITS.maxDurationMs + 30 * MINUTE_MS;
export const LIVE_SESSION_RETENTION_MS = DAY_MS;
export const LIVE_CONTEXT_LOOKBACK_MS = 2 * MINUTE_MS;
export const SESSION_TOMBSTONE_RETENTION_MS = 30 * DAY_MS;
export const SESSION_LIST_LIMIT = 50;
export const MAX_HANDOFF_DELIVERIES = 20;
export const SESSION_CRON_BATCH_SIZE = 100;
export const DEFAULT_SESSION_TITLE = "Untitled session";
export const AUDIO_CONTENT_TYPES: Record<string, true> = { "audio/wav": true };
export const IMAGE_CONTENT_TYPES: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

export const SESSION_MEMBER_REQUIRED =
  "Sessions need a signed-in Reflet member. Connect from the devtools panel.";
export const SESSION_NOT_FOUND = "Session not found";
export const RECORDED_WHILE_PAUSED = "Recorded while paused";
export const REVISION_CONFLICT =
  "This changed since you opened it. Reload and try again.";
export const INTENTION_DELETED = "This intention was deleted.";
export const SHARE_CONSENT_REQUIRED =
  "This intention is shared with your team. Confirm that these passages can be shared too.";
export const CONTRIBUTION_REMOVED =
  "These changes were removed from the intention.";
export const INTENTION_UNAVAILABLE =
  "This intention can't be continued: it was set aside, merged or added to another one.";
