import { z } from "zod";

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
  "/api/v1/sessions/identity",
  "/api/v1/sessions/list",
  "/api/v1/sessions/proposals/clarify",
  "/api/v1/sessions/proposals/create",
  "/api/v1/sessions/proposals/decide",
  "/api/v1/sessions/proposals/edit",
  "/api/v1/sessions/proposals/feedback",
  "/api/v1/sessions/proposals/merge",
  "/api/v1/sessions/proposals/separate",
  "/api/v1/sessions/proposals/verify",
  "/api/v1/sessions/segments",
  "/api/v1/sessions/segments/correct",
  "/api/v1/sessions/segments/retry",
  "/api/v1/sessions/start",
  "/api/v1/sessions/update",
  "/api/v1/sessions/upload-url",
] as const;

export type SessionApiPath = (typeof SESSION_API_PATHS)[number];

export const SESSION_SURFACES = ["devtools", "app"] as const;
export type SessionSurface = (typeof SESSION_SURFACES)[number];

export const SESSION_GAP_REASONS = [
  "paused",
  "hidden",
  "interrupted",
  "limit",
] as const;
export type SessionGapReason = (typeof SESSION_GAP_REASONS)[number];

export const SESSION_LIMIT_KINDS = [
  "duration",
  "segments",
  "events",
  "evidence",
  "bytes",
] as const;
export type SessionLimitKind = (typeof SESSION_LIMIT_KINDS)[number];

export const PROPOSAL_DECISIONS = [
  "pending",
  "kept",
  "later",
  "dismissed",
] as const;
export type ProposalDecision = (typeof PROPOSAL_DECISIONS)[number];

export const EVIDENCE_TRIGGERS = [
  "start",
  "mark",
  "navigation",
  "select",
  "manual",
] as const;
export type EvidenceTrigger = (typeof EVIDENCE_TRIGGERS)[number];

export const sessionLimitsSchema = z.object({
  audioRetentionMs: z.number(),
  maxDurationMs: z.number(),
  maxEvents: z.number(),
  maxEventsPerBatch: z.number(),
  maxEvidence: z.number(),
  maxImageBytes: z.number(),
  maxLocalBufferBytes: z.number(),
  maxSegmentBytes: z.number(),
  maxSegmentMs: z.number(),
  maxSegments: z.number(),
  minAutoCaptureIntervalMs: z.number(),
  warnBeforeLimitMs: z.number(),
});
export type SessionLimits = z.infer<typeof sessionLimitsSchema>;

export const sessionIdentitySchema = z.object({
  analysisConfigured: z.boolean(),
  limits: sessionLimitsSchema,
  organizationId: z.string(),
  organizationName: z.string(),
  transcriptionConfigured: z.boolean(),
  user: z.object({
    email: z.string().nullable(),
    id: z.string(),
    name: z.string().nullable(),
  }),
});
export type SessionIdentity = z.infer<typeof sessionIdentitySchema>;

export const analysisStatusSchema = z.object({
  analyzedRevision: z.number().nullable(),
  error: z.string().nullable(),
  proposalCount: z.number().nullable(),
  state: z.enum(["idle", "waiting", "running", "succeeded", "failed"]),
  transcriptRevision: z.number(),
  updatedAt: z.number().nullable(),
});
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

