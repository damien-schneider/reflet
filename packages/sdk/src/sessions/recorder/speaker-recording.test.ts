import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { SessionApiError } from "../api/session-api";
import { createIndexedSessionStore } from "../local/indexed-session-store";
import { type SessionLimits, speakerTurnSchema } from "../protocol";
import { type FakeAudio, installFakeAudio } from "../testing/fake-audio";
import {
  createFakeSessionServer,
  type FakeSessionServer,
} from "../testing/fake-session-server";
import {
  type FakeWebSocket,
  installFakeWebSocket,
} from "../testing/fake-websocket";
import { createSessionRecorder } from "./session-recorder";

vi.mock("../local/indexed-session-store", async () => {
  // vi.mock factories run before static imports are bound.
  const { createMemorySessionStore } = await import(
    "../testing/memory-session-store"
  );
  const store = createMemorySessionStore();
  return { createIndexedSessionStore: () => store };
});

vi.mock("../../feedback/core/capture", () => ({
  captureViewport: vi.fn(() => Promise.resolve(null)),
  releaseCapture: vi.fn(),
  WIDGET_MARKER: "data-reflet-widget",
}));

const LIMITS: SessionLimits = {
  audioRetentionMs: 86_400_000,
  maxDurationMs: 3_600_000,
  maxEvents: 5000,
  maxEventsPerBatch: 200,
  maxEvidence: 50,
  maxImageBytes: 5_000_000,
  maxLocalBufferBytes: 50_000_000,
  maxSegmentBytes: 2_000_000,
  maxSegmentMs: 60_000,
  maxSegments: 500,
  minAutoCaptureIntervalMs: 10_000,
  warnBeforeLimitMs: 300_000,
};

const SPEAKERS_PATH = "/api/v1/sessions/speakers";
const sentTurnsBody = z.object({ turns: z.array(speakerTurnSchema) });
const store = createIndexedSessionStore();

function speech(ms: number): Float32Array {
  return Float32Array.from(
    { length: ms * 48 },
    (_, index) => 0.3 * Math.sin((2 * Math.PI * 220 * index) / 48_000)
  );
}

function silence(ms: number): Float32Array {
  return new Float32Array(ms * 48);
}

function setup(reloadOf?: { accountKey: string; server: FakeSessionServer }) {
  const accountKey = reloadOf?.accountKey ?? `org:${crypto.randomUUID()}`;
  const server = reloadOf?.server ?? createFakeSessionServer();
  const recorder = createSessionRecorder({
    account: {
      key: accountKey,
      organizationName: "Acme",
      userEmail: null,
      userName: "Ada",
    },
    api: server.api,
    limits: LIMITS,
    surface: "devtools",
  });
  return { accountKey, recorder, server };
}

function sentSpeakers(server: FakeSessionServer): string[] {
  return server
    .callsTo(SPEAKERS_PATH)
    .flatMap((body) => sentTurnsBody.parse(body).turns)
    .map((turn) => turn.speaker);
}

function callOrder(server: FakeSessionServer): string[] {
  return server.calls.map((call) => call.path);
}

let audio: FakeAudio;
let sockets: FakeWebSocket[];

