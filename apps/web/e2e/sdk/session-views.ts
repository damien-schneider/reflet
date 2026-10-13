export const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export type Collection = "recording" | "paused" | "ended";
export type Decision = "pending" | "kept" | "later" | "dismissed";
type FieldValue = string | string[];

export interface BoardSession {
  collection: Collection;
  continues: { intentionId: string; revision: number } | null;
  evidence: Record<string, unknown>[];
  id: string;
  segments: Record<string, unknown>[];
  title: string;
}

export interface BoardIntention {
  decision: Decision;
  id: string;
  lastHandoff: { at: number; response: string | null; revision: number } | null;
  need: string;
  observed: string;
  response: string | null;
  revision: number;
  segmentIds: string[];
  sessionId: string;
  setAside: string[];
  unknowns: string[];
}

export interface BoardChange {
  decision: "pending" | "accepted" | "rejected";
  evidenceIds: string[];
  field: "response" | "unknowns";
  hypothesis: boolean;
  id: string;
  kind: "precision" | "solution";
  operation: "add" | "replace";
  reason: string;
  segmentIds: string[];
  value: string;
}

export interface BoardApplied {
  at: number;
  byName: string;
  fields: { after: FieldValue; before: FieldValue; field: string }[];
  revision: number;
}

export interface BoardHandoff {
  brief: string;
  createdAt: number;
  deliveries: { at: number; kind: "copied" | "exported" }[];
  evidenceIds: string[];
  id: string;
  proposals: { id: string; need: string; revision: number }[];
  sessionId: string;
}

export interface BoardContribution {
  applied: BoardApplied[];
  baseRevision: number;
  changes: BoardChange[];
  id: string;
  intentionId: string;
  sessionId: string;
}

export interface BoardState {
  collectionCalls: { action: string; atMs: number }[];
  contributions: BoardContribution[];
  events: { atMs: number; kind: string }[];
  handoffs: BoardHandoff[];
  intentions: BoardIntention[];
  sessions: BoardSession[];
  starts: number;
}

export interface BoardRequest {
  body: Record<string, unknown>;
  query: URLSearchParams;
}

export function findSession(state: BoardState, sessionId: unknown) {
  const session =
    state.sessions.find(({ id }) => id === sessionId) ?? state.sessions.at(-1);
  if (!session) {
    throw new Error(`No session ${String(sessionId)}`);
  }
  return session;
}

export function summary(session: BoardSession, intentions: BoardIntention[]) {
  const isAnalyzed = session.collection === "ended";
  const own = intentions.filter(({ sessionId }) => sessionId === session.id);
  return {
    analysis: {
      analyzedRevision: isAnalyzed ? 1 : null,
      error: null,
      proposalCount: isAnalyzed ? own.length : null,
      state: isAnalyzed ? "succeeded" : "idle",
      transcriptRevision: 1,
      updatedAt: null,
    },
    authorName: "Ada",
    collection: session.collection,
    counts: {
      evidence: session.evidence.length,
      failedSegments: 0,
      handoffs: 0,
      kept: own.filter(({ decision }) => decision === "kept").length,
      pendingSegments: 0,
      proposals: own.length,
      segments: session.segments.length,
    },
    durationMs: 4000,
    endedAt: isAnalyzed ? Date.now() : null,
    id: session.id,
    isMine: true,
    startedAt: Date.now(),
    surface: "devtools",
    title: session.title,
    visibility: "private",
  };
}

export function proposalView(intention: BoardIntention) {
  return {
    attachment: null,
    certainty: "clear",
    clarifications: [],
    decision: intention.decision,
    evidenceIds: [],
    feedbackId: null,
    formulation: "ai",
    handedOffRevision: intention.lastHandoff?.revision ?? null,
    id: intention.id,
    intentionSuggestion: null,
    lastHandoff: intention.lastHandoff
      ? { ...intention.lastHandoff, need: intention.need, unknowns: [] }
      : null,
    mergedIntoId: null,
    mergeSuggestion: null,
    need: intention.need,
    needsReview: false,
    observed: intention.observed,
    origin: "ai",
    question: null,
    refinement: null,
    response: intention.response,
    revision: intention.revision,
    segmentIds: intention.segmentIds,
    setAside: intention.setAside,
    unknowns: intention.unknowns,
    updatedAt: Date.now(),
    verification: null,
  };
}

export function continuedIntentionView(
  intention: BoardIntention,
  title: string
) {
  return {
    id: intention.id,
    need: intention.need,
    observed: intention.observed,
    question: null,
    response: intention.response,
    revision: intention.revision,
    sessionId: intention.sessionId,
    sessionTitle: title,
    setAside: intention.setAside,
    unknowns: intention.unknowns,
    verification: null,
  };
}

export function contributionView(contribution: BoardContribution) {
  return {
    answers: [],
    applied: contribution.applied,
    baseRevision: contribution.baseRevision,
    changes: contribution.changes,
    detachedAt: null,
    id: contribution.id,
    intentionId: contribution.intentionId,
    needsShareConsent: false,
    origin: "continuation",
    question: null,
    sharedAt: null,
    stale: false,
    state: "ready",
    verdict: null,
  };
}

export function historyEntry(
  contribution: BoardContribution,
  session: BoardSession
) {
  return {
    applied: contribution.applied,
    detachedAt: null,
    evidenceIds: contribution.changes.flatMap(({ decision, evidenceIds }) =>
      decision === "accepted" ? evidenceIds : []
    ),
    extractsHidden: false,
    id: contribution.id,
    intentionId: contribution.intentionId,
    origin: "continuation",
    quotes: session.segments.map((segment) => ({
      context: [],
      segmentId: String(segment.id),
      startMs: Number(segment.startMs),
      text: String(segment.text),
    })),
    session: {
      canOpen: true,
      id: session.id,
      startedAt: Date.now(),
      title: session.title,
    },
  };
}

export function screenshotContext(evidence: Record<string, unknown>) {
  return {
    atMs: Number(evidence.atMs),
    durationMs: null,
    element: null,
    evidenceId: String(evidence.id),
    evidenceMatch: "exact",
    evidenceOffsetMs: 0,
    frame: null,
    kind: "screenshot",
    label: `${String(evidence.trigger)} screenshot`,
    pointer: null,
    url: null,
  };
}

export function segmentView(
  body: Record<string, unknown>,
  options: { id: string; text: string }
) {
  return {
    audioExpiresAt: null,
    context: [],
    contextAmbiguous: false,
    contextCorrectedAt: null,
    contextOrigin: "auto",
    endMs: Number(body.endMs),
    hasAudio: false,
    id: options.id,
    language: "en",
    revision: 1,
    source: "voice",
    startMs: Number(body.startMs),
    text: options.text,
    textOrigin: "transcription",
    transcription: { attempts: 1, error: null, state: "done" },
  };
}

export function evidenceView(body: Record<string, unknown>, id: string) {
  return {
    atMs: Number(body.atMs),
    capturedAtMs: Number(body.atMs),
    element: null,
    frame: null,
    id,
    image: { height: 1, url: PIXEL_PNG, width: 1 },
    kind: "screenshot",
    link: null,
    missingReason: null,
    note: null,
    status: "available",
    trigger: String(body.trigger),
  };
}
