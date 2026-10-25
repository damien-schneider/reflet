/// <reference types="vite/client" />

import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import {
  sessionDetailSchema,
  sessionIdentitySchema,
  speakerTokenSchema,
} from "../../../../sdk/src/sessions/protocol";
import { SPEAKER_DETECTION_MODEL } from "../../ai/models";
import type { TestContext } from "../../test.helpers";
import { SPEAKER_DETECTION_NOT_CONFIGURED } from "../ai/configuration";
import { SPEAKER_TURN_LIMITS } from "../constants";
import {
  errorBody,
  type SessionClient,
  setupSessionWorld,
  testFrame,
} from "./session.fixtures";

const TOKEN = "/api/v1/sessions/speakers/token";
const TURNS = "/api/v1/sessions/speakers";
const MISTRAL_SESSIONS_URL = "https://api.mistral.ai/v1/client/sessions";
const CLIENT_SECRET = "rt_test_secret";
const SECRET_EXPIRES_AT = "2026-10-23T11:03:00.194556Z";
const SPOKEN = "Bon, on fait le point. Moi je trouve que c'est long.";

const stubMistral = (answer: () => Response) => {
  const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
    answer()
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const clientSession = () =>
  Response.json(
    {
      client_secret: { expires_at: SECRET_EXPIRES_AT, value: CLIENT_SECRET },
      expires_at: SECRET_EXPIRES_AT,
      object: "client.session",
      purpose: "realtime",
    },
    { status: 201 }
  );

const startSpeakerSession = async (a: SessionClient): Promise<string> => {
  const started = await a.post("/api/v1/sessions/start", {
    clientKey: "group-session",
    detectSpeakers: true,
    page: { title: "Checkout", url: testFrame.url },
    startedAt: Date.now(),
    surface: "devtools",
  });
  return z.object({ session: z.object({ id: z.string() }) }).parse(started.body)
    .session.id;
};

const seedTranscribedPassage = (t: TestContext, sessionId: string) =>
  t.run(async (ctx) => {
    const id = ctx.db.normalizeId("sessions", sessionId);
    const session = id ? await ctx.db.get(id) : null;
    if (!session) {
      throw new Error("Session missing");
    }
    await ctx.db.insert("sessionSegments", {
      clientKey: "voice-1",
      createdAt: Date.now(),
      endMs: 9000,
      organizationId: session.organizationId,
      revision: 1,
      sessionId: session._id,
      source: "voice",
      startMs: 1000,
      text: SPOKEN,
      textOrigin: "transcription",
      transcription: { attempts: 1, state: "done", updatedAt: Date.now() },
      updatedAt: Date.now(),
      words: [
        { endMs: 2000, textOffset: 0 },
        { endMs: 3500, textOffset: 16 },
        { endMs: 5500, textOffset: SPOKEN.indexOf("Moi") },
        { endMs: 8000, textOffset: SPOKEN.indexOf("long") },
      ],
    });
    return session;
  });

describe("speaker detection token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("mints a short-lived Mistral realtime token for a member", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "mistral-server-key");
    const { a } = await setupSessionWorld();
    const fetchMock = stubMistral(clientSession);

    const response = await a.post(TOKEN, {});

    expect(response.status).toBe(200);
    expect(speakerTokenSchema.parse(response.body)).toEqual({
      expiresAt: Date.parse(SECRET_EXPIRES_AT),
      token: CLIENT_SECRET,
      url: `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=${SPEAKER_DETECTION_MODEL}`,
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(MISTRAL_SESSIONS_URL);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer mistral-server-key"
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "voxtral-mini-transcribe-realtime-3",
      purpose: "realtime",
      ttl_seconds: 120,
    });
    const identity = sessionIdentitySchema.parse(
      (await a.get("/api/v1/sessions/identity")).body
    );
    expect(identity.speakersConfigured).toBe(true);
  });

  test("answers 503 without calling Mistral when no key is configured", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "");
    const { a } = await setupSessionWorld();
    const fetchMock = stubMistral(clientSession);

    const response = await a.post(TOKEN, {});

    expect(response.status).toBe(503);
    expect(errorBody.parse(response.body).error).toBe(
      SPEAKER_DETECTION_NOT_CONFIGURED
    );
    expect(fetchMock).not.toHaveBeenCalled();
    const identity = sessionIdentitySchema.parse(
      (await a.get("/api/v1/sessions/identity")).body
    );
    expect(identity.speakersConfigured).toBe(false);
  });

  test("answers 502 with a clear reason when Mistral fails", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "mistral-server-key");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { a } = await setupSessionWorld();
    stubMistral(() => new Response("upstream down", { status: 500 }));

    const response = await a.post(TOKEN, {});

    expect(response.status).toBe(502);
    expect(errorBody.parse(response.body).error).toBe(
      "The speaker detection service answered with HTTP 500."
    );
  });
});