function latestSocket(): FakeWebSocket {
  const socket = sockets.at(-1);
  if (!socket) {
    throw new Error("No speaker stream was opened.");
  }
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
      "performance",
    ],
  });
  audio = installFakeAudio();
  sockets = installFakeWebSocket();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a session where several people talk", () => {
  it("uploads who spoke before the voice piece they spoke in", async () => {
    const { recorder, server } = setup();
    await recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(server.callsTo("/api/v1/sessions/start")).toEqual([
      expect.objectContaining({ detectSpeakers: true }),
    ]);
    expect(recorder.getSnapshot().speakers).toBe("detecting");
    latestSocket().accept();

    audio.emitFrame(speech(1500));
    await vi.advanceTimersByTimeAsync(1300);
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    audio.emitFrame(silence(1000));
    await vi.advanceTimersByTimeAsync(0);

    const order = callOrder(server);
    expect(order.indexOf(SPEAKERS_PATH)).toBeGreaterThan(-1);
    expect(order.indexOf(SPEAKERS_PATH)).toBeLessThan(
      order.indexOf("/api/v1/sessions/segments")
    );
    expect(sentSpeakers(server)).toEqual(["S1"]);
    recorder.dispose();
  });

  it("waits for the last speakers before ending the session", async () => {
    const { recorder, server } = setup();
    await recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    latestSocket().accept();
    audio.emitFrame(speech(1000));
    await vi.advanceTimersByTimeAsync(1000);
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });

    const finishing = recorder.finish();
    await vi.advanceTimersByTimeAsync(100);
    expect(latestSocket().sentOfType("input_audio.end")).toHaveLength(1);
    latestSocket().receive({
      speaker_id: "speaker_2",
      type: "transcription.segment",
    });
    latestSocket().receive({ type: "transcription.done" });
    await finishing;
    await vi.advanceTimersByTimeAsync(0);

    const order = callOrder(server);
    expect(sentSpeakers(server)).toEqual(["S1", "S2"]);
    expect(order.lastIndexOf(SPEAKERS_PATH)).toBeLessThan(
      order.indexOf("/api/v1/sessions/collection")
    );
    expect(server.callsTo("/api/v1/sessions/collection")).toEqual([
      expect.objectContaining({ action: "end" }),
    ]);
  });

  it("gives a new voice a new label after the page reloads", async () => {
    const first = setup();
    await first.recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    latestSocket().accept();
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    const { sessionKey } = first.recorder.getSnapshot();
    first.recorder.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.server.callsTo(SPEAKERS_PATH)).toHaveLength(1);

    const reloaded = setup(first);
    await reloaded.recorder.resumeDraft(sessionKey ?? "");
    await vi.advanceTimersByTimeAsync(0);
    expect(reloaded.recorder.getSnapshot().speakers).toBe("detecting");
    latestSocket().accept();
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    reloaded.recorder.pause();
    await vi.advanceTimersByTimeAsync(3100);
    expect(sentSpeakers(first.server)).toEqual(["S1", "S2"]);
    expect(await store.readDrafts(first.accountKey)).toEqual([
      expect.objectContaining({ detectSpeakers: true, speakerLabelCount: 2 }),
    ]);
    reloaded.recorder.dispose();
  });

  it("keeps a voice's label after the page reloads once it was heard long enough", async () => {
    const first = setup();
    await first.recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    latestSocket().accept();
    audio.emitFrame(speech(5000));
    await vi.advanceTimersByTimeAsync(1300);
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    await vi.advanceTimersByTimeAsync(3000);
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    audio.emitFrame(silence(1000));
    await vi.advanceTimersByTimeAsync(0);
    const { sessionKey } = first.recorder.getSnapshot();
    first.recorder.dispose();

    const reloaded = setup(first);
    await reloaded.recorder.resumeDraft(sessionKey ?? "");
    await vi.advanceTimersByTimeAsync(0);
    const socket = latestSocket();
    socket.receive({ type: "session.created" });
    expect(socket.sentOfType("session.update")[0]?.session).toMatchObject({
      speaker_references: { S1: expect.stringMatching(/^UklGR/) },
    });
    socket.receive({ type: "session.updated" });
    socket.receive({ speaker_id: "S1", type: "transcription.segment" });
    reloaded.recorder.pause();
    await vi.advanceTimersByTimeAsync(3100);
    expect(new Set(sentSpeakers(first.server))).toEqual(new Set(["S1"]));
    reloaded.recorder.dispose();
  });

  it("sends who spoke at the end of a passage shortly after the passage", async () => {
    const { recorder, server } = setup();
    await recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    latestSocket().accept();
    audio.emitFrame(speech(1500));
    await vi.advanceTimersByTimeAsync(1300);
    latestSocket().receive({
      speaker_id: "speaker_1",
      type: "transcription.segment",
    });
    audio.emitFrame(silence(1000));
    await vi.advanceTimersByTimeAsync(500);
    latestSocket().receive({
      speaker_id: "speaker_2",
      type: "transcription.segment",
    });
    expect(sentSpeakers(server)).toEqual(["S1"]);
    await vi.advanceTimersByTimeAsync(2500);
    expect(sentSpeakers(server)).toEqual(["S1", "S2"]);
    recorder.dispose();
  });

  it("stops asking for speakers at once when Reflet refuses them for good", async () => {
    const { recorder, server } = setup();
    server.failNext(
      "/api/v1/sessions/speakers/token",
      new SessionApiError("Speaker detection is not set up", {
        limit: null,
        status: 503,
      })
    );
    await recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(recorder.getSnapshot()).toMatchObject({
      phase: "recording",
      speakers: "unavailable",
    });
    await vi.advanceTimersByTimeAsync(7000);
    expect(server.callsTo("/api/v1/sessions/speakers/token")).toHaveLength(1);
    expect(sockets).toEqual([]);
    recorder.dispose();
  });

  it("asks for a speaker token again after a passing failure", async () => {
    const { recorder, server } = setup();
    server.failNext(
      "/api/v1/sessions/speakers/token",
      new SessionApiError("Mistral did not answer", {
        limit: null,
        status: 502,
      })
    );
    await recorder.start({ detectSpeakers: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(server.callsTo("/api/v1/sessions/speakers/token")).toHaveLength(2);
    expect(sockets).toHaveLength(1);
    expect(recorder.getSnapshot().speakers).toBe("detecting");
    recorder.dispose();
  });

  it("never opens a speaker stream for a solo session", async () => {
    const { recorder, server } = setup();
    await recorder.start({});
    await vi.advanceTimersByTimeAsync(1000);
    expect(recorder.getSnapshot().speakers).toBe("off");
    expect(server.callsTo("/api/v1/sessions/speakers/token")).toEqual([]);
    expect(sockets).toEqual([]);
    recorder.dispose();
  });
});
