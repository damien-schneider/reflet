import { expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";

const admin = { _id: "admin", email: "admin@test.example", name: "Admin" };
async function submission() {
  const t = setupTest({ authUsers: [admin] });
  const organizationId = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "admin",
      userId: admin._id,
    });
    return organizationId;
  });
  const { feedbackId } = await t.mutation(
    internal.feedback.api_public_write.createFeedbackByOrganization,
    { description: "", organizationId, title: "i" }
  );
  const member = t.withIdentity({ sessionId: admin._id, subject: admin._id });
  return { feedbackId, member, organizationId, t };
}
async function startRun(t: TestContext, feedbackId: Id<"feedback">) {
  const feedback = await t.run((ctx) => ctx.db.get(feedbackId));
  if (!feedback) {
    throw new Error("Feedback not found");
  }
  return t.mutation(internal.feedback.triage_runs.start, {
    applyModeration: true,
    feedbackId,
    input: { description: feedback.description, title: feedback.title },
    tags: [],
  });
}
const completeRun = (
  t: TestContext,
  runId: Id<"feedbackTriageRuns">,
  junk: number
) =>
  t.mutation(internal.feedback.triage_runs.complete, {
    answers: [
      { probability: junk, questionId: "junk" },
      { probability: 0.9, questionId: "needsReview" },
      { probability: 0.01, questionId: "usefulness" },
    ],
    junk,
    needsReview: 0.9,
    runId,
    tagIds: [],
    usefulness: 0.01,
  });

test("a new submission stays private before triage; suspected filler is a recommendation and stays pending without archiving", async () => {
  const { t, feedbackId, organizationId } = await submission();
  expect(
    await t.query(api.feedback.list.listByOrganization, { organizationId })
  ).toEqual([]);
  const runId = await startRun(t, feedbackId);
  await completeRun(t, runId, 0.99);
  const feedback = await t.run((ctx) => ctx.db.get(feedbackId));
  expect(feedback).toMatchObject({ aiJunk: 0.99, isApproved: false });
  expect(feedback?.deletedAt).toBeUndefined();
  expect(
    await t.query(api.feedback.queries.get, { id: feedbackId })
  ).toBeNull();
  const run = await t.run((ctx) => ctx.db.get(runId));
  expect(run?.publicationDecision).toContain("review");
});
test("human approval publishes suspected filler and survives a later high-junk result", async () => {
  const { t, member, feedbackId, organizationId } = await submission();
  await completeRun(t, await startRun(t, feedbackId), 0.99);
  await member.mutation(api.feedback.publication.setState, {
    feedbackId,
    state: "approved",
  });
  await completeRun(t, await startRun(t, feedbackId), 0.99);
  expect(
    await t.query(api.feedback.list.listByOrganization, { organizationId })
  ).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.get(feedbackId))).toMatchObject({
    isApproved: true,
    publicationReviewedBy: admin._id,
  });
});
test("human rejection archives the feedback with the existing restorable deletion mechanism and later triage cannot restore it", async () => {
  const { t, member, feedbackId, organizationId } = await submission();
  const inFlight = await startRun(t, feedbackId);
  await member.mutation(api.feedback.publication.setState, {
    feedbackId,
    state: "rejected",
  });
  expect(await completeRun(t, inFlight, 0.01)).toBe(false);
  const feedback = await t.run((ctx) => ctx.db.get(feedbackId));
  expect(feedback?.deletedAt).toBeTypeOf("number");
  expect(feedback?.publicationRejectedAt).toBeTypeOf("number");
  expect(
    await member.query(api.feedback.list.listByOrganization, { organizationId })
  ).toEqual([]);
  await member.mutation(api.feedback.actions.restore, { id: feedbackId });
  expect(await t.run((ctx) => ctx.db.get(feedbackId))).toMatchObject({
    isApproved: false,
  });
  expect(
    await t.query(api.feedback.list.listByOrganization, { organizationId })
  ).toEqual([]);
});
test("a non-suspect result follows the organization's existing automatic approval policy", async () => {
  const { t, feedbackId, organizationId } = await submission();
  const runId = await startRun(t, feedbackId);
  await completeRun(t, runId, 0.01);
  expect(
    (await t.run((ctx) => ctx.db.get(runId)))?.publicationDecision
  ).toContain("approved");
  expect(
    await t.query(api.feedback.list.listByOrganization, { organizationId })
  ).toHaveLength(1);
});
test("edited input and superseded runs cannot apply obsolete scores", async () => {
  const { t, feedbackId } = await submission();
  const oldRun = await startRun(t, feedbackId);
  const currentRun = await startRun(t, feedbackId);
  expect(await completeRun(t, oldRun, 0.01)).toBe(false);
  await t.run((ctx) =>
    ctx.db.patch(feedbackId, { description: "New content" })
  );
  expect(await completeRun(t, currentRun, 0.99)).toBe(false);
  expect(
    (await t.run((ctx) => ctx.db.get(feedbackId)))?.aiJunk
  ).toBeUndefined();
});
