import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakerToken } from "../../protocol";
import { SPEAKER_TOKEN } from "../../testing/fake-session-server";
import {
  type FakeWebSocket,
  installFakeWebSocket,
} from "../../testing/fake-websocket";
import { SpeakerDetection } from "./speaker-detection";

const SAMPLES_PER_MS = 16;
const BASE64_WAV = /^UklGR/;

function voice(ms: number): Float32Array {
  return new Float32Array(ms * SAMPLES_PER_MS).fill(0.5);
}

function setup({
  references = {},
  requestToken = () => Promise.resolve(SPEAKER_TOKEN),
}: {
  references?: Record<string, string>;
  requestToken?: () => Promise<SpeakerToken | null>;
} = {}) {
  const sockets = installFakeWebSocket();
  const states: string[] = [];
  const savedLabelCounts: number[] = [];
  const savedReferences: Record<string, string>[] = [];
  const tokenRequests = vi.fn(requestToken);
  const detection = new SpeakerDetection({
    labelCount: Object.keys(references).length,
    onLabelCount: (count) => savedLabelCounts.push(count),
    onReferences: (saved) => savedReferences.push(saved),
    onState: (state) => states.push(state),
    references,
    requestToken: tokenRequests,
  });
  const latestSocket = (): FakeWebSocket => {
    const socket = sockets.at(-1);
    if (!socket) {
      throw new Error("No speaker stream was opened.");
    }
    return socket;
  };
  return {
    detection,
    latestSocket,
    savedLabelCounts,
    savedReferences,
    sockets,
    states,
    tokenRequests,
  };
}

