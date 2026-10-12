/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import { generateStructured } from "../../../intelligence/structured_output";
import { setupTest, type TestContext } from "../../../test.helpers";
import { requestRefinement } from "../analysis_request";
import { proposalOutput, SAVED_NEED, seedOstalSession } from "./ostal_session";
import { seedProposal } from "./session_fixtures";

vi.mock("../../../intelligence/structured_output", () => ({
  generateStructured: vi.fn(),
}));

async function startRefinement(t: TestContext) {
  const ids = await seedOstalSession(t);
  return await t.run(async (ctx) => {
    const session = await ctx.db.get(ids.sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    const proposal = await seedProposal(ctx, session, {
      certainty: "uncertain",
      need: "Un historique",
      question: "Que voulez-vous savoir ?",
      segmentIds: [ids.correctionId],
    });
    await requestRefinement(ctx, {
      proposal,
      text: "Je veux savoir si c'est enregistré.",
    });
    const refined = await ctx.db.get(proposal._id);
    if (!refined?.refinement) {
      throw new Error("Refinement did not start");
    }
    return { proposal: refined, runId: refined.refinement.runId };
  });
}

const readProposal = (t: TestContext, proposal: Doc<"sessionProposals">) =>
  t.run((ctx) => ctx.db.get(proposal._id));

describe("proposal refinement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.mocked(generateStructured).mockReset();
  });

  test("rewrites the proposal from the author's precision", async () => {
    const t = setupTest();
    const { proposal, runId } = await startRefinement(t);
    expect(proposal.clarifications).toHaveLength(1);
    vi.mocked(generateStructured).mockResolvedValueOnce({
      ...proposalOutput(SAVED_NEED),
      segments: [],
    });

    await t.action(internal.sessions.ai.analysis_run.runRefinement, {
      proposalId: proposal._id,
      runId,
    });

    const refined = await readProposal(t, proposal);
    expect(refined).toMatchObject({
      need: SAVED_NEED,
      revision: 2,
      segmentIds: proposal.segmentIds,
    });
    expect(refined?.refinement).toBeUndefined();
    expect(refined?.question).toBeUndefined();
  });

  test("marks the refinement outdated when the author edited the proposal meanwhile", async () => {
    const t = setupTest();
    const { proposal, runId } = await startRefinement(t);
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await t.run((ctx) =>
        ctx.db.patch(proposal._id, {
          need: "Edited by hand",
          revision: proposal.revision + 1,
        })
      );
      return proposalOutput(SAVED_NEED);
    });

    await t.action(internal.sessions.ai.analysis_run.runRefinement, {
      proposalId: proposal._id,
      runId,
    });

    const refined = await readProposal(t, proposal);
    expect(refined?.need).toBe("Edited by hand");
    expect(refined?.refinement?.state).toBe("outdated");
  });
});
