import type { z } from "zod";
import type {
  AnalysisStatus,
  ElementRef,
  EvidenceLink,
  EvidenceTrigger,
  Frame,
  HandoffFile,
  ProposalDecision,
  SessionApiPath,
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
import { createProposalEndpoints } from "./proposal-endpoints";
import { createRecordingEndpoints } from "./recording-endpoints";
import { createReviewEndpoints } from "./review-endpoints";
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
  page: { title: string; url: string };
  startedAt: number;
  surface: SessionSurface;
  title?: string;
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
  addEvidence: (body: AddEvidenceBody) => Promise<SessionEvidence>;
  addTypedSegment: (
    body: SegmentTiming & { text: string }
  ) => Promise<SessionSegment>;
  addVoiceSegment: (
    body: SegmentTiming & { audioStorageId: string }
  ) => Promise<SessionSegment>;
  analyze: (sessionId: string) => Promise<AnalysisStatus>;
  clarifyProposal: (body: {
    expectedRevision: number;
    proposalId: string;
    text: string;
  }) => Promise<SessionProposal>;
  collection: (body: CollectionBody) => Promise<SessionSummary>;
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
  deleteSession: (sessionId: string) => Promise<void>;
  detail: (sessionId: string) => Promise<SessionDetail>;
  editProposal: (body: EditProposalBody) => Promise<SessionProposal>;
  events: (body: EventsBody) => Promise<EventsResult>;
  identity: () => Promise<SessionIdentity>;
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
  retrySegment: (segmentId: string) => Promise<SessionSegment>;
  separateProposal: (proposalId: string) => Promise<SessionProposal>;
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
    status: "works" | "needs_work";
  }) => Promise<SessionProposal>;
}

export function createSessionApi(transport: SessionTransport): SessionApi {
  const requests = createSessionRequests(transport);
  return {
    ...createRecordingEndpoints(requests),
    ...createReviewEndpoints(requests),
    ...createProposalEndpoints(requests),
  };
}
