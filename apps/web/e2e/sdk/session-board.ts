import type { Page, Route } from "@playwright/test";
import {
  addContribution,
  addIntention,
  citeSessionSources,
  intentionResponders,
} from "./intention-board";
import {
  type BoardRequest,
  type BoardSession,
  type BoardState,
  type Collection,
  continuedIntentionView,
  contributionView,
  evidenceView,
  findSession,
  historyEntry,
  proposalView,
  screenshotContext,
  segmentView,
  summary,
} from "./session-views";

const PROXY = "**/api/reflet-devtools/proxy/api/v1/sessions/**";
const UPLOAD_PATH = "/__session-upload";
export const SPOKEN_TEXT = "Ici, je ne sais pas si c'est enregistré.";
export const CONTINUATION_TEXT =
  "After a reload the plan is still there. A toast would help.";

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

export interface SessionBoard {
  state: BoardState;
}

function segmentsWithContext(session: BoardSession) {
  const [firstEvidence] = session.evidence;
  return session.segments.map((segment) =>
    segment.contextOrigin === "auto" && firstEvidence
      ? { ...segment, context: [screenshotContext(firstEvidence)] }
      : segment
  );
}

function continuationOf(state: BoardState, session: BoardSession) {
  const contribution = state.contributions.find(
    ({ sessionId }) => sessionId === session.id
  );
  const intention = state.intentions.find(
    ({ id }) => id === contribution?.intentionId
  );
  if (!(contribution && intention)) {
    return null;
  }
  const home = findSession(state, intention.sessionId);
  return {
    contribution: contributionView(contribution),
    intention: continuedIntentionView(intention, home.title),
  };
}

function intentionHistory(state: BoardState, session: BoardSession) {
  const own = state.intentions.filter(
    ({ sessionId }) => sessionId === session.id
  );
  return state.contributions
    .filter(({ intentionId }) => own.some(({ id }) => id === intentionId))
    .map((contribution) =>
      historyEntry(contribution, findSession(state, contribution.sessionId))
    );
}

function detail(state: BoardState, session: BoardSession) {
  citeSessionSources(state);
  const history = intentionHistory(state, session);
  const contributedIds = new Set(history.flatMap((entry) => entry.evidenceIds));
  const isEnded = session.collection === "ended";
  return {
    continuation: continuationOf(state, session),
    contributedEvidence: state.sessions
      .flatMap(({ evidence }) => evidence)
      .filter(({ id }) => contributedIds.has(String(id))),
    evidence: session.evidence,
    handoffs: state.handoffs.filter(
      ({ sessionId }) => sessionId === session.id
    ),
    history,
    marks: [],
    proposals: isEnded
      ? state.intentions
          .filter(({ sessionId }) => sessionId === session.id)
          .map(proposalView)
      : [],
    segments: segmentsWithContext(session),
    session: {
      ...summary(session, state.intentions),
      canEdit: true,
      gaps: [],
      startUrl: null,
    },
  };
}

function startSession(state: BoardState, body: Record<string, unknown>) {
  state.starts += 1;
  const { continues } = body;
  const isContinuation =
    typeof continues === "object" &&
    continues !== null &&
    "intentionId" in continues &&
    "revision" in continues;
  const session: BoardSession = {
    collection: "recording",
    continues: isContinuation
      ? {
          intentionId: String(continues.intentionId),
          revision: Number(continues.revision),
        }
      : null,
    evidence: [],
    id: `session-${state.starts}`,
    segments: [],
    title:
      isContinuation && typeof body.title === "string"
        ? body.title
        : "Plans & billing",
  };
  state.sessions.push(session);
  return { session: summary(session, state.intentions) };
}

const COLLECTION_AFTER: Record<string, Collection> = {
  end: "ended",
  pause: "paused",
  resume: "recording",
};

function updateCollection(state: BoardState, body: Record<string, unknown>) {
  const session = findSession(state, body.sessionId);
  const action = String(body.action);
  state.collectionCalls.push({ action, atMs: Number(body.atMs) });
  if (action === "end" && session.collection !== "ended") {
    if (session.continues) {
      addContribution(state, session);
    } else {
      addIntention(state, session);
    }
  }
  session.collection = COLLECTION_AFTER[action] ?? session.collection;
  return { session: summary(session, state.intentions) };
}

function recordEvents(state: BoardState, body: Record<string, unknown>) {
  const events = Array.isArray(body.events) ? body.events : [];
  for (const event of events) {
    state.events.push({ atMs: Number(event.atMs), kind: String(event.kind) });
  }
  return { accepted: events.length, dropped: 0, limitReached: false };
}

