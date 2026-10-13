/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { generateStructured } from "../../../intelligence/structured_output";
import { proposalOutput } from "../../ai/__tests__/ostal_session";
import {
  findContribution,
  type IntentionWorld,
  loadDetail,
  SAVED_NEED,
  seedSpokenPassage,
  setupIntentionWorld,
  startContinuation,
} from "./intention.fixtures";

vi.mock("../../../intelligence/structured_output", () => ({
  generateStructured: vi.fn(),
}));

const QUESTION = "Le message doit-il rester affiché ?";

const change = (overrides: Record<string, unknown>) => ({
  evidence: [],
  field: "unknowns",
  hypothesis: false,
  kind: "precision",
  operation: "add",
  reason: "L'auteur demande si le serveur confirme.",
  segments: ["S1"],
  value: "Le serveur confirme-t-il la sauvegarde ?",
  ...overrides,
});

const comparisonOutput = (changes: Record<string, unknown>[]) => ({
  mergeSuggestions: [],
  proposals: [
    { ...proposalOutput("Exporter mes réglages"), sameNeedAsIntention: null },
    {
      ...proposalOutput("Voir que la sauvegarde a marché"),
      sameNeedAsIntention: "Même besoin que l'intention continuée.",
    },
  ],
  update: { changes, question: QUESTION, verdict: null },
});

async function recordContinuation(world: IntentionWorld) {
  const started = await startContinuation(world.a, {
    intentionId: world.intentionId,
    revision: 2,
  });
  const contribution = await findContribution(world.t, started);
  const segmentId = await seedSpokenPassage(world.t, {
    sessionId: contribution.sessionId,
    startMs: 5000,
    text: "Est-ce que le serveur confirme ? Un toast suffirait.",
  });
  await world.a.post("/api/v1/sessions/collection", {
    action: "end",
    atMs: 10_000,
    sessionId: started,
  });
  return {
    contributionId: contribution._id,
    segmentId,
    sessionB: contribution.sessionId,
  };
}

async function compare(world: IntentionWorld, sessionId: Id<"sessions">) {
  await world.a.post("/api/v1/sessions/analyze", { sessionId });
  const session = await world.t.run((ctx) => ctx.db.get(sessionId));
  const runId = session?.analysis.runId;
  if (runId === undefined) {
    throw new Error("Comparison did not start");
  }
  await world.t.action(internal.sessions.ai.analysis_run.runAnalysis, {
    runId,
    sessionId,
  });
}

const lastCall = () => vi.mocked(generateStructured).mock.lastCall?.[0];

