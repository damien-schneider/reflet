/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import {
  contextOptionSchema,
  sessionSegmentSchema,
} from "../../../../sdk/src/sessions/protocol";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { generateStructured } from "../../ai/structured_output";
import type { TestContext } from "../../test.helpers";
import { proposalOutput } from "../ai/__tests__/ostal_session";
import {
  MEMBER_A,
  seedSession,
  setupSessionWorld,
  testFrame,
} from "./session.fixtures";

vi.mock("../../ai/structured_output", () => ({
  generateStructured: vi.fn(),
}));

const CONTEXT = "/api/v1/sessions/segments/context";
const segmentResponse = z.object({ segment: sessionSegmentSchema });
const choicesResponse = z.object({ options: z.array(contextOptionSchema) });

const screenshotAt = async (
  t: TestContext,
  options: { atMs: number; sessionId: Id<"sessions"> }
) =>
  await t.run(async (ctx) => {
    const session = await ctx.db.get(options.sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    return await ctx.db.insert("sessionEvidence", {
      atMs: options.atMs,
      clientKey: `evidence-${options.atMs}-${options.sessionId}`,
      createdAt: Date.now(),
      frame: { ...testFrame, title: `Screen at ${options.atMs}` },
      image: {
        bytes: 3,
        height: 800,
        storageId: await ctx.storage.store(new Blob(["png"])),
        width: 1280,
      },
      kind: "screenshot",
      organizationId: session.organizationId,
      sessionId: session._id,
      status: "available",
      trigger: "navigation",
    });
  });

async function seedHerePassage() {
  const world = await setupSessionWorld();
  const sessionId = await world.t.run((ctx) =>
    seedSession(ctx, {
      authorId: MEMBER_A.userId,
      organizationId: world.organizationId,
    })
  );
  const segmentId = await world.t.run((ctx) =>
    ctx.db.insert("sessionSegments", {
      clientKey: "segment-here",
      createdAt: Date.now(),
      endMs: 13_000,
      organizationId: world.organizationId,
      revision: 1,
      sessionId,
      source: "voice",
      startMs: 10_000,
      text: "Ici, je ne sais pas si c'est enregistré.",
      textOrigin: "transcription",
      transcription: { attempts: 0, state: "done", updatedAt: Date.now() },
      updatedAt: Date.now(),
    })
  );
  const earlier = await screenshotAt(world.t, { atMs: 2000, sessionId });
  const nearby = await screenshotAt(world.t, { atMs: 11_000, sessionId });
  return { ...world, earlier, nearby, segmentId, sessionId };
}

describe("correcting what a passage refers to", () => {
  test("offers the moments around the passage and pins the one the author picks", async () => {
    const world = await seedHerePassage();

    const choices = choicesResponse.parse(
      (
        await world.a.get(
          `/api/v1/sessions/segments/context-choices?segmentId=${world.segmentId}`
        )
      ).body
    );
    const picked = await world.a.post(CONTEXT, {
      choice: { evidenceId: world.earlier, kind: "evidence" },
      expectedRevision: 1,
      segmentId: world.segmentId,
    });

    expect(
      choices.options.map(({ choice }) =>
        choice.kind === "evidence" ? choice.evidenceId : choice.kind
      )
    ).toEqual([world.earlier, world.nearby]);
    expect(picked.status).toBe(200);
    const { segment } = segmentResponse.parse(picked.body);
    expect(segment).toMatchObject({ contextOrigin: "human", revision: 2 });
    expect(segment.context.map(({ evidenceId }) => evidenceId)).toEqual([
      world.earlier,
    ]);
  });

  test("records that nothing captured explains the passage, then goes back to automatic", async () => {
    const world = await seedHerePassage();

    const unknown = segmentResponse.parse(
      (
        await world.a.post(CONTEXT, {
          choice: { kind: "unknown" },
          expectedRevision: 1,
          segmentId: world.segmentId,
        })
      ).body
    ).segment;
    const automatic = segmentResponse.parse(
      (
        await world.a.post(CONTEXT, {
          choice: { kind: "auto" },
          expectedRevision: 2,
          segmentId: world.segmentId,
        })
      ).body
    ).segment;

    expect(unknown).toMatchObject({ context: [], contextOrigin: "unknown" });
    expect(automatic).toMatchObject({
      contextCorrectedAt: null,
      contextOrigin: "auto",
    });
  });

  test("refuses a correction based on an outdated passage", async () => {
    const world = await seedHerePassage();

    const response = await world.a.post(CONTEXT, {
      choice: { kind: "unknown" },
      expectedRevision: 0,
      segmentId: world.segmentId,
    });

    expect(response.status).toBe(409);
  });

  test("never pins a screenshot from another session", async () => {
    const world = await seedHerePassage();
    const otherSession = await world.t.run((ctx) =>
      seedSession(ctx, {
        authorId: MEMBER_A.userId,
        organizationId: world.organizationId,
      })
    );
    const foreign = await screenshotAt(world.t, {
      atMs: 10_000,
      sessionId: otherSession,
    });

    const response = await world.a.post(CONTEXT, {
      choice: { evidenceId: foreign, kind: "evidence" },
      expectedRevision: 1,
      segmentId: world.segmentId,
    });

    expect(response.status).toBe(404);
  });

  test("only the author can correct a passage", async () => {
    const world = await seedHerePassage();
    const body = {
      choice: { kind: "unknown" },
      expectedRevision: 1,
      segmentId: world.segmentId,
    };

    const teammate = await world.b.post(CONTEXT, body);
    const outsider = await world.outsider.post(CONTEXT, body);

    expect(teammate.status).toBe(404);
    expect(outsider.status).toBe(404);
  });
});

describe("a correction made while the AI reads the session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.mocked(generateStructured).mockReset();
  });

  test("wins over the AI result computed before it", async () => {
    const world = await seedHerePassage();
    await world.a.post("/api/v1/sessions/analyze", {
      sessionId: world.sessionId,
    });
    vi.mocked(generateStructured).mockImplementationOnce(async () => {
      await world.a.post(CONTEXT, {
        choice: { evidenceId: world.earlier, kind: "evidence" },
        expectedRevision: 1,
        segmentId: world.segmentId,
      });
      return { mergeSuggestions: [], proposals: [proposalOutput("Besoin")] };
    });
    const session = await world.t.run((ctx) => ctx.db.get(world.sessionId));

    await world.t.action(internal.sessions.ai.analysis_run.runAnalysis, {
      runId: session?.analysis.runId ?? "",
      sessionId: world.sessionId,
    });

    const after = await world.t.run((ctx) => ctx.db.get(world.sessionId));
    expect(after?.analysis).toMatchObject({
      error: "The transcript changed during the analysis. Analyze again.",
      state: "failed",
    });
    const segment = await world.t.run((ctx) => ctx.db.get(world.segmentId));
    expect(segment?.contextCorrection?.choice).toEqual({
      evidenceId: world.earlier,
      kind: "evidence",
    });
  });
});
