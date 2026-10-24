/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { generateStructured } from "../../../ai/structured_output";
import { setupTest, type TestContext } from "../../../test.helpers";
import { requestAnalysis } from "../analysis_request";
import { proposalOutput, SAVED_NEED } from "./ostal_session";
import { seedSegment, seedSession } from "./session_fixtures";

vi.mock("../../../ai/structured_output", () => ({
  generateStructured: vi.fn(),
}));

const SPOKEN = "Je veux surtout savoir si c'est enregistré.";
const WAV_BYTES = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 250]);
const LIVE_ANALYSIS_GAP_MS = 15_000;
const analysisOutput = {
  mergeSuggestions: [],
  proposals: [
    { ...proposalOutput(SAVED_NEED), evidence: [], segments: ["S1"] },
  ],
};

async function seedRecordingWithPassage(t: TestContext) {
  return await t.run(async (ctx) => {
    const session = await seedSession(ctx, {
      collection: "recording",
      endedAt: undefined,
      transcriptRevision: 0,
    });
    const storageId = await ctx.storage.store(
      new Blob([WAV_BYTES], { type: "audio/wav" })
    );
    const passage = await seedSegment(ctx, session, {
      audio: {
        bytes: WAV_BYTES.length,
        expiresAt: Date.now() + 60_000,
        storageId,
      },
      transcription: { attempts: 0, state: "pending", updatedAt: Date.now() },
    });
    return { passageId: passage._id, sessionId: session._id };
  });
}

const loadSession = (t: TestContext, sessionId: Id<"sessions">) =>
  t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    return session;
  });

const runningAnalysisId = async (
  t: TestContext,
  sessionId: Id<"sessions">
): Promise<string> => {
  const { analysis } = await loadSession(t, sessionId);
  if (analysis.state !== "running" || analysis.runId === undefined) {
    throw new Error(`No analysis is running (state: ${analysis.state})`);
  }
  return analysis.runId;
};

const transcribe = (t: TestContext, segmentId: Id<"sessionSegments">) =>
  t.action(internal.sessions.ai.transcription.transcribeSegment, {
    segmentId,
  });

const runAnalysis = (
  t: TestContext,
  ids: { runId: string; sessionId: Id<"sessions"> }
) => t.action(internal.sessions.ai.analysis_run.runAnalysis, ids);

const listNeeds = async (t: TestContext, sessionId: Id<"sessions">) =>
  (
    await t.run((ctx) =>
      ctx.db
        .query("sessionProposals")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect()
    )
  ).map(({ need }) => need);

const pendingScheduled = (t: TestContext) =>
  t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect())
      .filter(({ state }) => state.kind === "pending")
      .map(({ name }) => name)
  );

describe("analysis while recording", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ language: "fra", text: SPOKEN }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(generateStructured).mockReset();
  });

  test("finds intentions as soon as a passage is transcribed", async () => {
    const t = setupTest();
    const ids = await seedRecordingWithPassage(t);
    vi.mocked(generateStructured).mockResolvedValueOnce(analysisOutput);

    await transcribe(t, ids.passageId);
    const runId = await runningAnalysisId(t, ids.sessionId);
    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect(await listNeeds(t, ids.sessionId)).toEqual([SAVED_NEED]);
    expect(await loadSession(t, ids.sessionId)).toMatchObject({
      analysis: { analyzedRevision: 1, state: "succeeded" },
      collection: "recording",
    });
  });

  test("keeps what it found while the author kept talking, then reads the rest after a gap", async () => {
    const t = setupTest();
    const ids = await seedRecordingWithPassage(t);
    await transcribe(t, ids.passageId);
    const firstRunId = await runningAnalysisId(t, ids.sessionId);
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await t.run((ctx) =>
        ctx.db.patch(ids.sessionId, { transcriptRevision: 2 })
      );
      return analysisOutput;
    });

    await runAnalysis(t, { runId: firstRunId, sessionId: ids.sessionId });

    expect(await listNeeds(t, ids.sessionId)).toEqual([SAVED_NEED]);
    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      analyzedRevision: 1,
      state: "succeeded",
    });
    expect(await pendingScheduled(t)).toContain(
      "sessions/ai/live_analysis:followRecordingLater"
    );

    vi.advanceTimersByTime(LIVE_ANALYSIS_GAP_MS);
    await t.finishInProgressScheduledFunctions();

    expect(await runningAnalysisId(t, ids.sessionId)).not.toBe(firstRunId);
  });

  test("Finish starts a fresh analysis instead of trusting one started while recording", async () => {
    const t = setupTest();
    const ids = await seedRecordingWithPassage(t);
    await transcribe(t, ids.passageId);
    const liveRunId = await runningAnalysisId(t, ids.sessionId);

    await t.run(async (ctx) => {
      await ctx.db.patch(ids.sessionId, {
        collection: "ended",
        endedAt: Date.now(),
      });
      const ended = await ctx.db.get(ids.sessionId);
      if (ended) {
        await requestAnalysis(ctx, ended);
      }
    });
    vi.mocked(generateStructured).mockResolvedValueOnce(analysisOutput);
    await runAnalysis(t, { runId: liveRunId, sessionId: ids.sessionId });

    expect(await runningAnalysisId(t, ids.sessionId)).not.toBe(liveRunId);
    expect(await listNeeds(t, ids.sessionId)).toEqual([]);
  });
});
