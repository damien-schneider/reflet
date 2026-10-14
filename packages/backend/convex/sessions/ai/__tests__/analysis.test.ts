/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { generateStructured } from "../../../intelligence/structured_output";
import { setupTest, type TestContext } from "../../../test.helpers";
import { requestAnalysis } from "../analysis_request";
import { ANALYSIS_NOT_CONFIGURED } from "../configuration";
import {
  proposalOutput,
  SAVED_NEED,
  seedOstalSession,
  WISH,
} from "./ostal_session";
import { captureLogs, seedProposal, seedSegment } from "./session_fixtures";

vi.mock("../../../intelligence/structured_output", () => ({
  generateStructured: vi.fn(),
}));

const ostalOutput = {
  mergeSuggestions: [],
  proposals: [proposalOutput(SAVED_NEED)],
};
const loadSession = async (t: TestContext, sessionId: Id<"sessions">) =>
  await t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    return session;
  });

async function startAnalysis(t: TestContext, sessionId: Id<"sessions">) {
  await t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    if (session) {
      await requestAnalysis(ctx, session);
    }
  });
  const { analysis } = await loadSession(t, sessionId);
  if (analysis.runId === undefined) {
    throw new Error("Analysis did not start");
  }
  return analysis.runId;
}

const runAnalysis = (
  t: TestContext,
  ids: { runId: string; sessionId: Id<"sessions"> }
) => t.action(internal.sessions.ai.analysis_run.runAnalysis, ids);

const listProposals = (t: TestContext, sessionId: Id<"sessions">) =>
  t.run((ctx) =>
    ctx.db
      .query("sessionProposals")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect()
  );

const seedHumanTouchedProposals = (t: TestContext, sessionId: Id<"sessions">) =>
  t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    await seedProposal(ctx, session, { need: "Untouched draft" });
    await seedProposal(ctx, session, {
      decision: "kept",
      humanTouchedAt: 1,
      need: "Kept by the author",
    });
    const handedOff = await seedProposal(ctx, session, {
      need: "Already handed off",
    });
    await ctx.db.insert("sessionHandoffs", {
      authorId: session.authorId,
      brief: "# Brief",
      clientKey: "handoff-1",
      createdAt: Date.now(),
      deliveries: [],
      evidenceIds: [],
      files: [],
      organizationId: session.organizationId,
      proposals: [
        { need: handedOff.need, proposalId: handedOff._id, revision: 1 },
      ],
      sessionId: session._id,
    });
  });

describe("session analysis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.mocked(generateStructured).mockReset();
    vi.restoreAllMocks();
  });

  test("waits for passages still being transcribed before running", async () => {
    const t = setupTest();
    const { sessionId } = await seedOstalSession(t);
    await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId);
      if (session) {
        await seedSegment(ctx, session, {
          transcription: {
            attempts: 0,
            state: "pending",
            updatedAt: Date.now(),
          },
        });
        await requestAnalysis(ctx, session);
      }
    });

    expect((await loadSession(t, sessionId)).analysis.state).toBe("waiting");
  });

  test("refuses to start when the deployment has no AI key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const t = setupTest();
    const { sessionId } = await seedOstalSession(t);

    await expect(
      t.run(async (ctx) => {
        const session = await ctx.db.get(sessionId);
        if (session) {
          await requestAnalysis(ctx, session);
        }
      })
    ).rejects.toMatchObject({
      data: { error: ANALYSIS_NOT_CONFIGURED, status: 503 },
    });
  });

  test("replaces untouched AI drafts but never what the author touched", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    await seedHumanTouchedProposals(t, ids.sessionId);
    vi.mocked(generateStructured).mockResolvedValueOnce(ostalOutput);
    const runId = await startAnalysis(t, ids.sessionId);

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    const prompt =
      vi.mocked(generateStructured).mock.calls[0]?.[0].prompt ?? "";
    expect(prompt).toContain("- Kept by the author (kept)");
    expect(prompt).not.toContain("Untouched draft");
    const needs = (await listProposals(t, ids.sessionId)).map(
      ({ need }) => need
    );
    expect(needs.sort()).toEqual([
      "Already handed off",
      "Kept by the author",
      SAVED_NEED,
    ]);
    const created = (await listProposals(t, ids.sessionId)).find(
      ({ need }) => need === SAVED_NEED
    );
    expect(created).toMatchObject({
      analysisRunId: runId,
      callout: "Aucune confirmation d'enregistrement",
      calloutSegmentId: ids.correctionId,
      decision: "pending",
      evidenceIds: [ids.evidenceId],
      origin: "ai",
      segmentIds: [ids.wishId, ids.correctionId],
      setAside: ["Un historique des modifications"],
    });
    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      analyzedRevision: 1,
      proposalCount: 1,
      state: "succeeded",
    });
  });

  test("discards a result computed on a transcript that changed meanwhile", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await t.run((ctx) =>
        ctx.db.patch(ids.sessionId, { transcriptRevision: 2 })
      );
      return ostalOutput;
    });

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect(await listProposals(t, ids.sessionId)).toEqual([]);
    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      error: "The transcript changed during the analysis. Analyze again.",
      state: "failed",
    });
  });

  test("ignores a result for a session deleted meanwhile", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await t.run((ctx) =>
        ctx.db.patch(ids.sessionId, { deletedAt: Date.now(), title: "" })
      );
      return ostalOutput;
    });

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect(await listProposals(t, ids.sessionId)).toEqual([]);
    expect((await loadSession(t, ids.sessionId)).analysis.state).toBe(
      "running"
    );
  });

  test("applies a run only once", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.mocked(generateStructured).mockResolvedValueOnce(ostalOutput);
    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    await t.mutation(internal.sessions.ai.analysis_apply.applyAnalysis, {
      mergeGroups: [],
      proposals: [],
      runId,
      sessionId: ids.sessionId,
      transcriptRevision: 1,
    });

    expect(
      (await listProposals(t, ids.sessionId)).map(({ need }) => need)
    ).toEqual([SAVED_NEED]);
  });

  test("treats a session without any request as a successful empty analysis", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.mocked(generateStructured).mockResolvedValueOnce({
      mergeSuggestions: [],
      proposals: [],
    });

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      proposalCount: 0,
      state: "succeeded",
    });
  });

  test("fails without logging session content when the model answer is unusable", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.mocked(generateStructured).mockRejectedValueOnce(
      new Error(`AI response was not valid JSON (first 200 chars): ${WISH}`)
    );
    const logs = captureLogs();

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect(logs()).toContain(runId);
    expect(logs()).not.toContain(WISH);
    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      error: "The AI couldn't read this session right now. Try again.",
      state: "failed",
    });
  });

  test("fails with a clear reason when the AI key disappears before the run", async () => {
    const t = setupTest();
    const ids = await seedOstalSession(t);
    const runId = await startAnalysis(t, ids.sessionId);
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await runAnalysis(t, { runId, sessionId: ids.sessionId });

    expect(generateStructured).not.toHaveBeenCalled();
    expect((await loadSession(t, ids.sessionId)).analysis).toMatchObject({
      error: ANALYSIS_NOT_CONFIGURED,
      state: "failed",
    });
  });
});
