import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createIndexedSessionStore } from "../local/indexed-session-store";
import { type SessionLimits, sessionEventSchema } from "../protocol";
import { type FakeAudio, installFakeAudio } from "../testing/fake-audio";
import {
  createFakeSessionServer,
  type FakeSessionServer,
} from "../testing/fake-session-server";
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

const store = createIndexedSessionStore();

function speech(ms: number): Float32Array {
  return Float32Array.from(
    { length: ms * 48 },
    (_, index) => 0.3 * Math.sin((2 * Math.PI * 220 * index) / 48_000)
  );
}

function setup(limits: Partial<SessionLimits> = {}) {
  const server = createFakeSessionServer();
  const accountKey = `org:${crypto.randomUUID()}`;
  const recorder = createSessionRecorder({
    account: {
      key: accountKey,
      organizationName: "Acme",
      userEmail: null,
      userName: "Ada",
    },
    api: server.api,
    limits: { ...LIMITS, ...limits },
    surface: "devtools",
  });
  return { accountKey, recorder, server };
}

const sentEventsBody = z.object({ events: z.array(sessionEventSchema) });

function sentEvents(server: FakeSessionServer) {
  return server
    .callsTo("/api/v1/sessions/events")
    .flatMap((body) => sentEventsBody.parse(body).events);
}

let audio: FakeAudio;

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
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createSessionRecorder", () => {
  it("creates nothing when the microphone is refused", async () => {
    audio = installFakeAudio({ denyWith: "NotAllowedError" });
    const { accountKey, recorder, server } = setup();
    await recorder.start({});
    expect(recorder.getSnapshot()).toMatchObject({
      failure: { kind: "mic_denied" },
      phase: "failed",
      sessionKey: null,
    });
    await vi.runOnlyPendingTimersAsync();
    expect(await store.readDrafts(accountKey)).toEqual([]);
    expect(server.calls).toEqual([]);
  });

  it("asks for the microphone before anything is stored or sent", async () => {
    const { accountKey, recorder, server } = setup();
    let draftsWhenAsked: unknown[] | null = null;
    audio.getUserMedia.mockImplementationOnce(async () => {
      draftsWhenAsked = await store.readDrafts(accountKey);
      return { getTracks: () => audio.tracks };
    });
    await recorder.start({ title: "Checkout" });
    await vi.advanceTimersByTimeAsync(0);
    const { sessionKey } = recorder.getSnapshot();
    expect(draftsWhenAsked).toEqual([]);
    expect(recorder.getSnapshot().phase).toBe("recording");
    expect(server.callsTo("/api/v1/sessions/start")).toEqual([
      expect.objectContaining({ clientKey: sessionKey, title: "Checkout" }),
    ]);
    recorder.dispose();
  });

  it("releases the microphone and stops listening on pause", async () => {
    const { recorder, server } = setup();
    await recorder.start({});
    const button = document.createElement("button");
    button.textContent = "Pay";
    document.body.append(button);
    button.click();
    recorder.pause();
    expect(
      audio.tracks.every((track) => track.stop.mock.calls.length > 0)
    ).toBe(true);
    expect(audio.contexts[0]?.close).toHaveBeenCalled();
    button.click();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(
      sentEvents(server).filter((event) => event.kind === "click")
    ).toHaveLength(1);
    expect(server.callsTo("/api/v1/sessions/collection")).toEqual([
      expect.objectContaining({ action: "pause", reason: "paused" }),
    ]);
    button.remove();
    recorder.dispose();
  });

  it("turns what was said before a pause into a voice segment", async () => {
    const { recorder, server } = setup();
    await recorder.start({});
    audio.emitFrame(speech(1500));
    recorder.pause();
    await vi.advanceTimersByTimeAsync(0);
    expect(server.callsTo("/api/v1/sessions/segments")).toEqual([
      expect.objectContaining({ audioStorageId: "storage-1" }),
    ]);
    recorder.dispose();
  });

  it("pauses when the tab is hidden and waits for the user to resume", async () => {
    const { recorder } = setup();
    await recorder.start({});
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(recorder.getSnapshot()).toMatchObject({
      pauseReason: "hidden",
      phase: "paused",
    });
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(recorder.getSnapshot().phase).toBe("paused");
    await recorder.resume();
    expect(recorder.getSnapshot().phase).toBe("recording");
    expect(audio.getUserMedia).toHaveBeenCalledTimes(2);
    visibility.mockRestore();
    recorder.dispose();
  });

  it("stops the microphone before finishing, then ends and analyzes the session", async () => {
    const { accountKey, recorder, server } = setup();
    await recorder.start({});
    const finishing = recorder.finish();
    expect(
      audio.tracks.every((track) => track.stop.mock.calls.length > 0)
    ).toBe(true);
    const { sessionKey } = await finishing;
    await vi.advanceTimersByTimeAsync(0);
    const closing = server.calls
      .map((call) => call.path)
      .filter(
        (path) => path.endsWith("/collection") || path.endsWith("/analyze")
      );
    expect(closing).toEqual([
      "/api/v1/sessions/collection",
      "/api/v1/sessions/analyze",
    ]);
    expect(server.callsTo("/api/v1/sessions/collection")).toEqual([
      expect.objectContaining({ action: "end", sessionId: `id-${sessionKey}` }),
    ]);
    expect(recorder.getSnapshot()).toMatchObject({
      phase: "idle",
      sessionKey: null,
    });
    expect(await store.readDrafts(accountKey)).toEqual([]);
  });

  it("sends a mark once with the note written for it", async () => {
    const { recorder, server } = setup();
    await recorder.start({});
    const key = recorder.mark();
    expect(recorder.getSnapshot()).toMatchObject({
      lastMark: { key },
      markCount: 1,
    });
    recorder.annotateMark(key, "  The total is wrong ");
    await recorder.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(sentEvents(server).filter((event) => event.kind === "mark")).toEqual(
      [
        expect.objectContaining({
          evidenceClientKey: expect.any(String),
          note: "The total is wrong",
        }),
      ]
    );
  });

  it("warns near the duration limit and stops collecting at it", async () => {
    const { recorder } = setup({
      maxDurationMs: 4000,
      warnBeforeLimitMs: 2000,
    });
    await recorder.start({});
    await vi.advanceTimersByTimeAsync(2500);
    expect(recorder.getSnapshot()).toMatchObject({
      nearLimit: true,
      phase: "recording",
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(recorder.getSnapshot()).toMatchObject({
      limitsReached: ["duration"],
      pauseReason: "limit",
      phase: "paused",
    });
    await recorder.resume();
    expect(recorder.getSnapshot().phase).toBe("paused");
    recorder.dispose();
  });

  it("leaves an interrupted draft behind when it is disposed while recording", async () => {
    const { accountKey, recorder } = setup();
    await recorder.start({});
    recorder.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect((await store.readDrafts(accountKey))[0]?.state).toBe("interrupted");
    expect(recorder.getSnapshot().phase).toBe("idle");
  });
});
