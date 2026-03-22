/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testSchema = schema as any;

describe("sitemap_public", () => {
  test("getPublicOrgSlugs returns only public orgs", async () => {
    const t = convexTest(testSchema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        name: "Public Org",
        slug: "public-org",
        isPublic: true,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
      await ctx.db.insert("organizations", {
        name: "Private Org",
        slug: "private-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const result = await t.query(api.sitemap_public.getPublicOrgSlugs, {});
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("public-org");
  });

  test("getPublicOrgSlugs returns empty array when no public orgs", async () => {
    const t = convexTest(testSchema, modules);

    const result = await t.query(api.sitemap_public.getPublicOrgSlugs, {});
    expect(result).toEqual([]);
  });

  test("getPublicFeedbackForSitemap returns approved feedback from public orgs", async () => {
    const t = convexTest(testSchema, modules);

    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Public Org",
        slug: "public-org",
        isPublic: true,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Approved feedback",
        description: "Test",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Unapproved feedback",
        description: "Test",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: false,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Deleted feedback",
        description: "Test",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: Date.now(),
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
