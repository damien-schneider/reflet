import type { Page, Route } from "@playwright/test";

const PROXY = "**/api/reflet-devtools/proxy/api/v1/sessions/**";
const UPLOAD_PATH = "/__session-upload";
const SPOKEN_TEXT = "I want to know whether my plan was saved.";
const PROPOSAL_NEED = "Show that the plan was saved";
const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const LIMITS = {
  audioRetentionMs: 86_400_000,
  maxDurationMs: 1_800_000,
  maxEvents: 5000,
  maxEventsPerBatch: 200,
  maxEvidence: 60,
  maxImageBytes: 4_000_000,
  maxLocalBufferBytes: 50_000_000,
  maxSegmentBytes: 1_100_000,
  maxSegmentMs: 30_000,
  maxSegments: 400,
  minAutoCaptureIntervalMs: 5000,
  warnBeforeLimitMs: 120_000,
};

type Collection = "recording" | "paused" | "ended";

interface RecordedEvent {
  atMs: number;
  kind: string;
}

interface BoardState {
  collection: Collection;
  collectionCalls: { action: string; atMs: number }[];
  decision: "pending" | "kept" | "later" | "dismissed";
  events: RecordedEvent[];
  evidence: Record<string, unknown>[];
  segments: Record<string, unknown>[];
  starts: number;
}

export interface SessionBoard {
  state: BoardState;
}

function summary(state: BoardState) {
  const isAnalyzed = state.collection === "ended";
  return {
    analysis: {
      analyzedRevision: isAnalyzed ? 1 : null,
      error: null,
      proposalCount: isAnalyzed ? 1 : null,
      state: isAnalyzed ? "succeeded" : "idle",
      transcriptRevision: 1,
      updatedAt: null,
    },
    authorName: "Ada",
    collection: state.collection,
    counts: {
      evidence: state.evidence.length,
      failedSegments: 0,
      handoffs: 0,
      kept: state.decision === "kept" ? 1 : 0,
      pendingSegments: 0,
      proposals: isAnalyzed ? 1 : 0,
      segments: state.segments.length,
    },
    durationMs: 4000,
    endedAt: isAnalyzed ? Date.now() : null,
    id: "session-1",
    isMine: true,
    startedAt: Date.now(),
    surface: "devtools",
    title: "Plans & billing",
    visibility: "private",
  };
}

function proposal(state: BoardState) {
  return {
    certainty: "clear",
    clarifications: [],
    decision: state.decision,
    evidenceIds: [],
    feedbackId: null,
    handedOffRevision: null,
    id: "proposal-1",
    mergedIntoId: null,
    mergeSuggestion: null,
    need: PROPOSAL_NEED,
    needsReview: false,
    observed: "The author saved a plan and could not tell whether it worked.",
    origin: "ai",
    question: null,
    refinement: null,
    response: null,
    revision: 1,
    segmentIds: state.segments.map((segment) => String(segment.id)),
    setAside: ["A history of plans"],
    unknowns: [],
    updatedAt: Date.now(),
    verification: null,
  };
}

function detail(state: BoardState) {
  return {
    evidence: state.evidence,
    handoffs: [],
    marks: [],
    proposals: state.collection === "ended" ? [proposal(state)] : [],
    segments: state.segments,
    session: { ...summary(state), canEdit: true, gaps: [], startUrl: null },
  };
}

function segment(body: Record<string, unknown>, index: number) {
  return {
    audioExpiresAt: null,
    context: [],
    contextAmbiguous: false,
    endMs: Number(body.endMs),
    hasAudio: false,
    id: `segment-${index}`,
    language: "en",
    revision: 1,
    source: "voice",
    startMs: Number(body.startMs),
    text: SPOKEN_TEXT,
    textOrigin: "transcription",
    transcription: { attempts: 1, error: null, state: "done" },
  };
}

function evidence(body: Record<string, unknown>, index: number) {
  return {
    atMs: Number(body.atMs),
    element: null,
    frame: null,
    id: `evidence-${index}`,
    image: { height: 1, url: PIXEL_PNG, width: 1 },
    kind: "screenshot",
    link: null,
    missingReason: null,
    note: null,
    status: "available",
    trigger: String(body.trigger),
  };
}

function removeEvidence(state: BoardState, body: Record<string, unknown>) {
  const index = state.evidence.findIndex(({ id }) => id === body.evidenceId);
  const removed = {
    ...state.evidence[index],
    image: null,
    missingReason: "Removed from the session.",
    status: "missing",
  };
  state.evidence[index] = removed;
  return { evidence: removed };
}

const BRIEF = `# Session brief: Plans & billing\n\n## Outcome wanted\n\n1. ${PROPOSAL_NEED}\n\nSet aside — do not build:\n- A history of plans\n`;

