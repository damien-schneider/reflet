/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  handoffFileSchema,
  sessionDetailSchema,
  sessionEvidenceSchema,
  sessionHandoffSchema,
  sessionProposalSchema,
} from "../../../../sdk/src/sessions/protocol";
import { internal } from "../../_generated/api";
import {
  pngBlob,
  type SessionClient,
  setupSessionWorld,
  startSession,
  storeUpload,
  testFrame,
} from "./session.fixtures";

const proposalResponse = z.object({ proposal: sessionProposalSchema });
const handoffResponse = z.object({
  files: z.array(handoffFileSchema),
  handoff: sessionHandoffSchema,
});

async function createProposal(
  client: SessionClient,
  options: { clientKey: string; need: string; sessionId: string }
) {
  const response = await client.post(
    "/api/v1/sessions/proposals/create",
    options
  );
  return proposalResponse.parse(response.body).proposal;
}

async function keep(client: SessionClient, proposalId: string) {
  const response = await client.post("/api/v1/sessions/proposals/decide", {
    decision: "kept",
    proposalId,
  });
  return proposalResponse.parse(response.body).proposal;
}

describe("session review", () => {
  test("creating a proposal replays, deciding is idempotent and keeping creates no feedback", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const options = { clientKey: "p-1", need: "Keep the cart", sessionId };
    const created = await createProposal(a, options);
    expect((await createProposal(a, options)).id).toBe(created.id);

    const kept = await keep(a, created.id);
    const keptAgain = await keep(a, created.id);
    expect(kept.decision).toBe("kept");
    expect(keptAgain.updatedAt).toBe(kept.updatedAt);
    const rows = await t.run(async (ctx) => ({
      feedback: await ctx.db.query("feedback").collect(),
      proposals: await ctx.db.query("sessionProposals").collect(),
    }));
    expect(rows.proposals).toHaveLength(1);
    expect(rows.feedback).toEqual([]);
  });

  test("editing needs the current revision", async () => {
    const { a } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const created = await createProposal(a, {
      clientKey: "p-1",
      need: "Keep the cart",
      sessionId,
    });
    const edit = (expectedRevision: number) =>
      a.post("/api/v1/sessions/proposals/edit", {
        expectedRevision,
        need: "Keep the cart across devices",
        proposalId: created.id,
        response: null,
        unknowns: ["Which devices?"],
      });

    const edited = proposalResponse.parse(
      (await edit(created.revision)).body
    ).proposal;
    expect(edited).toMatchObject({
      need: "Keep the cart across devices",
      revision: created.revision + 1,
      unknowns: ["Which devices?"],
    });
    expect((await edit(created.revision)).status).toBe(409);
  });

  test("merging folds the sources into the target", async () => {
    const { a } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const target = await createProposal(a, {
      clientKey: "p-1",
      need: "Keep the cart",
      sessionId,
    });
    const source = await createProposal(a, {
      clientKey: "p-2",
      need: "Save cart",
      sessionId,
    });

    const merged = proposalResponse.parse(
      (
        await a.post("/api/v1/sessions/proposals/merge", {
          sourceIds: [source.id],
          targetId: target.id,
        })
      ).body
    ).proposal;
    expect(merged.revision).toBe(target.revision + 1);
    const detail = sessionDetailSchema.parse(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).body
    );
    expect(
      detail.proposals.find((proposal) => proposal.id === source.id)
        ?.mergedIntoId
    ).toBe(target.id);
    expect(detail.session.counts.proposals).toBe(1);
  });

  test("handoffs only take kept proposals and evidence of the same session, and replay", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const otherSessionId = await startSession(a, "session-2");
    const proposal = await createProposal(a, {
      clientKey: "p-1",
      need: "Keep the cart",
      sessionId,
    });
    const evidence = z.object({ evidence: sessionEvidenceSchema }).parse(
      (
        await a.post("/api/v1/sessions/evidence", {
          atMs: 1000,
          clientKey: "e-1",
          frame: testFrame,
          image: {
            height: 10,
            storageId: await storeUpload(t, pngBlob()),
            width: 10,
          },
          sessionId,
          trigger: "mark",
        })
      ).body
    ).evidence;
    const foreignEvidence = z.object({ evidence: sessionEvidenceSchema }).parse(
      (
        await a.post("/api/v1/sessions/evidence", {
          atMs: 1000,
          clientKey: "e-2",
          frame: testFrame,
          sessionId: otherSessionId,
          trigger: "manual",
        })
      ).body
    ).evidence;
    const handoff = (clientKey: string, evidenceIds: string[]) =>
      a.post("/api/v1/sessions/handoffs", {
        clientKey,
        evidenceIds,
        proposalIds: [proposal.id],
        sessionId,
      });

    expect((await handoff("h-0", [evidence.id])).status).toBe(409);
    await keep(a, proposal.id);
    expect((await handoff("h-0", [foreignEvidence.id])).status).toBe(404);

    const first = handoffResponse.parse(
      (await handoff("h-1", [evidence.id])).body
    );
    const replay = handoffResponse.parse(
      (await handoff("h-1", [evidence.id])).body
    );
    expect(replay.handoff.id).toBe(first.handoff.id);
    expect(first.handoff.proposals).toEqual([
      { id: proposal.id, need: "Keep the cart", revision: proposal.revision },
    ]);
    expect(first.files.map((file) => file.evidenceId)).toEqual([evidence.id]);
    expect(first.handoff.brief).toContain("Keep the cart");

    for (let index = 0; index < 22; index += 1) {
      await a.post("/api/v1/sessions/handoffs/delivered", {
        handoffId: first.handoff.id,
        kind: "copied",
      });
    }
    const detail = sessionDetailSchema.parse(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).body
    );
    expect(detail.handoffs).toHaveLength(1);
    expect(detail.handoffs[0]?.deliveries).toHaveLength(20);
    expect(detail.proposals[0]?.handedOffRevision).toBe(proposal.revision);
  });

  test("internal feedback from a proposal is created once and agents never take it", async () => {
    const { a, organizationId, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const proposal = await createProposal(a, {
      clientKey: "p-1",
      need: "Keep the cart",
      sessionId,
    });
    await keep(a, proposal.id);
    const materialize = async () =>
      z.object({ created: z.boolean(), feedbackId: z.string() }).parse(
        (
          await a.post("/api/v1/sessions/proposals/feedback", {
            proposalId: proposal.id,
          })
        ).body
      );

    const first = await materialize();
    const replay = await materialize();
    expect(first.created).toBe(true);
    expect(replay).toEqual({ created: false, feedbackId: first.feedbackId });

    const feedback = await t.run((ctx) => ctx.db.query("feedback").collect());
    expect(feedback).toHaveLength(1);
    expect(feedback[0]).toMatchObject({
      authorId: "user-a",
      isInternal: true,
      sessionProposalId: proposal.id,
      title: "Keep the cart",
    });
    const queue = await t.query(internal.feedback.agent_queue.nextFeedback, {
      organizationId,
    });
    expect(queue).toEqual([]);
    const feedbackId = feedback[0]?._id;
    if (!feedbackId) {
      throw new Error("Feedback missing");
    }
    await expect(
      t.mutation(internal.feedback.agent_queue.claimFeedback, {
        claimedBy: "agent-1",
        feedbackId,
        organizationId,
      })
    ).rejects.toThrow("Feedback not found");
  });
});
