import { expect, test } from "vitest";
import { internal } from "../../_generated/api";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

test("reconciliation preserves the fixed lifecycle and historical completion, without guessing localized column meanings", async () => {
  const t = setupTest();
  const { organizationId, backlogId, feedbackId, reopenedId } =
    await seedInconsistentLifecycles(t);
  await expect(
    t.mutation(internal.migrations.feedback_properties.reconcile, {
      cursor: null,
      meanings: [],
      organizationId,
    })
  ).rejects.toThrow("explicit lifecycle meaning");
  const result = await t.mutation(
    internal.migrations.feedback_properties.reconcile,
    {
      cursor: null,
      meanings: [{ semanticStatus: "open", statusId: backlogId }],
      organizationId,
    }
  );
  expect(result).toMatchObject({ inspected: 2, isDone: true, reconciled: 2 });
  const completed = await t.run((ctx) => ctx.db.get(feedbackId));
  expect(completed).toMatchObject({ completedAt: 123, status: "completed" });
  expect(completed?.organizationStatusId).not.toBe(backlogId);
  expect(
    (await t.run((ctx) => ctx.db.get(reopenedId)))?.completedAt
  ).toBeUndefined();
  const preflight = await t.query(
    internal.migrations.feedback_properties.preflight,
    { organizationId }
  );
  expect(preflight.inconsistentFeedbackIds).toEqual([]);
  const repeated = await t.mutation(
    internal.migrations.feedback_properties.reconcile,
    { cursor: null, meanings: [], organizationId }
  );
  expect(repeated.reconciled).toBe(0);
});

function seedInconsistentLifecycles(t: ReturnType<typeof setupTest>) {
  return t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const backlogId = await ctx.db.insert("organizationStatuses", {
      color: "gray",
      createdAt: Date.now(),
      name: "À faire",
      order: 0,
      organizationId,
      updatedAt: Date.now(),
    });
    const feedbackId = await seedFeedback(ctx, organizationId, {
      completedAt: 123,
      organizationStatusId: backlogId,
      status: "completed",
    });
    const reopenedId = await seedFeedback(ctx, organizationId, {
      completedAt: 456,
      organizationStatusId: backlogId,
      status: "open",
    });
    return { backlogId, feedbackId, organizationId, reopenedId };
  });
}
