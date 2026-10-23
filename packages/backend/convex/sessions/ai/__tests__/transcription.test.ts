/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { TRANSCRIPTION_MODEL } from "../../../ai/models";
import { rateLimiter } from "../../../shared/rate_limits";
import { setupTest, type TestContext } from "../../../test.helpers";
import { TRANSCRIPTION_NOT_CONFIGURED } from "../configuration";
import { scheduleTranscription } from "../transcription";
import { captureLogs, seedSegment, seedSession } from "./session_fixtures";

const SPOKEN = "Il faudrait un historique.";
const WAV_BYTES = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 250]);
const STT_URL = "https://openrouter.ai/api/v1/audio/transcriptions";

const transcriptionJson = (
  text: string,
  words?: { end: number; start: number; word: string }[]
): Response =>
  Response.json({ language: "fra", language_confidence: 0.99, text, words });

const stubTranscriptionService = (answer: () => Promise<Response>) => {
  const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
    answer()
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

async function seedVoiceSegment(
  t: TestContext,
  options: {
    analysisState?: "idle" | "waiting";
    detectSpeakers?: boolean;
    expiresAt?: number;
  } = {}
) {
  return await t.run(async (ctx) => {
    const session = await seedSession(ctx, {
      analysis: { state: options.analysisState ?? "idle" },
      detectSpeakers: options.detectSpeakers === true,
    });
    const storageId = await ctx.storage.store(
      new Blob([WAV_BYTES], { type: "audio/wav" })
    );
    const segment = await seedSegment(ctx, session, {
      audio: {
        bytes: WAV_BYTES.length,
        expiresAt: options.expiresAt ?? Date.now() + 60_000,
        storageId,
      },
      transcription: { attempts: 0, state: "pending", updatedAt: Date.now() },
    });
    return { segmentId: segment._id, sessionId: session._id, storageId };
  });
}

const readState = (
  t: TestContext,
  ids: {
    segmentId: Id<"sessionSegments">;
    sessionId: Id<"sessions">;
    storageId: Id<"_storage">;
  }
) =>
  t.run(async (ctx) => ({
    audioFile: await ctx.db.system.get(ids.storageId),
    scheduled: (await ctx.db.system.query("_scheduled_functions").collect())
      .filter(({ state }) => state.kind === "pending")
      .map(({ name }) => name),
    segment: await ctx.db.get(ids.segmentId),
    session: await ctx.db.get(ids.sessionId),
  }));

const transcribe = (t: TestContext, segmentId: Id<"sessionSegments">) =>
  t.action(internal.sessions.ai.transcription.transcribeSegment, {
    segmentId,
  });

describe("segment transcription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("saves the spoken text and deletes the audio in the same step", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    const fetchMock = stubTranscriptionService(async () =>
      transcriptionJson(`[pause] ${SPOKEN} [laughter]`)
    );
    const logs = captureLogs();

    await transcribe(t, ids.segmentId);

    expect(logs()).not.toContain(SPOKEN);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(STT_URL);
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer sk-or-test"
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      input_audio: {
        data: btoa(String.fromCharCode(...WAV_BYTES)),
        format: "wav",
      },
      model: TRANSCRIPTION_MODEL,
      provider: { zdr: true },
      response_format: "verbose_json",
    });
    const state = await readState(t, ids);
    expect(state.segment).toMatchObject({
      language: "fra",
      text: SPOKEN,
      textOrigin: "transcription",
      transcription: { attempts: 1, state: "done" },
    });
    expect(state.segment?.audio).toBeUndefined();
    expect(state.segment?.words).toBeUndefined();
    expect(state.audioFile).toBeNull();
    expect(state.session?.transcriptRevision).toBe(2);
  });

  test("for a session with several speakers, keeps when each spoken word ends", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t, { detectSpeakers: true });
    const fetchMock = stubTranscriptionService(async () =>
      transcriptionJson("Ça marche ? [rires] Oui.", [
        { end: 0.3, start: 0.02, word: "Ça" },
        { end: 0.7, start: 0.32, word: "marche" },
        { end: 0.75, start: 0.7, word: "?" },
        { end: 1.4, start: 0.9, word: "[rires]" },
        { end: 2.1, start: 1.8, word: "Oui." },
      ])
    );

    await transcribe(t, ids.segmentId);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      timestamp_granularities: ["word"],
    });
    const state = await readState(t, ids);
    expect(state.segment?.text).toBe("Ça marche ? Oui.");
    expect(state.segment?.words).toEqual([
      { endMs: 1300, textOffset: 0 },
      { endMs: 1700, textOffset: 3 },
      { endMs: 1750, textOffset: 10 },
      { endMs: 3100, textOffset: 12 },
    ]);
  });

  test("keeps the author's correction typed while the audio was being transcribed", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    stubTranscriptionService(async () => {
      await t.run((ctx) =>
        ctx.db.patch(ids.segmentId, {
          revision: 2,
          text: "Je veux un historique.",
          textOrigin: "human",
        })
      );
      return transcriptionJson(SPOKEN);
    });

    await transcribe(t, ids.segmentId);

    const state = await readState(t, ids);
    expect(state.segment).toMatchObject({
      text: "Je veux un historique.",
      textOrigin: "human",
      transcription: { state: "done" },
    });
    expect(state.segment?.audio).toBeUndefined();
    expect(state.audioFile).toBeNull();
  });

  test("leaves nothing behind when the session is deleted during transcription", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    stubTranscriptionService(async () => {
      await t.run(async (ctx) => {
        await ctx.db.delete(ids.segmentId);
        await ctx.storage.delete(ids.storageId);
        await ctx.db.patch(ids.sessionId, { deletedAt: Date.now(), title: "" });
      });
      return transcriptionJson(SPOKEN);
    });

    await transcribe(t, ids.segmentId);

    const state = await readState(t, ids);
    expect(state.segment).toBeNull();
    expect(state.audioFile).toBeNull();
    expect(state.session?.transcriptRevision).toBe(1);
  });

  test("marks silence as empty without touching the transcript revision", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    stubTranscriptionService(async () => transcriptionJson("[pause]"));

    await transcribe(t, ids.segmentId);

    const state = await readState(t, ids);
    expect(state.segment).toMatchObject({
      text: "",
      transcription: { state: "empty" },
    });
    expect(state.audioFile).toBeNull();
    expect(state.session?.transcriptRevision).toBe(1);
  });

  test("retries transient failures twice, then fails without leaking the transcript to logs", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    stubTranscriptionService(async () => new Response("busy", { status: 502 }));
    const logs = captureLogs();

    await transcribe(t, ids.segmentId);
    const afterFirst = await readState(t, ids);
    expect(afterFirst.segment?.transcription).toMatchObject({
      attempts: 1,
      state: "pending",
    });
    expect(afterFirst.scheduled).toContain(
      "sessions/ai/transcription:transcribeSegment"
    );

    await transcribe(t, ids.segmentId);
    await transcribe(t, ids.segmentId);

    const afterLast = await readState(t, ids);
    expect(afterLast.segment?.transcription).toMatchObject({
      attempts: 3,
      error: "The transcription service answered with HTTP 502.",
      state: "failed",
    });
    expect(afterLast.audioFile).not.toBeNull();
    expect(logs()).toContain(ids.segmentId);
    expect(logs()).not.toContain("busy");
  });

  test("fails with a clear reason when no transcription key is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const t = setupTest();
    const ids = await seedVoiceSegment(t);
    const fetchMock = stubTranscriptionService(async () =>
      transcriptionJson(SPOKEN)
    );

    await transcribe(t, ids.segmentId);

    expect(fetchMock).not.toHaveBeenCalled();
    const state = await readState(t, ids);
    expect(state.segment?.transcription).toMatchObject({
      error: TRANSCRIPTION_NOT_CONFIGURED,
      state: "failed",
    });
  });

  test("stops transcribing once the organization used its hourly quota", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t, { analysisState: "waiting" });
    const fetchMock = stubTranscriptionService(async () =>
      transcriptionJson(SPOKEN)
    );

    await t.run(async (ctx) => {
      const segment = await ctx.db.get(ids.segmentId);
      if (!segment) {
        throw new Error("Segment missing");
      }
      await rateLimiter.limit(ctx, "sessionTranscriptionPerOrg", {
        count: 1200,
        key: segment.organizationId,
      });
      await scheduleTranscription(ctx, ids.segmentId);
    });

    const state = await readState(t, ids);
    expect(state.segment?.transcription).toMatchObject({
      error:
        "Your organization reached its hourly transcription limit. Retry later or type this passage.",
      state: "failed",
    });
    expect(state.scheduled).not.toContain(
      "sessions/ai/transcription:transcribeSegment"
    );
    expect(state.scheduled).toContain("sessions/ai/analysis_run:runAnalysis");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("starts the waiting analysis once the last passage is transcribed", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t, { analysisState: "waiting" });
    stubTranscriptionService(async () => transcriptionJson(SPOKEN));

    await transcribe(t, ids.segmentId);

    const state = await readState(t, ids);
    expect(state.session?.analysis.state).toBe("running");
    expect(state.scheduled).toContain("sessions/ai/analysis_run:runAnalysis");
  });
});

describe("expireSessionAudio", () => {
  test("deletes audio past retention and marks untranscribed passages expired", async () => {
    const t = setupTest();
    const ids = await seedVoiceSegment(t, { expiresAt: Date.now() - 1000 });

    await t.mutation(
      internal.sessions.ai.transcription_state.expireSessionAudio,
      {}
    );

    const state = await readState(t, ids);
    expect(state.audioFile).toBeNull();
    expect(state.segment?.audio).toBeUndefined();
    expect(state.segment?.transcription.state).toBe("expired");
  });
});
