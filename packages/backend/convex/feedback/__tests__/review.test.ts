/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { applyRecordedTriage } from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { collectPendingReview } from "../review";

const seedOrganization = async () => {
  const t = convexTest(schema, modules);
  const organizationId = await t.run(
    async (ctx) =>
      await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Test Org",
        slug: "test-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
  );

  return { organizationId, t };
};

describe("Feedback review queue", () => {
  test("triage publishes a clean submission and holds a junk one for review", async () => {
    const { organizationId, t } = await seedOrganization();
    const submit = (title: string) =>
      t.run(
        async (ctx) =>
          await ctx.db.insert("feedback", {
            commentCount: 0,
            createdAt: Date.now(),
            description: title,
            isApproved: false,
            isPinned: false,
            organizationId,
            status: "open",
            title,
            updatedAt: Date.now(),
            voteCount: 0,
          })
      );
    const junkId = await submit("buy cheap watches");
    const cleanId = await submit("Export button does nothing");

    await applyRecordedTriage(t, { feedbackId: junkId, junk: 0.99 });
    await applyRecordedTriage(t, { feedbackId: cleanId, junk: 0.01 });

    const board = await t.query(api.feedback.list.listByOrganization, {
      organizationId,
    });
    expect(board.map((item) => item._id)).toEqual([cleanId]);
    const queued = await t.run(
      async (ctx) => await collectPendingReview(ctx, organizationId)
    );
    expect(queued.map((item) => item._id)).toEqual([junkId]);
  });

  test("pending review is not readable by anonymous visitors", async () => {
    const { organizationId, t } = await seedOrganization();

    await expect(
      t.query(api.feedback.review.listPendingReview, { organizationId })
    ).rejects.toThrow();
  });
});