describe("comparing a continuation with its intention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.mocked(generateStructured).mockReset();
  });

  test("shows the AI the intention and keeps only changes backed by a passage", async () => {
    const world = await setupIntentionWorld();
    const recorded = await recordContinuation(world);
    vi.mocked(generateStructured).mockResolvedValueOnce(
      comparisonOutput([
        change({}),
        change({ field: "need", operation: "add", value: "Invalid" }),
        change({ segments: [], value: "Sans source" }),
        change({
          field: "response",
          hypothesis: true,
          kind: "solution",
          operation: "replace",
          value: "Afficher un toast.",
        }),
      ])
    );

    await compare(world, recorded.sessionB);

    expect(lastCall()?.prompt).toContain(
      "The intention this session continues:"
    );
    expect(lastCall()?.prompt).toContain(`Need: ${SAVED_NEED}`);
    expect(lastCall()?.prompt).toContain(
      "[00:01] Ici, je ne sais pas si c'est enregistré."
    );
    const contribution = await findContribution(world.t, recorded.sessionB);
    expect(contribution).toMatchObject({ baseRevision: 2, question: QUESTION });
    expect(
      contribution.changes.map(({ decision, field, segmentIds, value }) => ({
        decision,
        field,
        segmentIds,
        value,
      }))
    ).toEqual([
      {
        decision: "pending",
        field: "unknowns",
        segmentIds: [recorded.segmentId],
        value: "Le serveur confirme-t-il la sauvegarde ?",
      },
      {
        decision: "pending",
        field: "response",
        segmentIds: [recorded.segmentId],
        value: "Afficher un toast.",
      },
    ]);
  });

  test("points a new need that may be the same intention back to it", async () => {
    const world = await setupIntentionWorld();
    const recorded = await recordContinuation(world);
    vi.mocked(generateStructured).mockResolvedValueOnce(comparisonOutput([]));

    await compare(world, recorded.sessionB);

    const detail = await loadDetail(world.a, recorded.sessionB);
    expect(
      detail.proposals.map(({ intentionSuggestion, need }) => ({
        need,
        suggested: intentionSuggestion?.intentionId ?? null,
      }))
    ).toEqual([
      { need: "Exporter mes réglages", suggested: null },
      { need: "Voir que la sauvegarde a marché", suggested: world.intentionId },
    ]);
    expect(detail.continuation?.contribution.state).toBe("ready");
  });

  test("a failed comparison leaves the intention intact and runs again on retry", async () => {
    const world = await setupIntentionWorld();
    const recorded = await recordContinuation(world);
    vi.mocked(generateStructured).mockRejectedValueOnce(
      new Error("AI response was not valid JSON")
    );

    await compare(world, recorded.sessionB);

    const failed = await loadDetail(world.a, recorded.sessionB);
    expect(failed.continuation?.contribution).toMatchObject({
      changes: [],
      state: "failed",
    });
    expect(failed.continuation?.intention).toMatchObject({
      need: SAVED_NEED,
      revision: 2,
    });
    expect(failed.session.analysis.error).toBe(
      "The AI couldn't read this session right now. Try again."
    );

    vi.mocked(generateStructured).mockResolvedValueOnce(
      comparisonOutput([change({})])
    );
    await compare(world, recorded.sessionB);

    const retried = await loadDetail(world.a, recorded.sessionB);
    expect(retried.continuation?.contribution).toMatchObject({
      state: "ready",
    });
    expect(retried.continuation?.contribution.changes).toHaveLength(1);
  });

  test("a new comparison keeps the changes the author already decided", async () => {
    const world = await setupIntentionWorld();
    const recorded = await recordContinuation(world);
    vi.mocked(generateStructured).mockResolvedValueOnce(
      comparisonOutput([
        change({}),
        change({ field: "setAside", value: "Un historique" }),
      ])
    );
    await compare(world, recorded.sessionB);
    const [accepted, rejected] = (
      await findContribution(world.t, recorded.sessionB)
    ).changes;
    await world.a.post("/api/v1/sessions/intentions/accept", {
      changes: [{ changeId: accepted?.id }],
      contributionId: recorded.contributionId,
      expectedRevision: 2,
    });
    await world.a.post("/api/v1/sessions/intentions/change", {
      changeId: rejected?.id,
      contributionId: recorded.contributionId,
      decision: "rejected",
    });
    vi.mocked(generateStructured).mockResolvedValueOnce(
      comparisonOutput([change({ value: "Combien de temps l'afficher ?" })])
    );

    await world.a.post("/api/v1/sessions/intentions/answer", {
      contributionId: recorded.contributionId,
      text: "Oui, trois secondes.",
    });
    const session = await world.t.run((ctx) => ctx.db.get(recorded.sessionB));
    await world.t.action(internal.sessions.ai.analysis_run.runAnalysis, {
      runId: session?.analysis.runId ?? "",
      sessionId: recorded.sessionB,
    });

    expect(lastCall()?.prompt).toContain("Answer: Oui, trois secondes.");
    const contribution = await findContribution(world.t, recorded.sessionB);
    expect(
      contribution.changes.map(({ decision, value }) => ({ decision, value }))
    ).toEqual([
      {
        decision: "accepted",
        value: "Le serveur confirme-t-il la sauvegarde ?",
      },
      { decision: "rejected", value: "Un historique" },
      { decision: "pending", value: "Combien de temps l'afficher ?" },
    ]);
    expect(contribution.baseRevision).toBe(3);
  });

  test("a comparison finishing after the intention was deleted changes nothing", async () => {
    const world = await setupIntentionWorld();
    const recorded = await recordContinuation(world);
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await world.a.post("/api/v1/sessions/proposals/delete", {
        proposalId: world.intentionId,
      });
      return comparisonOutput([change({})]);
    });

    await compare(world, recorded.sessionB);

    const contribution = await findContribution(world.t, recorded.sessionB);
    expect(contribution.changes).toEqual([]);
    expect(contribution.detachedAt).toBeDefined();
  });
});
