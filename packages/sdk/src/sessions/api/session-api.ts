import type { z } from "zod";
import type { SessionApiPath } from "../api-paths";
import type {
  ContinuedIntention,
  SessionContribution,
} from "../intention-protocol";
import type {
  AnalysisStatus,
  ContextChoice,
  ContextOption,
  ElementRef,
  EvidenceLink,
  EvidenceTrigger,
  Frame,
  HandoffFile,
  ProposalDecision,
  SessionDetail,
  SessionEvent,
  SessionEvidence,
  SessionGapReason,
  SessionHandoff,
  SessionIdentity,
  SessionLimitKind,
  SessionProposal,
  SessionSegment,
  SessionSummary,
  SessionSurface,
} from "../protocol";
import {
  createIntentionEndpoints,
  createProposalEndpoints,
} from "./proposal-endpoints";
import { createRecordingEndpoints } from "./recording-endpoints";
import {
  createReviewEndpoints,
  createSegmentEndpoints,
} from "./review-endpoints";
import { createSessionRequests } from "./session-requests";

export interface SessionRequest<T> {
  body?: unknown;
  method: "GET" | "POST";
  path: SessionApiPath;
  query?: Record<string, string>;
  schema: z.ZodType<T>;
}

export interface SessionTransport {
  request: <T>(options: SessionRequest<T>) => Promise<T>;
}

export class SessionApiError extends Error {
  readonly limit: SessionLimitKind | null;
  readonly status: number;

  constructor(
    message: string,
    details: { limit: SessionLimitKind | null; status: number }
  ) {
    super(message);
    this.name = "SessionApiError";
    this.status = details.status;
    this.limit = details.limit;
  }
}

export interface StartSessionBody {
  clientKey: string;
  continues?: ContinuedIntentionRef;
  page: { title: string; url: string };
  startedAt: number;
  surface: SessionSurface;
  title?: string;
}

export interface ContinuedIntentionRef {
  intentionId: string;
  revision: number;
}

export interface IntentionUpdate {
  contribution: SessionContribution;
  intention: ContinuedIntention | null;
}

export interface AcceptChangesBody {
  changes: { changeId: string; value?: string }[];
  contributionId: string;
  expectedRevision: number;
  shareWithTeam?: boolean;
}

export interface CollectionBody {
  action: "pause" | "resume" | "end";
  atMs: number;
  reason?: SessionGapReason;
  sessionId: string;
}

export interface EventsBody {
  clientKey: string;
  events: SessionEvent[];
  sessionId: string;
}

export interface EventsResult {
  accepted: number;
  dropped: number;
  limitReached: boolean;
}

export interface SegmentTiming {
  clientKey: string;
  endMs: number;
  sessionId: string;
  startMs: number;
}

export interface AddEvidenceBody {
  atMs: number;
  capturedAtMs?: number;
  clientKey: string;
  element?: ElementRef;
  frame?: Frame;
  image?: { height: number; storageId: string; width: number };
  link?: EvidenceLink;
  missingReason?: string;
  note?: string;
  sessionId: string;
  trigger: EvidenceTrigger;
}

export interface CreateProposalBody {
  clientKey: string;
  evidenceIds?: string[];
  need: string;
  observed?: string;
  segmentIds?: string[];
  sessionId: string;
}

export interface EditProposalBody {
  expectedRevision: number;
  need?: string;
  observed?: string;
  proposalId: string;
  response?: string | null;
  setAside?: string[];
  unknowns?: string[];
}

export interface CreateHandoffBody {
  clientKey: string;
  evidenceIds: string[];
  proposalIds: string[];
  sessionId: string;
}

export interface SessionApi {
  acceptIntentionChanges: (body: AcceptChangesBody) => Promise<IntentionUpdate>;
  addEvidence: (body: AddEvidenceBody) => Promise<SessionEvidence>;
  addTypedSegment: (
    body: SegmentTiming & { text: string }
  ) => Promise<SessionSegment>;
  addVoiceSegment: (
    body: SegmentTiming & { audioStorageId: string }
  ) => Promise<SessionSegment>;
  analyze: (sessionId: string) => Promise<AnalysisStatus>;
  answerIntentionQuestion: (body: {
    contributionId: string;
    text: string;
  }) => Promise<IntentionUpdate>;
  attachToIntention: (body: {
    intentionId: string;
    proposalId: string;
    shareWithTeam?: boolean;
  }) => Promise<SessionProposal>;
  clarifyProposal: (body: {
    expectedRevision: number;
    proposalId: string;
    text: string;
  }) => Promise<SessionProposal>;
  collection: (body: CollectionBody) => Promise<SessionSummary>;
  contextChoices: (segmentId: string) => Promise<ContextOption[]>;
  correctSegment: (body: {
    expectedRevision: number;
    segmentId: string;
    text: string;
  }) => Promise<SessionSegment>;
  createFeedback: (
    proposalId: string
  ) => Promise<{ created: boolean; feedbackId: string }>;
  createHandoff: (
    body: CreateHandoffBody
  ) => Promise<{ files: HandoffFile[]; handoff: SessionHandoff }>;
  createProposal: (body: CreateProposalBody) => Promise<SessionProposal>;
  decideProposal: (body: {
    decision: ProposalDecision;
    proposalId: string;
  }) => Promise<SessionProposal>;
  deleteProposal: (proposalId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  detachContribution: (contributionId: string) => Promise<IntentionUpdate>;
  detail: (sessionId: string) => Promise<SessionDetail>;
  editProposal: (body: EditProposalBody) => Promise<SessionProposal>;
  events: (body: EventsBody) => Promise<EventsResult>;
  identity: () => Promise<SessionIdentity>;
  keepSeparate: (proposalId: string) => Promise<SessionProposal>;
  list: () => Promise<SessionSummary[]>;
  markHandoffDelivered: (body: {
    handoffId: string;
    kind: "copied" | "exported";
  }) => Promise<SessionHandoff>;
  mergeProposals: (body: {
    sourceIds: string[];
    targetId: string;
  }) => Promise<SessionProposal>;
  removeEvidence: (evidenceId: string) => Promise<SessionEvidence>;
  reopenOrRejectChange: (body: {
    changeId: string;
    contributionId: string;
    decision: "pending" | "rejected";
  }) => Promise<IntentionUpdate>;
  retrySegment: (segmentId: string) => Promise<SessionSegment>;
  separateProposal: (proposalId: string) => Promise<SessionProposal>;
  setSegmentContext: (body: {
    choice: ContextChoice;
    expectedRevision: number;
    segmentId: string;
  }) => Promise<SessionSegment>;
  start: (body: StartSessionBody) => Promise<SessionSummary>;
  update: (body: {
    sessionId: string;
    title?: string;
    visibility?: "private" | "team";
  }) => Promise<SessionSummary>;
  uploadUrl: (body: {
    kind: "audio" | "image";
    sessionId: string;
  }) => Promise<string>;
  verifyProposal: (body: {
    note?: string;
    proposalId: string;
    sessionId?: string;
    status: "works" | "needs_work";
  }) => Promise<SessionProposal>;
}

export function createSessionApi(transport: SessionTransport): SessionApi {
  const requests = createSessionRequests(transport);
  return {
    ...createRecordingEndpoints(requests),
    ...createReviewEndpoints(requests),
    ...createSegmentEndpoints(requests),
    ...createProposalEndpoints(requests),
    ...createIntentionEndpoints(requests),
  };
}
