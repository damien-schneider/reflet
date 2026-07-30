/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("sitemap_public", () => {
  test("getPublicOrgSlugs returns only public orgs", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Public Org",
        slug: "public-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Private Org",
        slug: "private-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
    });

    const result = await t.query(api.sitemap_public.getPublicOrgSlugs, {});
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("public-org");
  });

  test("getPublicOrgSlugs returns empty array when no public orgs", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.sitemap_public.getPublicOrgSlugs, {});
    expect(result).toEqual([]);
  });

  test("getPublicFeedbackForSitemap returns approved feedback from public orgs", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Public Org",
        slug: "public-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Test",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Approved feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Test",
        isApproved: false,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Unapproved feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        deletedAt: Date.now(),
        description: "Test",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Deleted feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });
    });

    const result = await t.query(
      api.sitemap_public.getPublicFeedbackForSitemap,
      {}
    );
    expect(result).toHaveLength(1);
    expect(result[0].orgSlug).toBe("public-org");
  });
});
