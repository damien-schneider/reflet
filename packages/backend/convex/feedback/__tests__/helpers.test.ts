/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("release_ai_matching_helpers", () => {
  test("getReleaseAndFeedback returns null for missing release", async () => {
    const t = convexTest(schema, modules);

    const fakeId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const id = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "Release",
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t.query(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId: fakeId }
    );
    expect(result).toBeNull();
  });

  test("getReleaseAndFeedback excludes already linked feedback", async () => {
    const t = convexTest(schema, modules);

    const releaseId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test",
        slug: "test",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const linkedFeedback = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Already linked to release",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Already linked",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Not linked yet",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Unlinked feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      const rId = await ctx.db.insert("releases", {
        createdAt: Date.now(),
        organizationId: orgId,
        title: "Release",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("releaseFeedback", {
        createdAt: Date.now(),
        feedbackId: linkedFeedback,
        releaseId: rId,
      });

      return rId;
    });

    const result = await t.query(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId }
    );
    expect(result).not.toBeNull();
    expect(result?.feedbackItems).toHaveLength(1);
    expect(result?.feedbackItems[0].title).toBe("Unlinked feedback");
  });
});
