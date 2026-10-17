/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { generateStructured } from "../../../ai/structured_output";
import { setupTest, type TestContext } from "../../../test.helpers";
import type { SessionActor } from "../../access";
import { requestAnalysis, requestRefinement } from "../analysis_request";
import {
  saveButton,
  seedEvidence,
  seedSegment,
  seedSession,
  settingsFrame,
} from "./session_fixtures";

vi.mock("../../../ai/structured_output", () => ({
  generateStructured: vi.fn(),
}));

const HOVERED_ROW = {
  component: "InvoiceRow",
  label: 'div "INV-2026-009 €49.00"',
  rect: { height: 48, width: 900, x: 300, y: 500 },
  role: null,
  selector: "ul > li:nth-child(1)",
  source: null,
};
const HOVER_SCREENSHOT_KEY = "hover-screenshot";

const analysisOutput = {
  mergeSuggestions: [],
  proposals: [
    {
      callout: { label: "Enregistrer sans retour", segment: "S1" },
      certainty: "clear",
      evidence: [],
      need: "Savoir que mes réglages sont enregistrés",
      observed: "L'auteur dit que le bouton Enregistrer ne montre rien.",
      question: null,
      response: null,
      segments: ["S1"],
      setAside: [],
      unknowns: [],
    },
  ],
};

interface SeededIds {
  actor: SessionActor;
  runId: string;
  screenshotId: Id<"sessionEvidence">;
  sessionId: Id<"sessions">;
}

async function seedPointedElsewhere(
  t: TestContext,
  visibleElements = [HOVERED_ROW, saveButton()]
): Promise<SeededIds> {
  return await t.run(async (ctx) => {
    const session = await seedSession(ctx);
    await seedSegment(ctx, session, {
      endMs: 13_000,
      startMs: 10_000,
      text: "Le bouton Enregistrer ne montre rien quand je clique.",
    });
    const screenshot = await seedEvidence(ctx, session, {
      atMs: 11_000,
      capturedAtMs: 11_000,
      clientKey: HOVER_SCREENSHOT_KEY,
      element: HOVERED_ROW,
      frame: settingsFrame(),
      status: "available",
      trigger: "hover",
      visibleElements,
    });
    await ctx.db.insert("sessionEventBatches", {
      clientKey: "events-1",
      createdAt: Date.now(),
      endMs: 15_000,
      events: [
        {
          atMs: 11_000,
          durationMs: 4000,
          element: HOVERED_ROW,
          evidenceClientKey: HOVER_SCREENSHOT_KEY,
          frame: settingsFrame(),
          kind: "dwell",
          pointer: { x: 400, y: 520 },
        },
      ],
      organizationId: session.organizationId,
      sessionId: session._id,
      startMs: 11_000,
    });
    await requestAnalysis(ctx, session);
    const started = await ctx.db.get(session._id);
    return {
      actor: {
        organizationId: session.organizationId,
        userId: session.authorId,
      },
      runId: started?.analysis.runId ?? "",
      screenshotId: screenshot._id,
      sessionId: session._id,
    };
  });
}

const reviewedProposal = async (t: TestContext, ids: SeededIds) => {
  const detail = await t.query(internal.sessions.views.queries.detail, {
    actor: ids.actor,
    sessionId: ids.sessionId,
  });
  return detail.proposals[0];
};

const analyzeAndReview = async (t: TestContext, ids: SeededIds) => {
  await t.action(internal.sessions.ai.analysis_run.runAnalysis, {
    runId: ids.runId,
    sessionId: ids.sessionId,
  });
  return await reviewedProposal(t, ids);
};