describe("speaker turns", () => {
  test("stores a batch once, even when the upload is replayed", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);
    const batch = {
      clientKey: "turns-1",
      sessionId,
      turns: [
        { endMs: 3000, speaker: "S1", startMs: 1500 },
        { endMs: 6000, speaker: "S2", startMs: 5000 },
      ],
    };

    const first = await a.post(TURNS, batch);
    const replay = await a.post(TURNS, batch);

    expect(first).toEqual({ body: { accepted: 2, dropped: 0 }, status: 200 });
    expect(replay).toEqual({ body: { accepted: 2, dropped: 0 }, status: 200 });
    const stored = await t.run((ctx) =>
      ctx.db.query("sessionSpeakerTurns").collect()
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ endMs: 6000, startMs: 1500 });
  });

  test("only the author can upload turns, and the last flush is accepted after the end", async () => {
    const { a, b } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);
    const batch = (clientKey: string) => ({
      clientKey,
      sessionId,
      turns: [{ endMs: 3000, speaker: "S1", startMs: 1500 }],
    });

    expect((await b.post(TURNS, batch("from-b"))).status).toBe(404);
    await a.post("/api/v1/sessions/update", { sessionId, visibility: "team" });
    expect((await b.post(TURNS, batch("from-b"))).status).toBe(403);

    await a.post("/api/v1/sessions/collection", {
      action: "end",
      atMs: 4000,
      sessionId,
    });
    expect((await a.post(TURNS, batch("final-flush"))).body).toEqual({
      accepted: 1,
      dropped: 0,
    });
  });

  test("rejects labels that are not S1 to S10", async () => {
    const { a } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);

    const response = await a.post(TURNS, {
      clientKey: "turns-1",
      sessionId,
      turns: [{ endMs: 3000, speaker: "speaker_3", startMs: 1500 }],
    });

    expect(response.status).toBe(400);
  });

  test("drops turns beyond the per-session cap", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);
    await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("sessions", sessionId);
      const session = id ? await ctx.db.get(id) : null;
      if (session) {
        await ctx.db.patch(session._id, {
          usage: {
            ...session.usage,
            speakerTurnCount: SPEAKER_TURN_LIMITS.maxPerSession - 1,
          },
        });
      }
    });

    const response = await a.post(TURNS, {
      clientKey: "turns-late",
      sessionId,
      turns: [
        { endMs: 3000, speaker: "S1", startMs: 1500 },
        { endMs: 4000, speaker: "S2", startMs: 3500 },
        { endMs: 5000, speaker: "S1", startMs: 4500 },
      ],
    });

    expect(response.body).toEqual({ accepted: 1, dropped: 2 });
  });
});

describe("speakers in the transcript", () => {
  test("detail says who said what", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);
    const session = await seedTranscribedPassage(t, sessionId);
    expect(session.detectSpeakers).toBe(true);
    await a.post(TURNS, {
      clientKey: "turns-1",
      sessionId,
      turns: [
        { endMs: 3500, speaker: "S1", startMs: 2000 },
        { endMs: 8000, speaker: "S2", startMs: 5500 },
      ],
    });

    const detail = sessionDetailSchema.parse(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).body
    );

    expect(detail.segments[0]?.speech).toEqual([
      { speaker: "S1", text: "Bon, on fait le point." },
      { speaker: "S2", text: "Moi je trouve que c'est long." },
    ]);
  });

  test("a corrected passage keeps the speaker who talked longest", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSpeakerSession(a);
    await seedTranscribedPassage(t, sessionId);
    await a.post(TURNS, {
      clientKey: "turns-1",
      sessionId,
      turns: [
        { endMs: 2500, speaker: "S1", startMs: 1000 },
        { endMs: 9000, speaker: "S2", startMs: 3000 },
      ],
    });
    const before = sessionDetailSchema.parse(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).body
    );
    const segmentId = before.segments[0]?.id;

    const corrected = await a.post("/api/v1/sessions/segments/correct", {
      expectedRevision: 1,
      segmentId,
      text: "Moi je trouve que c'est trop long.",
    });

    expect(corrected.status).toBe(200);
    expect(corrected.body).toMatchObject({
      segment: {
        speech: [{ speaker: "S2", text: "Moi je trouve que c'est trop long." }],
      },
    });
    const stored = await t.run((ctx) =>
      ctx.db.query("sessionSegments").collect()
    );
    expect(stored[0]?.words).toBeUndefined();
  });
});