export const sessionSummarySchema = z.object({
  analysis: analysisStatusSchema,
  authorName: z.string().nullable(),
  collection: z.enum(["recording", "paused", "ended"]),
  counts: z.object({
    evidence: z.number(),
    failedSegments: z.number(),
    handoffs: z.number(),
    kept: z.number(),
    pendingSegments: z.number(),
    proposals: z.number(),
    segments: z.number(),
  }),
  durationMs: z.number(),
  endedAt: z.number().nullable(),
  id: z.string(),
  isMine: z.boolean(),
  startedAt: z.number(),
  surface: z.enum(SESSION_SURFACES),
  title: z.string(),
  visibility: z.enum(["private", "team"]),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

const rectSchema = z.object({
  height: z.number(),
  width: z.number(),
  x: z.number(),
  y: z.number(),
});

export const elementRefSchema = z.object({
  component: z.string().nullable(),
  label: z.string(),
  rect: rectSchema,
  role: z.string().nullable(),
  selector: z.string(),
  source: z.string().nullable(),
});
export type ElementRef = z.infer<typeof elementRefSchema>;

export const frameSchema = z.object({
  devicePixelRatio: z.number(),
  scrollX: z.number(),
  scrollY: z.number(),
  title: z.string().nullable(),
  url: z.string(),
  viewportHeight: z.number(),
  viewportWidth: z.number(),
});
export type Frame = z.infer<typeof frameSchema>;

const pointerSchema = z.object({ x: z.number(), y: z.number() });

export const sessionEventSchema = z.discriminatedUnion("kind", [
  z.object({
    atMs: z.number(),
    frame: frameSchema,
    kind: z.literal("navigation"),
  }),
  z.object({
    atMs: z.number(),
    element: elementRefSchema,
    frame: frameSchema,
    kind: z.literal("click"),
    pointer: pointerSchema,
  }),
  z.object({
    atMs: z.number(),
    durationMs: z.number(),
    element: elementRefSchema,
    frame: frameSchema,
    kind: z.literal("dwell"),
    pointer: pointerSchema,
  }),
  z.object({
    atMs: z.number(),
    kind: z.literal("scroll"),
    scrollX: z.number(),
    scrollY: z.number(),
  }),
  z.object({
    atMs: z.number(),
    devicePixelRatio: z.number(),
    kind: z.literal("viewport"),
    viewportHeight: z.number(),
    viewportWidth: z.number(),
  }),
  z.object({
    atMs: z.number(),
    element: elementRefSchema.nullable(),
    evidenceClientKey: z.string().nullable(),
    frame: frameSchema,
    kind: z.literal("mark"),
    note: z.string().nullable(),
  }),
  z.object({
    atMs: z.number(),
    element: elementRefSchema,
    evidenceClientKey: z.string().nullable(),
    frame: frameSchema,
    kind: z.literal("select"),
    note: z.string().nullable(),
  }),
]);
export type SessionEvent = z.infer<typeof sessionEventSchema>;

export const sessionGapSchema = z.object({
  endMs: z.number().nullable(),
  reason: z.enum(SESSION_GAP_REASONS),
  startMs: z.number(),
});
export type SessionGap = z.infer<typeof sessionGapSchema>;

export const segmentContextSchema = z.object({
  atMs: z.number(),
  evidenceId: z.string().nullable(),
  kind: z.enum(["mark", "select", "click", "dwell", "navigation"]),
  label: z.string(),
  url: z.string().nullable(),
});
export type SegmentContext = z.infer<typeof segmentContextSchema>;

export const sessionSegmentSchema = z.object({
  audioExpiresAt: z.number().nullable(),
  context: z.array(segmentContextSchema),
  contextAmbiguous: z.boolean(),
  endMs: z.number(),
  hasAudio: z.boolean(),
  id: z.string(),
  language: z.string().nullable(),
  revision: z.number(),
  source: z.enum(["voice", "typed"]),
  startMs: z.number(),
  text: z.string(),
  textOrigin: z.enum(["transcription", "human"]),
  transcription: z.object({
    attempts: z.number(),
    error: z.string().nullable(),
    state: z.enum(["pending", "running", "done", "empty", "failed", "expired"]),
  }),
});
export type SessionSegment = z.infer<typeof sessionSegmentSchema>;

export const evidenceLinkSchema = z.object({
  access: z.string(),
  label: z.string(),
  url: z.string(),
});
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>;

export const sessionEvidenceSchema = z.object({
  atMs: z.number(),
  element: elementRefSchema.nullable(),
  frame: frameSchema.nullable(),
  id: z.string(),
  image: z
    .object({
      height: z.number(),
      url: z.string().nullable(),
      width: z.number(),
    })
    .nullable(),
  kind: z.enum(["screenshot", "link"]),
  link: evidenceLinkSchema.nullable(),
  missingReason: z.string().nullable(),
  note: z.string().nullable(),
  status: z.enum(["available", "missing"]),
  trigger: z.enum(EVIDENCE_TRIGGERS),
});
export type SessionEvidence = z.infer<typeof sessionEvidenceSchema>;

export const sessionProposalSchema = z.object({
  certainty: z.enum(["clear", "uncertain"]),
  clarifications: z.array(z.object({ at: z.number(), text: z.string() })),
  decision: z.enum(PROPOSAL_DECISIONS),
  evidenceIds: z.array(z.string()),
  feedbackId: z.string().nullable(),
  handedOffRevision: z.number().nullable(),
  id: z.string(),
  mergedIntoId: z.string().nullable(),
  mergeSuggestion: z
    .object({ reason: z.string(), withIds: z.array(z.string()) })
    .nullable(),
  need: z.string(),
  needsReview: z.boolean(),
  observed: z.string(),
  origin: z.enum(["ai", "human"]),
  question: z.string().nullable(),
  refinement: z
    .object({
      error: z.string().nullable(),
      state: z.enum(["running", "failed", "outdated"]),
    })
    .nullable(),
  response: z.string().nullable(),
  revision: z.number(),
  segmentIds: z.array(z.string()),
  setAside: z.array(z.string()),
  unknowns: z.array(z.string()),
  updatedAt: z.number(),
  verification: z
    .object({
      at: z.number(),
      note: z.string().nullable(),
      status: z.enum(["works", "needs_work"]),
    })
    .nullable(),
});
export type SessionProposal = z.infer<typeof sessionProposalSchema>;

export const sessionHandoffSchema = z.object({
  brief: z.string(),
  createdAt: z.number(),
  deliveries: z.array(
    z.object({ at: z.number(), kind: z.enum(["copied", "exported"]) })
  ),
  evidenceIds: z.array(z.string()),
  id: z.string(),
  proposals: z.array(
    z.object({ id: z.string(), need: z.string(), revision: z.number() })
  ),
});
export type SessionHandoff = z.infer<typeof sessionHandoffSchema>;

export const sessionMarkSchema = z.object({
  atMs: z.number(),
  kind: z.enum(["mark", "select", "navigation"]),
  label: z.string(),
  note: z.string().nullable(),
  url: z.string().nullable(),
});
export type SessionMark = z.infer<typeof sessionMarkSchema>;

export const sessionDetailSchema = z.object({
  evidence: z.array(sessionEvidenceSchema),
  handoffs: z.array(sessionHandoffSchema),
  marks: z.array(sessionMarkSchema),
  proposals: z.array(sessionProposalSchema),
  segments: z.array(sessionSegmentSchema),
  session: sessionSummarySchema.extend({
    canEdit: z.boolean(),
    gaps: z.array(sessionGapSchema),
    startUrl: z.string().nullable(),
  }),
});
export type SessionDetail = z.infer<typeof sessionDetailSchema>;

export const handoffFileSchema = z.object({
  evidenceId: z.string(),
  name: z.string(),
  url: z.string(),
});
export type HandoffFile = z.infer<typeof handoffFileSchema>;

export const sessionApiErrorSchema = z.object({
  error: z.string(),
  limit: z.enum(SESSION_LIMIT_KINDS).optional(),
});
