/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { errorBody } from "../../__tests__/session.fixtures";
import { INTENTION_DELETED } from "../../constants";
import {
  FIRST_RESPONSE,
  findContribution,
  type IntentionWorld,
  loadDetail,
  precision,
  SAVED_NEED,
  seedPendingChanges,
  seedSpokenPassage,
  setupIntentionWorld,
  solutionChange,
  startContinuation,
} from "./intention.fixtures";

const ACCEPT = "/api/v1/sessions/intentions/accept";
const DECIDE = "/api/v1/sessions/intentions/change";

async function continueWithProposedChanges(
  options: { visibility?: "private" | "team" } = {}
) {
  const world = await setupIntentionWorld(options);
  const sessionB = await startContinuation(world.a, {
    intentionId: world.intentionId,
    revision: 2,
  });
  const contribution = await findContribution(world.t, sessionB);
  const segmentId = await seedSpokenPassage(world.t, {
    sessionId: contribution.sessionId,
    startMs: 5000,
    text: "Est-ce que le serveur confirme vraiment ? Un toast suffirait.",
  });
  await seedPendingChanges(world.t, {
    changes: [precision, solutionChange],
    contributionId: contribution._id,
    segmentId,
  });
  return { ...world, contributionId: contribution._id, sessionB };
}

const loadIntention = async (world: IntentionWorld) => {
  const intention = await world.t.run((ctx) => ctx.db.get(world.intentionId));
  if (!intention) {
    throw new Error("Intention missing");
  }
  return intention;
};

describe("continuing an intention in a later session", () => {
  test("applies only the change the author accepts, as one new revision", async () => {
    const world = await continueWithProposedChanges();

    const accepted = await world.a.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });
    const rejected = await world.a.post(DECIDE, {
      changeId: solutionChange.id,
      contributionId: world.contributionId,
      decision: "rejected",
    });

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(200);
    expect(await loadIntention(world)).toMatchObject({
      need: SAVED_NEED,
      response: FIRST_RESPONSE,
      revision: 3,
      unknowns: [precision.value],
    });
    const detail = await loadDetail(world.a, world.sessionB);
    expect(
      detail.continuation?.contribution.changes.map(({ decision }) => decision)
    ).toEqual(["accepted", "rejected"]);
    expect(detail.continuation?.intention?.revision).toBe(3);
  });

  test("shows on the first session which later session changed the intention", async () => {
    const world = await continueWithProposedChanges();
    await world.a.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });

    const detail = await loadDetail(world.a, world.sessionId);

    expect(detail.history).toHaveLength(1);
    expect(detail.history[0]).toMatchObject({
      applied: [
        {
          byName: "Ada",
          fields: [{ after: [precision.value], before: [], field: "unknowns" }],
          revision: 3,
        },
      ],
      extractsHidden: false,
      session: { canOpen: true, id: world.sessionB },
    });
    expect(detail.history[0]?.quotes.map(({ text }) => text)).toEqual([
      "Est-ce que le serveur confirme vraiment ? Un toast suffirait.",
    ]);
  });

  test("accepting the same change twice does not apply it twice", async () => {
    const world = await continueWithProposedChanges();
    const body = {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    };

    await world.a.post(ACCEPT, body);
    const retried = await world.a.post(ACCEPT, body);

    expect(retried.status).toBe(200);
    expect(await loadIntention(world)).toMatchObject({
      revision: 3,
      unknowns: [precision.value],
    });
  });

  test("a rejected change must be brought back before it can be accepted", async () => {
    const world = await continueWithProposedChanges();
    await world.a.post(DECIDE, {
      changeId: solutionChange.id,
      contributionId: world.contributionId,
      decision: "rejected",
    });

    const blocked = await world.a.post(ACCEPT, {
      changes: [{ changeId: solutionChange.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });
    await world.a.post(DECIDE, {
      changeId: solutionChange.id,
      contributionId: world.contributionId,
      decision: "pending",
    });
    const accepted = await world.a.post(ACCEPT, {
      changes: [
        { changeId: solutionChange.id, value: "Afficher « Enregistré »." },
      ],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });

    expect(blocked.status).toBe(409);
    expect(accepted.status).toBe(200);
    expect((await loadIntention(world)).response).toBe(
      "Afficher « Enregistré »."
    );
  });

  test("never overwrites an intention edited elsewhere since the comparison", async () => {
    const world = await continueWithProposedChanges();
    await world.a.post("/api/v1/sessions/proposals/edit", {
      expectedRevision: 2,
      need: "Voir tout de suite que c'est enregistré",
      proposalId: world.intentionId,
    });

    const late = await world.a.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });

    expect(late.status).toBe(409);
    expect((await loadIntention(world)).unknowns).toEqual([]);
    const detail = await loadDetail(world.a, world.sessionB);
    expect(detail.continuation?.contribution.stale).toBe(true);
  });

  test("asks before a private session's words flow into a team intention", async () => {
    const world = await continueWithProposedChanges({ visibility: "team" });
    const body = {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    };

    const withoutConsent = await world.a.post(ACCEPT, body);
    const withConsent = await world.a.post(ACCEPT, {
      ...body,
      shareWithTeam: true,
    });

    expect(withoutConsent.status).toBe(400);
    expect(withConsent.status).toBe(200);
    const detail = await loadDetail(world.b, world.sessionId);
    expect(detail.history[0]).toMatchObject({
      extractsHidden: false,
      session: { canOpen: false, title: "Settings" },
    });
  });

  test("another member can't decide the changes of someone else's session", async () => {
    const world = await continueWithProposedChanges({ visibility: "team" });

    const response = await world.b.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
      shareWithTeam: true,
    });

    expect(response.status).toBe(404);
    expect((await loadIntention(world)).revision).toBe(2);
  });
});