async function openStream(latestSocket: () => FakeWebSocket) {
  await vi.advanceTimersByTimeAsync(0);
  const socket = latestSocket();
  socket.accept();
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SpeakerDetection", () => {
  it("configures diarization, then streams the microphone as PCM no faster than 1.25× real time", async () => {
    const { detection, latestSocket } = setup();
    detection.startRun(0);
    detection.pushSamples(voice(1000));
    await vi.advanceTimersByTimeAsync(0);
    const socket = latestSocket();
    expect(socket.url).toBe(SPEAKER_TOKEN.url);
    expect(socket.protocols).toEqual(["realtime", "rt_test"]);
    socket.receive({ type: "session.created" });
    expect(socket.sent).toEqual([
      {
        session: {
          audio_format: { encoding: "pcm_s16le", sample_rate: 16_000 },
          diarize: true,
          target_streaming_delay_ms: 480,
        },
        type: "session.update",
      },
    ]);
    await vi.advanceTimersByTimeAsync(500);
    expect(socket.sentOfType("input_audio.append")).toEqual([]);

    socket.receive({ type: "session.updated" });
    await vi.advanceTimersByTimeAsync(400);
    const appended = socket.appendedSamples();
    expect(appended.map((samples) => samples.length)).toEqual([
      2000, 2000, 2000, 2000,
    ]);
    expect(appended[0]?.every((sample) => sample === 16_384)).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    const sentSamples = socket
      .appendedSamples()
      .reduce((total, samples) => total + samples.length, 0);
    expect(sentSamples).toBe(16_000);
    detection.closeRun();
  });

  it("turns Mistral's speaker events into labelled turns on the session clock", async () => {
    const { detection, latestSocket, savedLabelCounts } = setup();
    detection.startRun(10_000);
    const socket = await openStream(latestSocket);
    detection.pushSamples(voice(3000));
    await vi.advanceTimersByTimeAsync(1600);
    socket.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    await vi.advanceTimersByTimeAsync(800);
    socket.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    socket.receive({ speaker_id: "speaker_2", type: "transcription.segment" });
    socket.receive({ text: "Bonjour", type: "transcription.text.delta" });
    expect(detection.drainTurns()).toEqual([
      { endMs: 12_270, speaker: "S1", startMs: 11_270 },
      { endMs: 12_270, speaker: "S2", startMs: 12_270 },
    ]);
    expect(savedLabelCounts).toEqual([1, 2]);
    detection.closeRun();
  });

  it("sends the voices heard in a previous run as references, so they keep their labels", async () => {
    const { detection, latestSocket, savedReferences } = setup();
    detection.startRun(0);
    const first = await openStream(latestSocket);
    const samples = voice(5000);
    detection.pushSamples(samples);
    await vi.advanceTimersByTimeAsync(1000);
    first.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    await vi.advanceTimersByTimeAsync(3000);
    first.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    detection.keepReferences({ endMs: 5000, samples, startMs: 0 });
    const finishing = detection.finishRun();
    await vi.advanceTimersByTimeAsync(100);
    expect(first.sentOfType("input_audio.end")).toHaveLength(1);
    first.receive({ type: "transcription.done" });
    expect(await finishing).toEqual([
      { endMs: 4270, speaker: "S1", startMs: 520 },
    ]);
    expect(savedReferences).toEqual([
      { S1: expect.stringMatching(BASE64_WAV) },
    ]);

    detection.startRun(6000);
    await vi.advanceTimersByTimeAsync(0);
    const second = latestSocket();
    second.receive({ type: "session.created" });
    const [update] = second.sentOfType("session.update");
    expect(update?.session).toMatchObject({
      speaker_references: { S1: expect.stringMatching(BASE64_WAV) },
    });
    second.receive({ type: "session.updated" });
    detection.pushSamples(voice(2000));
    await vi.advanceTimersByTimeAsync(2000);
    second.receive({ speaker_id: "speaker_2", type: "transcription.segment" });
    second.receive({ speaker_id: "S1", type: "transcription.segment" });
    expect(detection.drainTurns().map((turn) => turn.speaker)).toEqual([
      "S2",
      "S1",
    ]);
    detection.closeRun();
  });

  it("opens the next stream only once the previous one has kept its last voices, when resuming right after a pause", async () => {
    const { detection, latestSocket, sockets } = setup();
    detection.startRun(0);
    const first = await openStream(latestSocket);
    const samples = voice(5000);
    detection.pushSamples(samples);
    await vi.advanceTimersByTimeAsync(1000);
    first.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    await vi.advanceTimersByTimeAsync(3000);
    first.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    detection.keepReferences({ endMs: 5000, samples, startMs: 0 });
    const finishing = detection.finishRun();
    detection.startRun(6000);
    await vi.advanceTimersByTimeAsync(100);
    expect(sockets).toHaveLength(1);

    first.receive({ type: "transcription.done" });
    await finishing;
    await vi.advanceTimersByTimeAsync(0);
    const second = latestSocket();
    second.receive({ type: "session.created" });
    const [update] = second.sentOfType("session.update");
    expect(update?.session).toMatchObject({
      speaker_references: { S1: expect.stringMatching(BASE64_WAV) },
    });
    detection.closeRun();
  });

  it("waits until Mistral has heard past a passage before taking its voices, so a turn's last words count", async () => {
    const { detection, latestSocket, savedReferences } = setup();
    detection.startRun(0);
    const socket = await openStream(latestSocket);
    detection.pushSamples(voice(8000));
    await vi.advanceTimersByTimeAsync(1000);
    socket.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    await vi.advanceTimersByTimeAsync(1600);
    socket.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    detection.keepReferences({ endMs: 4000, samples: voice(4000), startMs: 0 });
    await vi.advanceTimersByTimeAsync(1200);
    socket.receive({ speaker_id: "speaker_1", type: "transcription.segment" });
    detection.settleReferences();
    expect(savedReferences).toEqual([]);
    await vi.advanceTimersByTimeAsync(800);
    detection.settleReferences();
    expect(savedReferences).toEqual([
      { S1: expect.stringMatching(BASE64_WAV) },
    ]);
    detection.closeRun();
  });

  it("starts from the voices saved before a reload, so they keep their labels", async () => {
    const { detection, latestSocket, savedLabelCounts } = setup({
      references: { S1: "UklGRsaved" },
    });
    detection.startRun(0);
    await vi.advanceTimersByTimeAsync(0);
    const socket = latestSocket();
    socket.receive({ type: "session.created" });
    const [update] = socket.sentOfType("session.update");
    expect(update?.session).toMatchObject({
      speaker_references: { S1: "UklGRsaved" },
    });
    socket.receive({ type: "session.updated" });
    detection.pushSamples(voice(2000));
    await vi.advanceTimersByTimeAsync(2000);
    socket.receive({ speaker_id: "S1", type: "transcription.segment" });
    socket.receive({ speaker_id: "speaker_2", type: "transcription.segment" });
    expect(detection.drainTurns().map((turn) => turn.speaker)).toEqual([
      "S1",
      "S2",
    ]);
    expect(savedLabelCounts).toEqual([2]);
    detection.closeRun();
  });

  it("stops waiting for Mistral's last words after a few seconds", async () => {
    const { detection, latestSocket } = setup();
    detection.startRun(0);
    const socket = await openStream(latestSocket);
    let isFinished = false;
    detection.finishRun().then(() => {
      isFinished = true;
    });
    await vi.advanceTimersByTimeAsync(2900);
    expect(isFinished).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(isFinished).toBe(true);
    expect(socket.isClosed).toBe(true);
  });

  it("gives up on speakers when Mistral reports an error", async () => {
    const { detection, latestSocket, sockets, states } = setup();
    detection.startRun(0);
    const socket = await openStream(latestSocket);
    socket.receive({ error: { message: "Invalid audio" }, type: "error" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(states).toEqual(["detecting", "unavailable"]);
    expect(socket.isClosed).toBe(true);
    expect(sockets).toHaveLength(1);
  });

  it("reconnects with a fresh token when the stream drops, then gives up", async () => {
    const { detection, latestSocket, sockets, states, tokenRequests } = setup();
    detection.startRun(0);
    const first = await openStream(latestSocket);
    first.drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(tokenRequests).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);
    expect(states).toEqual(["detecting"]);

    latestSocket().drop();
    await vi.advanceTimersByTimeAsync(2000);
    latestSocket().drop();
    await vi.advanceTimersByTimeAsync(4000);
    expect(sockets).toHaveLength(4);
    latestSocket().drop();
    expect(states).toEqual(["detecting", "unavailable"]);
  });

  it("treats a stream that errors without closing, as a blocking security policy does, as lost", async () => {
    const { detection, latestSocket, sockets, tokenRequests } = setup();
    detection.startRun(0);
    await vi.advanceTimersByTimeAsync(0);
    latestSocket().failWithoutClosing();
    expect(sockets[0]?.isClosed).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tokenRequests).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);
    detection.closeRun();
  });

  it("stops detecting at once when Reflet refuses a speaker token for good", async () => {
    const { detection, sockets, states, tokenRequests } = setup({
      requestToken: () => Promise.resolve(null),
    });
    detection.startRun(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toEqual(["detecting", "unavailable"]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(tokenRequests).toHaveBeenCalledTimes(1);
    expect(sockets).toEqual([]);
  });

  it("stops detecting when Mistral is unreachable for too long", async () => {
    const { detection, states } = setup({
      requestToken: () => new Promise(() => undefined),
    });
    detection.startRun(0);
    for (let second = 0; second < 30; second += 1) {
      detection.pushSamples(voice(1000));
    }
    expect(states).toEqual(["detecting"]);
    detection.pushSamples(voice(1000));
    expect(states).toEqual(["detecting", "unavailable"]);
  });
});
