import { expect, test } from "vitest";
import { internal } from "../../_generated/api";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

test("a category deleted while JEV runs is not recorded as applied", async () => {
  const t = setupTest();
  const { feedbackId, tagId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const feedbackId = await seedFeedback(ctx, organizationId);
    const tagId = await ctx.db.insert("tags", {
      color: "red",
      createdAt: Date.now(),
      name: "Bug",
      organizationId,
      slug: "bug",
    });
    return { feedbackId, tagId };
  });
  const runId = await t.mutation(internal.feedback.triage_runs.start, {
    feedbackId,
    input: {
      description: "Clicking save loses the draft",
      title: "Draft lost on save",
    },
    tags: [{ _id: tagId, name: "Bug" }],
  });
  await t.run((ctx) => ctx.db.delete(tagId));
  await t.mutation(internal.feedback.triage_runs.complete, {
    answers: [
      { probability: 0, questionId: "junk" },
      { probability: 0, questionId: "needsReview" },
      { probability: 1, questionId: "usefulness" },
      { probability: 0.99, questionId: `tag:${tagId}` },
    ],
    junk: 0,
    needsReview: 0,
    runId,
    tagIds: [tagId],
    usefulness: 1,
  });
  const run = await t.run((ctx) => ctx.db.get(runId));
  expect(run?.suggestions).toMatchObject([{ outcome: "not_selected", tagId }]);
  expect(await t.run((ctx) => ctx.db.query("feedbackTags").collect())).toEqual(
    []
  );
});