function handoff() {
  return {
    brief: BRIEF,
    createdAt: Date.now(),
    deliveries: [],
    evidenceIds: [],
    id: "handoff-1",
    proposals: [{ id: "proposal-1", need: PROPOSAL_NEED, revision: 1 }],
  };
}

function readBody(route: Route): Record<string, unknown> {
  const body: unknown = route.request().postDataJSON();
  return typeof body === "object" && body !== null ? { ...body } : {};
}

function recordEvents(state: BoardState, body: Record<string, unknown>) {
  const events = Array.isArray(body.events) ? body.events : [];
  for (const event of events) {
    state.events.push({ atMs: Number(event.atMs), kind: String(event.kind) });
  }
  return { accepted: events.length, dropped: 0, limitReached: false };
}

const COLLECTION_AFTER: Record<string, Collection> = {
  end: "ended",
  pause: "paused",
  resume: "recording",
};

function updateCollection(state: BoardState, body: Record<string, unknown>) {
  const action = String(body.action);
  state.collectionCalls.push({ action, atMs: Number(body.atMs) });
  state.collection = COLLECTION_AFTER[action] ?? state.collection;
  return { session: summary(state) };
}

function respond(state: BoardState, path: string, route: Route): unknown {
  const body = readBody(route);
  const responders: Record<string, () => unknown> = {
    analyze: () => ({ analysis: summary(state).analysis }),
    collection: () => updateCollection(state, body),
    detail: () => detail(state),
    events: () => recordEvents(state, body),
    evidence: () => {
      const added = evidence(body, state.evidence.length + 1);
      state.evidence.push(added);
      return { evidence: added };
    },
    "evidence/remove": () => removeEvidence(state, body),
    handoffs: () => ({ files: [], handoff: handoff() }),
    "handoffs/delivered": () => ({ handoff: handoff() }),
    identity: () => ({
      analysisConfigured: true,
      limits: LIMITS,
      organizationId: "org-1",
      organizationName: "Acme",
      transcriptionConfigured: true,
      user: { email: "ada@acme.test", id: "user-1", name: "Ada" },
    }),
    list: () => ({ sessions: state.starts > 0 ? [summary(state)] : [] }),
    "proposals/decide": () => {
      state.decision = body.decision === "kept" ? "kept" : "pending";
      return { proposal: proposal(state) };
    },
    segments: () => {
      const added = segment(body, state.segments.length + 1);
      state.segments.push(added);
      return { segment: added };
    },
    start: () => {
      state.starts += 1;
      return { session: summary(state) };
    },
    "upload-url": () => ({ uploadUrl: UPLOAD_PATH }),
  };
  return responders[path]?.() ?? {};
}

export async function mockSessionBoard(page: Page): Promise<SessionBoard> {
  const state: BoardState = {
    collection: "recording",
    collectionCalls: [],
    decision: "pending",
    events: [],
    evidence: [],
    segments: [],
    starts: 0,
  };
  await page.route("**/api/reflet-devtools/status", (route) =>
    route.fulfill({
      json: {
        board: { kind: "connected", organizationName: "Acme" },
        editor: "vscode",
        marker: "reflet-devtools",
      },
    })
  );
  await page.route(PROXY, (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/v1/sessions/"
    )[1];
    return route.fulfill({ json: respond(state, path, route) });
  });
  await page.route(`**${UPLOAD_PATH}`, (route) =>
    route.fulfill({ json: { storageId: "storage-1" } })
  );
  return { state };
}

export async function fakeMicrophone(
  page: Page,
  outcome: "granted" | "denied"
): Promise<void> {
  await page.addInitScript((isDenied) => {
    const calls = { count: 0 };
    Reflect.set(window, "__microphoneCalls", calls);
    const copied = { text: "" };
    Reflect.set(window, "__clipboard", copied);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        write: async (items: ClipboardItem[]) => {
          const blob = await items[0].getType("text/plain");
          copied.text = await blob.text();
        },
      },
    });
    const fakeGetUserMedia = () => {
      calls.count += 1;
      if (isDenied) {
        return Promise.reject(
          new DOMException("Permission denied", "NotAllowedError")
        );
      }
      const context = new AudioContext();
      const tone = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.4;
      const destination = context.createMediaStreamDestination();
      tone.connect(gain).connect(destination);
      tone.start();
      return Promise.resolve(destination.stream);
    };
    Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
      configurable: true,
      value: fakeGetUserMedia,
    });
  }, outcome === "denied");
}

export function microphoneCalls(page: Page): Promise<number> {
  return page.evaluate(() => {
    const calls: unknown = Reflect.get(window, "__microphoneCalls");
    return typeof calls === "object" && calls !== null && "count" in calls
      ? Number(calls.count)
      : 0;
  });
}

export function copiedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const copied: unknown = Reflect.get(window, "__clipboard");
    return typeof copied === "object" && copied !== null && "text" in copied
      ? String(copied.text)
      : "";
  });
}