describe("locating what an intention is about on its screenshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.mocked(generateStructured).mockReset();
  });

  test("frames the element the author talked about, not the one they hovered", async () => {
    const t = setupTest();
    const ids = await seedPointedElsewhere(t);
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockResolvedValueOnce({
        targets: [{ element: "T2", intention: "I1" }],
      });

    const proposal = await analyzeAndReview(t, ids);

    expect(proposal?.calloutTarget).toEqual({
      element: saveButton(),
      evidenceId: ids.screenshotId,
    });
    const locatePrompt =
      vi.mocked(generateStructured).mock.calls[1]?.[0].prompt;
    expect(locatePrompt).toMatch(/T1 [^\n]*INV-2026-009[^\n]*hovered it/);
    expect(locatePrompt).toMatch(/T2 button "Enregistrer"/);
    expect(locatePrompt).toContain("Le bouton Enregistrer ne montre rien");
  });

  test("frames the element where the screenshot shows it, not where the hover saw it", async () => {
    const t = setupTest();
    const rowAsRendered = {
      ...HOVERED_ROW,
      rect: { ...HOVERED_ROW.rect, y: 140 },
    };
    const ids = await seedPointedElsewhere(t, [rowAsRendered, saveButton()]);
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockResolvedValueOnce({
        targets: [{ element: "T1", intention: "I1" }],
      });

    const proposal = await analyzeAndReview(t, ids);

    expect(proposal?.calloutTarget?.element).toEqual(rowAsRendered);
  });

  test("moves the pin, without a frame, when its screenshot is removed", async () => {
    const t = setupTest();
    const ids = await seedPointedElsewhere(t);
    const laterScreenshot = await t.run(async (ctx) => {
      const session = await ctx.db.get(ids.sessionId);
      if (!session) {
        throw new Error("Seeded session missing");
      }
      return await seedEvidence(ctx, session, {
        atMs: 12_000,
        capturedAtMs: 12_000,
        clientKey: "later-screenshot",
        frame: settingsFrame(),
        status: "available",
        trigger: "mark",
      });
    });
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockResolvedValueOnce({
        targets: [{ element: "T2", intention: "I1" }],
      });
    await analyzeAndReview(t, ids);

    await t.mutation(internal.sessions.capture.evidence.remove, {
      actor: ids.actor,
      evidenceId: ids.screenshotId,
    });

    const stored = await t.run(async (ctx) => {
      const [remaining] = await ctx.db
        .query("sessionProposals")
        .withIndex("by_session", (q) => q.eq("sessionId", ids.sessionId))
        .collect();
      return remaining;
    });
    expect(stored?.calloutTarget).toBeUndefined();
    expect((await reviewedProposal(t, ids))?.calloutTarget).toEqual({
      element: null,
      evidenceId: laterScreenshot._id,
    });
  });

  test("pins on the screenshot without a frame when no recorded element matches", async () => {
    const t = setupTest();
    const ids = await seedPointedElsewhere(t);
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockResolvedValueOnce({
        targets: [{ element: null, intention: "I1" }],
      });

    const proposal = await analyzeAndReview(t, ids);

    expect(proposal?.calloutTarget).toEqual({
      element: null,
      evidenceId: ids.screenshotId,
    });
  });

  test("drops the frame when a precision leaves nothing to point at", async () => {
    const t = setupTest();
    const ids = await seedPointedElsewhere(t);
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockResolvedValueOnce({
        targets: [{ element: "T2", intention: "I1" }],
      });
    await analyzeAndReview(t, ids);
    const refinement = await t.run(async (ctx) => {
      const [proposal] = await ctx.db
        .query("sessionProposals")
        .withIndex("by_session", (q) => q.eq("sessionId", ids.sessionId))
        .collect();
      if (!proposal) {
        throw new Error("Analysis left no proposal");
      }
      await requestRefinement(ctx, {
        proposal,
        text: "Je parlais de l'export, pas d'Enregistrer.",
      });
      const refining = await ctx.db.get(proposal._id);
      if (!refining?.refinement) {
        throw new Error("Refinement did not start");
      }
      return { proposalId: proposal._id, runId: refining.refinement.runId };
    });
    vi.mocked(generateStructured)
      .mockResolvedValueOnce({
        ...analysisOutput.proposals[0],
        need: "Exporter mes réglages",
      })
      .mockResolvedValueOnce({
        targets: [{ element: null, intention: "I1" }],
      });

    await t.action(internal.sessions.ai.analysis_run.runRefinement, refinement);

    const proposal = await reviewedProposal(t, ids);
    expect(proposal?.need).toBe("Exporter mes réglages");
    expect(proposal?.calloutTarget).toEqual({
      element: null,
      evidenceId: ids.screenshotId,
    });
  });

  test("keeps the analysis and the screenshot, without a frame, when locating fails", async () => {
    const t = setupTest();
    const ids = await seedPointedElsewhere(t);
    vi.mocked(generateStructured)
      .mockResolvedValueOnce(analysisOutput)
      .mockRejectedValueOnce(new Error("provider down"));

    const proposal = await analyzeAndReview(t, ids);

    expect(proposal?.need).toBe("Savoir que mes réglages sont enregistrés");
    expect(proposal?.calloutTarget).toEqual({
      element: null,
      evidenceId: ids.screenshotId,
    });
  });
});
