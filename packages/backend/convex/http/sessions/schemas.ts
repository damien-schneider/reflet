import { z } from "zod";
import {
  SESSION_TEXT_LIMITS as CAPS,
  SESSION_LIMITS,
} from "../../sessions/constants";

const MAX_CLIENT_KEY_LENGTH = 200;
const MAX_ID_LENGTH = 100;
const MAX_IDS = 100;
const MAX_OFFSET_MS = 7 * 24 * 60 * 60_000;

const id = z.string().min(1).max(MAX_ID_LENGTH);
const clientKey = z.string().min(1).max(MAX_CLIENT_KEY_LENGTH);
const offsetMs = z.number().finite().min(0).max(MAX_OFFSET_MS);
const finite = z.number().finite();
const text = (max: number) => z.string().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const listItems = z.array(text(CAPS.listItem)).max(CAPS.listItems);
const nullableText = (max: number) => text(max).nullable();

const rect = z.object({ height: finite, width: finite, x: finite, y: finite });

const elementRef = z.object({
  component: nullableText(CAPS.label),
  label: text(CAPS.label),
  rect,
  role: nullableText(CAPS.label),
  selector: text(CAPS.selector),
  source: nullableText(CAPS.selector),
});

const frame = z.object({
  devicePixelRatio: finite,
  scrollX: finite,
  scrollY: finite,
  title: nullableText(CAPS.pageTitle),
  url: text(CAPS.url),
  viewportHeight: finite,
  viewportWidth: finite,
});

const pointer = z.object({ x: finite, y: finite });

const sessionEvent = z.discriminatedUnion("kind", [
  z.object({ atMs: offsetMs, frame, kind: z.literal("navigation") }),
  z.object({
    atMs: offsetMs,
    element: elementRef,
    frame,
    kind: z.literal("click"),
    pointer: pointer.nullable(),
  }),
  z.object({
    atMs: offsetMs,
    durationMs: offsetMs,
    element: elementRef,
    evidenceClientKey: clientKey.optional(),
    frame,
    kind: z.literal("dwell"),
    pointer,
  }),
  z.object({
    atMs: offsetMs,
    kind: z.literal("scroll"),
    scrollX: finite,
    scrollY: finite,
  }),
  z.object({
    atMs: offsetMs,
    devicePixelRatio: finite,
    kind: z.literal("viewport"),
    viewportHeight: finite,
    viewportWidth: finite,
  }),
  z.object({
    atMs: offsetMs,
    element: elementRef.nullable(),
    evidenceClientKey: clientKey.nullable(),
    frame,
    kind: z.literal("mark"),
    note: nullableText(CAPS.note),
  }),
  z.object({
    atMs: offsetMs,
    element: elementRef,
    evidenceClientKey: clientKey.nullable(),
    frame,
    kind: z.literal("select"),
    note: nullableText(CAPS.note),
  }),
]);

export const sessionIdBody = z.object({ sessionId: id });

export const startBody = z.object({
  clientKey,
  continues: z
    .object({ intentionId: id, revision: z.number().int().min(0) })
    .optional(),
  page: z.object({ title: text(CAPS.pageTitle), url: text(CAPS.url) }),
  startedAt: finite,
  surface: z.enum(["devtools", "app"]),
  title: text(CAPS.sessionTitle).optional(),
});

export const collectionBody = z.object({
  action: z.enum(["pause", "resume", "end"]),
  atMs: offsetMs,
  reason: z.enum(["paused", "hidden", "interrupted", "limit"]).optional(),
  sessionId: id,
});

export const updateBody = z.object({
  sessionId: id,
  title: text(CAPS.sessionTitle).optional(),
  visibility: z.enum(["private", "team"]).optional(),
});

export const eventsBody = z.object({
  clientKey,
  events: z.array(sessionEvent).max(SESSION_LIMITS.maxEventsPerBatch),
  sessionId: id,
});

export const uploadUrlBody = z.object({
  kind: z.enum(["audio", "image"]),
  sessionId: id,
});

const segmentTiming = {
  clientKey,
  endMs: offsetMs,
  sessionId: id,
  startMs: offsetMs,
};

