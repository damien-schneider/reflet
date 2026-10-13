import type {
  ContinuedIntention,
  IntentionChange,
  IntentionHistoryEntry,
  SessionContinuation,
  SessionContribution,
} from "../../intention-protocol";
import type { SegmentContext } from "../../protocol";

export function aContextItem(
  overrides: Partial<SegmentContext> = {}
): SegmentContext {
  return {
    atMs: 3000,
    durationMs: null,
    element: {
      component: null,
      label: "Save",
      rect: { height: 40, width: 200, x: 100, y: 300 },
      role: "button",
      selector: "#save",
      source: null,
    },
    evidenceId: null,
    evidenceMatch: null,
    evidenceOffsetMs: null,
    frame: {
      devicePixelRatio: 2,
      scrollX: 0,
      scrollY: 0,
      title: "Checkout",
      url: "https://app.test/checkout?step=2",
      viewportHeight: 800,
      viewportWidth: 1000,
    },
    kind: "click",
    label: "Save",
    pointer: { x: 150, y: 320 },
    url: "https://app.test/checkout?step=2",
    ...overrides,
  };
}

export function anIntentionChange(
  overrides: Partial<IntentionChange> = {}
): IntentionChange {
  return {
    decision: "pending",
    evidenceIds: [],
    field: "need",
    hypothesis: false,
    id: "change_1",
    kind: "precision",
    operation: "replace",
    reason: "You said it only happens on phones.",
    segmentIds: ["segment_1"],
    value: "Keep the Save button visible on phones",
    ...overrides,
  };
}

export function aContribution(
  overrides: Partial<SessionContribution> = {}
): SessionContribution {
  return {
    answers: [],
    applied: [],
    baseRevision: 3,
    changes: [anIntentionChange()],
    detachedAt: null,
    id: "contribution_1",
    intentionId: "intention_1",
    needsShareConsent: false,
    origin: "continuation",
    question: null,
    sharedAt: null,
    stale: false,
    state: "ready",
    verdict: null,
    ...overrides,
  };
}

export function aContinuedIntention(
  overrides: Partial<ContinuedIntention> = {}
): ContinuedIntention {
  return {
    id: "intention_1",
    need: "Make the Save button visible on small screens",
    observed: "The Save button is hidden below the fold.",
    question: null,
    response: "Pin the action bar to the bottom",
    revision: 3,
    sessionId: "session_home",
    sessionTitle: "Checkout walkthrough",
    setAside: [],
    unknowns: ["Does it happen on tablets?"],
    verification: null,
    ...overrides,
  };
}

export function aContinuation(
  overrides: Partial<SessionContinuation> = {}
): SessionContinuation {
  return {
    contribution: aContribution(),
    intention: aContinuedIntention(),
    ...overrides,
  };
}

export function aHistoryEntry(
  overrides: Partial<IntentionHistoryEntry> = {}
): IntentionHistoryEntry {
  return {
    applied: [
      {
        at: 1_700_000_500_000,
        byName: "Grace",
        fields: [
          {
            after: "Keep the Save button visible on phones",
            before: "Make the Save button visible on small screens",
            field: "need",
          },
        ],
        revision: 4,
      },
    ],
    detachedAt: null,
    evidenceIds: [],
    extractsHidden: false,
    id: "contribution_1",
    intentionId: "proposal_1",
    origin: "continuation",
    quotes: [
      {
        context: ["Clicked Save · /checkout"],
        segmentId: "segment_9",
        startMs: 4000,
        text: "Only on my phone it hides.",
      },
    ],
    session: {
      canOpen: true,
      id: "session_2",
      startedAt: 1_700_000_400_000,
      title: "Phone check",
    },
    ...overrides,
  };
}
