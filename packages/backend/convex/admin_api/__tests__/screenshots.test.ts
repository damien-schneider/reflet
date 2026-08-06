/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("admin screenshots", () => {
  test("does not list screenshots for feedback in another organization", async () => {
    const t = convexTest(schema, modules);
    const { feedbackId, organizationId } = await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "First org",
        slug: "first-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const otherOrganizationId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Second org",
        slug: "second-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Private report",
        isApproved: true,
        isPinned: false,
        organizationId: otherOrganizationId,
        status: "open",
        title: "Private feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });
      return { feedbackId, organizationId };
    });

    await expect(
      t.query(internal.admin_api.screenshots.listScreenshots, {
        feedbackId,
        organizationId,
      })
    ).rejects.toThrow("Feedback not found");
  });
});