export const segmentBody = z
  .union([
    z.object({ ...segmentTiming, audioStorageId: id }),
    z.object({ ...segmentTiming, text: requiredText(CAPS.segmentText) }),
  ])
  .refine((segment) => segment.endMs >= segment.startMs);

export const correctSegmentBody = z.object({
  expectedRevision: z.number().int().min(0),
  segmentId: id,
  text: text(CAPS.segmentText),
});

export const segmentIdBody = z.object({ segmentId: id });

export const segmentContextBody = z.object({
  choice: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("auto") }),
    z.object({ kind: z.literal("unknown") }),
    z.object({
      atMs: offsetMs,
      eventKind: z.enum(["mark", "select", "click", "dwell", "navigation"]),
      kind: z.literal("event"),
    }),
    z.object({ evidenceId: id, kind: z.literal("evidence") }),
  ]),
  expectedRevision: z.number().int().min(0),
  segmentId: id,
});

export const evidenceBody = z.object({
  atMs: offsetMs,
  capturedAtMs: offsetMs.optional(),
  clientKey,
  element: elementRef.optional(),
  frame: frame.optional(),
  image: z
    .object({ height: finite.min(0), storageId: id, width: finite.min(0) })
    .optional(),
  link: z
    .object({
      access: text(CAPS.linkAccess),
      label: text(CAPS.linkLabel),
      url: z.url().max(CAPS.url),
    })
    .optional(),
  missingReason: text(CAPS.note).optional(),
  note: text(CAPS.note).optional(),
  sessionId: id,
  trigger: z.enum(["start", "mark", "navigation", "select", "manual", "hover"]),
  visibleElements: z
    .array(elementRef)
    .max(SESSION_LIMITS.maxVisibleElements)
    .optional(),
});

export const evidenceIdBody = z.object({ evidenceId: id });

export const createProposalBody = z.object({
  clientKey,
  evidenceIds: z.array(id).max(MAX_IDS).optional(),
  need: requiredText(CAPS.need),
  observed: text(CAPS.observed).optional(),
  segmentIds: z.array(id).max(MAX_IDS).optional(),
  sessionId: id,
});

export const decideProposalBody = z.object({
  decision: z.enum(["pending", "kept", "later", "dismissed"]),
  proposalId: id,
});

export const editProposalBody = z.object({
  expectedRevision: z.number().int().min(0),
  need: requiredText(CAPS.need).optional(),
  observed: text(CAPS.observed).optional(),
  proposalId: id,
  response: nullableText(CAPS.response).optional(),
  setAside: listItems.optional(),
  unknowns: listItems.optional(),
});

export const clarifyProposalBody = z.object({
  expectedRevision: z.number().int().min(0),
  proposalId: id,
  text: requiredText(CAPS.clarification),
});

export const mergeProposalsBody = z.object({
  sourceIds: z.array(id).min(1).max(MAX_IDS),
  targetId: id,
});

export const proposalIdBody = z.object({ proposalId: id });

export const verifyProposalBody = z.object({
  note: text(CAPS.note).optional(),
  proposalId: id,
  sessionId: id.optional(),
  status: z.enum(["works", "needs_work"]),
});

export const briefSelectionBody = z.object({
  evidenceIds: z.array(id).max(MAX_IDS),
  proposalIds: z.array(id).min(1).max(MAX_IDS),
  sessionId: id,
});

export const handoffBody = briefSelectionBody.extend({ clientKey });

export const deliveredBody = z.object({
  handoffId: id,
  kind: z.enum(["copied", "exported"]),
});

const shareWithTeam = z.boolean().optional();

export const acceptChangesBody = z.object({
  changes: z
    .array(z.object({ changeId: id, value: text(CAPS.observed).optional() }))
    .min(1)
    .max(MAX_IDS),
  contributionId: id,
  expectedRevision: z.number().int().min(0),
  shareWithTeam,
});

export const decideChangeBody = z.object({
  changeId: id,
  contributionId: id,
  decision: z.enum(["pending", "rejected"]),
});

export const answerQuestionBody = z.object({
  contributionId: id,
  text: requiredText(CAPS.clarification),
});

export const contributionIdBody = z.object({ contributionId: id });

export const attachBody = z.object({
  intentionId: id,
  proposalId: id,
  shareWithTeam,
});
