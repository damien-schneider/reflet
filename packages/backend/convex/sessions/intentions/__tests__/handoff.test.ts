/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { sessionHandoffSchema } from "../../../../../sdk/src/sessions/protocol";
import type { Id } from "../../../_generated/dataModel";
import { MEMBER_A, seedSession } from "../../__tests__/session.fixtures";
import {
  findContribution,
  type IntentionWorld,
  loadDetail,
  precision,
  seedPendingChanges,
  seedSpokenPassage,
  setupIntentionWorld,
  startContinuation,
} from "./intention.fixtures";

const handoffResponse = z.object({
  files: z.array(z.object({ evidenceId: z.string(), name: z.string() })),
  handoff: sessionHandoffSchema,
});

const seedScreenshot = (world: IntentionWorld, sessionId: Id<"sessions">) =>
  world.t.run(async (ctx) =>
    ctx.db.insert("sessionEvidence", {
      atMs: 6000,
      clientKey: `evidence-${sessionId}`,
      createdAt: Date.now(),
      image: {
        bytes: 3,
        height: 800,
        storageId: await ctx.storage.store(new Blob(["png"])),
        width: 1280,
      },
      kind: "screenshot",
      organizationId: world.organizationId,
      sessionId,
      status: "available",
      trigger: "manual",
    })
  );

const handOff = (
  world: IntentionWorld,
  options: { clientKey: string; evidenceIds: string[] }
) =>
  world.a.post("/api/v1/sessions/handoffs", {
    ...options,
    proposalIds: [world.intentionId],
    sessionId: world.sessionId,
  });

async function continueAndAccept(world: IntentionWorld) {
  const started = await startContinuation(world.a, {
    intentionId: world.intentionId,
    revision: 2,
  });
  const contribution = await findContribution(world.t, started);
  const segmentId = await seedSpokenPassage(world.t, {
    sessionId: contribution.sessionId,
    startMs: 5000,
    text: "Est-ce que le serveur confirme vraiment ?",
  });
  const screenshotId = await seedScreenshot(world, contribution.sessionId);
  await seedPendingChanges(world.t, {
    changes: [precision],
    contributionId: contribution._id,
    evidenceIds: [screenshotId],
    segmentId,
  });
  return { contribution, screenshotId };
}

describe("handing off an intention refined across sessions", () => {
  test("exports a new revision of the same need and keeps the earlier brief", async () => {
    const world = await setupIntentionWorld();
    await handOff(world, { clientKey: "brief-1", evidenceIds: [] });
    const { contribution, screenshotId } = await continueAndAccept(world);
    await world.a.post("/api/v1/sessions/intentions/accept", {
      changes: [{ changeId: precision.id }],
      contributionId: contribution._id,
      expectedRevision: 2,
    });

    const second = await handOff(world, {
      clientKey: "brief-2",
      evidenceIds: [screenshotId],
    });

    expect(second.status).toBe(200);
    const { files, handoff } = handoffResponse.parse(second.body);
    expect(files.map(({ evidenceId }) => evidenceId)).toEqual([screenshotId]);
    expect(handoff.brief).toContain(
      `Intention ${world.intentionId} (revision 3)`
    );
    expect(handoff.brief).toContain("Changed since the brief of");
    expect(handoff.brief).toContain('Continued in session "Settings"');
    expect(handoff.brief).toContain(
      "Est-ce que le serveur confirme vraiment ?"
    );
    const { handoffs } = await loadDetail(world.a, world.sessionId);
    expect(
      handoffs.map(({ proposals }) =>
        proposals.map(({ id, revision }) => [id, revision])
      )
    ).toEqual(
      expect.arrayContaining([
        [[world.intentionId, 2]],
        [[world.intentionId, 3]],
      ])
    );
  });

  test("refuses evidence from a session that never contributed to the intention", async () => {
    const world = await setupIntentionWorld();
    const unrelated = await world.t.run((ctx) =>
      seedSession(ctx, {
        authorId: MEMBER_A.userId,
        organizationId: world.organizationId,
      })
    );
    const foreignScreenshot = await seedScreenshot(world, unrelated);

    const response = await handOff(world, {
      clientKey: "brief-foreign",
      evidenceIds: [foreignScreenshot],
    });

    expect(response.status).toBe(404);
  });

  test("refuses evidence from a later session until its changes are accepted", async () => {
    const world = await setupIntentionWorld();
    const { screenshotId } = await continueAndAccept(world);

    const response = await handOff(world, {
      clientKey: "brief-early",
      evidenceIds: [screenshotId],
    });

    expect(response.status).toBe(404);
  });
});
