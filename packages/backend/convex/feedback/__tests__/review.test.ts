/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

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
  test("holding low-usefulness feedback removes it from the public board", async () => {
    const { organizationId, t } = await seedOrganization();

    const feedbackId = await t.run(
      async (ctx) =>
        await ctx.db.insert("feedback", {
          commentCount: 0,
          createdAt: Date.now(),
          description: "buy cheap watches",
          isApproved: true,
          isPinned: false,
          organizationId,
          status: "open",
          title: "Promo",
          updatedAt: Date.now(),
          voteCount: 0,
        })
    );

    const before = await t.query(api.feedback.list.listByOrganization, {
      organizationId,
    });
    expect(before.map((item) => item._id)).toContain(feedbackId);

    await t.mutation(internal.feedback.review.holdForReview, { feedbackId });

    const after = await t.query(api.feedback.list.listByOrganization, {
      organizationId,
    });
    expect(after.map((item) => item._id)).not.toContain(feedbackId);
  });

  test("pending review is not readable by anonymous visitors", async () => {
    const { organizationId, t } = await seedOrganization();

    await expect(
      t.query(api.feedback.review.listPendingReview, { organizationId })
    ).rejects.toThrow();
  });
});