describe("starting a continuation", () => {
  test("records against the revision the author saw, flagged stale when it moved", async () => {
    const world = await setupIntentionWorld();

    const sessionB = await startContinuation(world.a, {
      intentionId: world.intentionId,
      revision: 1,
    });

    const detail = await loadDetail(world.a, sessionB);
    expect(detail.continuation?.contribution).toMatchObject({
      baseRevision: 1,
      stale: true,
    });
  });

  test("records a standalone session when the intention was set aside meanwhile", async () => {
    const world = await setupIntentionWorld();
    await world.t.run((ctx) =>
      ctx.db.patch(world.intentionId, { decision: "dismissed" })
    );

    const sessionB = await startContinuation(world.a, {
      intentionId: world.intentionId,
      revision: 2,
    });

    const detail = await loadDetail(world.a, sessionB);
    expect(detail.session.id).toBe(sessionB);
    expect(detail.continuation).toBeNull();
  });

  test("refuses to continue another organization's intention", async () => {
    const world = await setupIntentionWorld();

    const sessionB = await startContinuation(world.outsider, {
      intentionId: world.intentionId,
      revision: 2,
    });

    const detail = await loadDetail(world.outsider, sessionB);
    expect(detail.continuation).toBeNull();
  });
});

describe("removing either side", () => {
  test("deleting the later session takes its accepted changes back out", async () => {
    const world = await continueWithProposedChanges();
    await world.a.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });

    const deleted = await world.a.post("/api/v1/sessions/delete", {
      sessionId: world.sessionB,
    });

    expect(deleted.status).toBe(200);
    expect(await loadIntention(world)).toMatchObject({
      revision: 4,
      unknowns: [],
    });
    expect((await loadDetail(world.a, world.sessionId)).history).toEqual([]);
  });

  test("deleting the intention leaves the later session saying so", async () => {
    const world = await continueWithProposedChanges();

    const deleted = await world.a.post("/api/v1/sessions/proposals/delete", {
      proposalId: world.intentionId,
    });

    expect(deleted.status).toBe(200);
    const detail = await loadDetail(world.a, world.sessionB);
    expect(detail.continuation?.intention).toBeNull();
    expect(detail.continuation?.contribution.detachedAt).not.toBeNull();
    expect(detail.continuation?.contribution.changes).toEqual([]);
    const accept = await world.a.post(ACCEPT, {
      changes: [{ changeId: precision.id }],
      contributionId: world.contributionId,
      expectedRevision: 2,
    });
    expect(accept.status).toBe(404);
    expect(errorBody.parse(accept.body).error).toBe(INTENTION_DELETED);
  });
});
