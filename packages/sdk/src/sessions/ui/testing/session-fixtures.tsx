import { type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { Notices } from "../../../devtools/client/notices";
import type { SessionApi } from "../../api/session-api";
import type {
  SessionDetail,
  SessionEvidence,
  SessionIdentity,
  SessionProposal,
  SessionSegment,
  SessionSummary,
} from "../../protocol";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../recorder/session-recorder";
import {
  type SessionWorkspace,
  SessionWorkspaceProvider,
} from "../session-workspace";

export const IDENTITY: SessionIdentity = {
  analysisConfigured: true,
  limits: {
    audioRetentionMs: 86_400_000,
    maxDurationMs: 1_800_000,
    maxEvents: 5000,
    maxEventsPerBatch: 200,
    maxEvidence: 60,
    maxImageBytes: 2_500_000,
    maxLocalBufferBytes: 60_000_000,
    maxSegmentBytes: 1_100_000,
    maxSegmentMs: 30_000,
    maxSegments: 400,
    minAutoCaptureIntervalMs: 10_000,
    warnBeforeLimitMs: 300_000,
  },
  organizationId: "org_1",
  organizationName: "Acme",
  transcriptionConfigured: true,
  user: { email: "ada@acme.test", id: "user_1", name: "Ada" },
};

export function fakeApi(overrides: Partial<SessionApi> = {}): SessionApi {
  return {
    addEvidence: vi.fn(),
    addTypedSegment: vi.fn(),
    addVoiceSegment: vi.fn(),
    analyze: vi.fn(),
    clarifyProposal: vi.fn(),
    collection: vi.fn(),
    correctSegment: vi.fn(),
    createFeedback: vi.fn(),
    createHandoff: vi.fn(),
    createProposal: vi.fn(),
    decideProposal: vi.fn(),
    deleteSession: vi.fn(),
    detail: vi.fn(),
    editProposal: vi.fn(),
    events: vi.fn(),
    identity: vi.fn().mockResolvedValue(IDENTITY),
    list: vi.fn().mockResolvedValue([]),
    markHandoffDelivered: vi.fn(),
    mergeProposals: vi.fn(),
    retrySegment: vi.fn(),
    separateProposal: vi.fn(),
    start: vi.fn(),
    update: vi.fn(),
    uploadUrl: vi.fn(),
    verifyProposal: vi.fn(),
    ...overrides,
  };
}

export const IDLE_SNAPSHOT: RecorderSnapshot = {
  activeMs: 0,
  failure: null,
  lastMark: null,
  limitsReached: [],
  markCount: 0,
  nearLimit: false,
  pauseReason: null,
  phase: "idle",
  sessionId: null,
  sessionKey: null,
  startedAt: null,
};

export const RECORDING_SNAPSHOT: RecorderSnapshot = {
  ...IDLE_SNAPSHOT,
  activeMs: 134_000,
  phase: "recording",
  sessionId: "session_1",
  sessionKey: "key_1",
  startedAt: 1_700_000_000_000,
};

export type FakeRecorder = SessionRecorder & {
  emit: (patch: Partial<RecorderSnapshot>) => void;
};

export function fakeRecorder(initial: RecorderSnapshot = IDLE_SNAPSHOT) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const recorder: FakeRecorder = {
    annotateMark: vi.fn(),
    dispose: vi.fn(),
    emit: (patch) => {
      snapshot = { ...snapshot, ...patch };
      for (const listener of listeners) {
        listener();
      }
    },
    finish: vi.fn().mockResolvedValue({ sessionKey: "key_1" }),
    getSnapshot: () => snapshot,
    mark: vi.fn().mockReturnValue("mark_1"),
    pause: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
    resumeDraft: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeLevel: () => () => undefined,
  };
  return recorder;
}

export function fakeWorkspace(
  parts: { api?: SessionApi; recorder?: SessionRecorder } = {}
): SessionWorkspace {
  return {
    account: {
      key: "org_1:user_1",
      organizationName: "Acme",
      userEmail: "ada@acme.test",
      userName: "Ada",
    },
    api: parts.api ?? fakeApi(),
    identity: IDENTITY,
    onUnauthorized: vi.fn(),
    recorder: parts.recorder ?? fakeRecorder(),
    surface: "devtools",
  };
}

export function renderInWorkspace(
  ui: ReactNode,
  workspace: SessionWorkspace
): RenderResult {
  return render(
    <div className="dt">
      <SessionWorkspaceProvider workspace={workspace}>
        {ui}
      </SessionWorkspaceProvider>
      <Notices />
    </div>
  );
}

export function aSummary(
  overrides: Partial<SessionSummary> = {}
): SessionSummary {
  return {
    analysis: {
      analyzedRevision: 1,
      error: null,
      proposalCount: 1,
      state: "succeeded",
      transcriptRevision: 1,
      updatedAt: 1_700_000_100_000,
    },
    authorName: "Ada",
    collection: "ended",
    counts: {
      evidence: 0,
      failedSegments: 0,
      handoffs: 0,
      kept: 0,
      pendingSegments: 0,
      proposals: 1,
      segments: 1,
    },
    durationMs: 134_000,
    endedAt: 1_700_000_134_000,
    id: "session_1",
    isMine: true,
    startedAt: 1_700_000_000_000,
    surface: "devtools",
    title: "Checkout walkthrough",
    visibility: "private",
    ...overrides,
  };
}

export function aProposal(
  overrides: Partial<SessionProposal> = {}
): SessionProposal {
  return {
    certainty: "clear",
    clarifications: [],
    decision: "pending",
    evidenceIds: [],
    feedbackId: null,
    handedOffRevision: null,
    id: "proposal_1",
    mergedIntoId: null,
    mergeSuggestion: null,
    need: "Make the Save button visible on small screens",
    needsReview: false,
    observed: "The Save button is hidden below the fold.",
    origin: "ai",
    question: null,
    refinement: null,
    response: null,
    revision: 3,
    segmentIds: ["segment_1"],
    setAside: [],
    unknowns: [],
    updatedAt: 1_700_000_100_000,
    verification: null,
    ...overrides,
  };
}

export function aSegment(
  overrides: Partial<SessionSegment> = {}
): SessionSegment {
  return {
    audioExpiresAt: null,
    context: [],
    contextAmbiguous: false,
    endMs: 9000,
    hasAudio: false,
    id: "segment_1",
    language: "en",
    revision: 2,
    source: "voice",
    startMs: 2000,
    text: "I can never find the save button here.",
    textOrigin: "transcription",
    transcription: { attempts: 1, error: null, state: "done" },
    ...overrides,
  };
}

export function anEvidence(
  overrides: Partial<SessionEvidence> = {}
): SessionEvidence {
  return {
    atMs: 134_000,
    element: null,
    frame: null,
    id: "evidence_1",
    image: { height: 600, url: "https://files.test/e1.png", width: 800 },
    kind: "screenshot",
    link: null,
    missingReason: null,
    note: null,
    status: "available",
    trigger: "mark",
    ...overrides,
  };
}

export function aDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    evidence: [],
    handoffs: [],
    marks: [],
    proposals: [aProposal()],
    segments: [aSegment()],
    session: { ...aSummary(), canEdit: true, gaps: [], startUrl: null },
    ...overrides,
  };
}
