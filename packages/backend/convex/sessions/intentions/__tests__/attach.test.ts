/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { sessionProposalSchema } from "../../../../../sdk/src/sessions/protocol";
import type { Id } from "../../../_generated/dataModel";
import {
  MEMBER_A,
  seedProposal,
  seedSession,
} from "../../__tests__/session.fixtures";
import {
  type IntentionWorld,
  loadDetail,
  setupIntentionWorld,
} from "./intention.fixtures";

const LATER_OBSERVATION = "L'auteur cherchait un retour après Enregistrer.";

async function seedLaterProposal(world: IntentionWorld) {
  return await world.t.run(async (ctx) => {
    const sessionId = await seedSession(ctx, {
      authorId: MEMBER_A.userId,
      organizationId: world.organizationId,
      title: "Later walkthrough",
    });
    const proposalId = await seedProposal(
      ctx,
      { _id: sessionId, organizationId: world.organizationId },
      {
        intentionSuggestion: {
          intentionId: world.intentionId,
          reason: "Même besoin.",
        },
        need: "Voir que la sauvegarde a marché",
        observed: LATER_OBSERVATION,
        unknowns: ["Faut-il un son ?"],
      }
    );
    return { proposalId, sessionId };
  });
}

const intentionOf = (world: IntentionWorld) =>
  world.t.run((ctx) => ctx.db.get(world.intentionId));

const attach = (world: IntentionWorld, proposalId: Id<"sessionProposals">) =>
  world.a.post("/api/v1/sessions/intentions/attach", {
    intentionId: world.intentionId,
    proposalId,
  });

describe("adding a later need to an earlier intention", () => {
  test("folds what was observed into the intention and links both ways", async () => {
    const world = await setupIntentionWorld();
    const later = await seedLaterProposal(world);

    const response = await attach(world, later.proposalId);

    expect(response.status).toBe(200);
    const { proposal } = z
      .object({ proposal: sessionProposalSchema })
      .parse(response.body);
    expect(proposal.attachment?.intentionId).toBe(world.intentionId);
    expect(proposal.intentionSuggestion).toBeNull();
    const intention = await intentionOf(world);
    expect(intention?.observed).toContain(LATER_OBSERVATION);
    expect(intention?.unknowns).toEqual(["Faut-il un son ?"]);
    expect(intention?.revision).toBe(3);
    const history = (await loadDetail(world.a, world.sessionId)).history;
    expect(history.map(({ origin, session }) => [origin, session.id])).toEqual([
      ["attach", later.sessionId],
    ]);
  });

  test("taking it back out restores the intention", async () => {
    const world = await setupIntentionWorld();
    const before = await intentionOf(world);
    const later = await seedLaterProposal(world);
    await attach(world, later.proposalId);
    const detail = await loadDetail(world.a, later.sessionId);
    const contributionId = detail.proposals[0]?.attachment?.contributionId;

    const detached = await world.a.post("/api/v1/sessions/intentions/detach", {
      contributionId,
    });

    expect(detached.status).toBe(200);
    const intention = await intentionOf(world);
    expect(intention?.observed).toBe(before?.observed);
    expect(intention?.unknowns).toEqual([]);
    const after = await loadDetail(world.a, later.sessionId);
    expect(after.proposals[0]?.attachment).toBeNull();
  });

  test("keeps the AI's suggestion from coming back once declined", async () => {
    const world = await setupIntentionWorld();
    const later = await seedLaterProposal(world);

    const kept = await world.a.post(
      "/api/v1/sessions/intentions/keep-separate",
      { proposalId: later.proposalId }
    );

    expect(kept.status).toBe(200);
    const detail = await loadDetail(world.a, later.sessionId);
    expect(detail.proposals[0]?.intentionSuggestion).toBeNull();
    expect((await intentionOf(world))?.revision).toBe(2);
  });

  test("two needs of the same session are merged, not attached", async () => {
    const world = await setupIntentionWorld();
    const sibling = await world.t.run((ctx) =>
      seedProposal(
        ctx,
        { _id: world.sessionId, organizationId: world.organizationId },
        { need: "Autre besoin" }
      )
    );

    const response = await attach(world, sibling);

    expect(response.status).toBe(409);
  });
});