function addSegment(state: BoardState, body: Record<string, unknown>) {
  const session = findSession(state, body.sessionId);
  const total = state.sessions.flatMap(({ segments }) => segments).length;
  const added = segmentView(body, {
    id: `segment-${total + 1}`,
    text: session.continues ? CONTINUATION_TEXT : SPOKEN_TEXT,
  });
  session.segments.push(added);
  return { segment: added };
}

function addEvidence(state: BoardState, body: Record<string, unknown>) {
  const session = findSession(state, body.sessionId);
  const total = state.sessions.flatMap(({ evidence }) => evidence).length;
  const added = evidenceView(body, `evidence-${total + 1}`);
  session.evidence.push(added);
  return { evidence: added };
}

function removeEvidence(state: BoardState, body: Record<string, unknown>) {
  for (const session of state.sessions) {
    const index = session.evidence.findIndex(
      ({ id }) => id === body.evidenceId
    );
    if (index >= 0) {
      const removed = {
        ...session.evidence[index],
        image: null,
        missingReason: "Removed from the session.",
        status: "missing",
      };
      session.evidence[index] = removed;
      return { evidence: removed };
    }
  }
  throw new Error(`No evidence ${String(body.evidenceId)}`);
}

function correctedContext(session: BoardSession, choice: unknown) {
  const evidenceId =
    typeof choice === "object" && choice !== null && "evidenceId" in choice
      ? choice.evidenceId
      : null;
  const chosen = session.evidence.find(({ id }) => id === evidenceId);
  return chosen
    ? { context: [screenshotContext(chosen)], contextOrigin: "human" }
    : { context: [], contextOrigin: "unknown" };
}

function setSegmentContext(state: BoardState, body: Record<string, unknown>) {
  const session = state.sessions.find(({ segments }) =>
    segments.some(({ id }) => id === body.segmentId)
  );
  const index =
    session?.segments.findIndex(({ id }) => id === body.segmentId) ?? -1;
  if (!session || index < 0) {
    throw new Error(`No segment ${String(body.segmentId)}`);
  }
  const corrected = {
    ...session.segments[index],
    ...correctedContext(session, body.choice),
    contextCorrectedAt: Date.now(),
    revision: Number(session.segments[index].revision) + 1,
  };
  session.segments[index] = corrected;
  return { segment: corrected };
}

function captureResponders(
  state: BoardState
): Record<string, (request: BoardRequest) => unknown> {
  return {
    analyze: ({ body }) => ({
      analysis: summary(findSession(state, body.sessionId), state.intentions)
        .analysis,
    }),
    collection: ({ body }) => updateCollection(state, body),
    detail: ({ query }) =>
      detail(state, findSession(state, query.get("sessionId"))),
    events: ({ body }) => recordEvents(state, body),
    evidence: ({ body }) => addEvidence(state, body),
    "evidence/remove": ({ body }) => removeEvidence(state, body),
    identity: () => ({
      analysisConfigured: true,
      limits: LIMITS,
      organizationId: "org-1",
      organizationName: "Acme",
      transcriptionConfigured: true,
      user: { email: "ada@acme.test", id: "user-1", name: "Ada" },
    }),
    list: () => ({
      sessions: state.sessions
        .map((session) => summary(session, state.intentions))
        .reverse(),
    }),
    segments: ({ body }) => addSegment(state, body),
    "segments/context": ({ body }) => setSegmentContext(state, body),
    start: ({ body }) => startSession(state, body),
    "upload-url": () => ({ uploadUrl: UPLOAD_PATH }),
  };
}

function readRequest(route: Route): BoardRequest {
  const request = route.request();
  const body: unknown = request.postDataJSON();
  return {
    body: typeof body === "object" && body !== null ? { ...body } : {},
    query: new URL(request.url()).searchParams,
  };
}

export async function mockSessionBoard(page: Page): Promise<SessionBoard> {
  const state: BoardState = {
    collectionCalls: [],
    contributions: [],
    events: [],
    handoffs: [],
    intentions: [],
    sessions: [],
    starts: 0,
  };
  const responders = {
    ...captureResponders(state),
    ...intentionResponders(state),
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
    const path =
      new URL(route.request().url()).pathname.split("/api/v1/sessions/")[1] ??
      "";
    return route.fulfill({
      json: responders[path]?.(readRequest(route)) ?? {},
    });
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
