import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

const MAX_SITEMAP_ORGS = 500;
const MAX_FEEDBACK_PER_ORG = 200;
const MAX_SITEMAP_FEEDBACK = 5000;

export const getPublicOrgSlugs = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db
      .query("organizations")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(MAX_SITEMAP_ORGS);
    return orgs.map((org) => ({ slug: org.slug, updatedAt: org.createdAt }));
  },
  returns: v.array(v.object({ slug: v.string(), updatedAt: v.number() })),
});

export const getPublicFeedbackForSitemap = query({
  args: {},
  handler: async (ctx) => {
    const publicOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(MAX_SITEMAP_ORGS);

    const entries: {
      feedbackId: Id<"feedback">;
      orgSlug: string;
      updatedAt: number;
    }[] = [];

    for (const org of publicOrgs) {
      const remaining = MAX_SITEMAP_FEEDBACK - entries.length;
      if (remaining <= 0) {
        break;
      }
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_org_approved", (q) =>
          q.eq("organizationId", org._id).eq("isApproved", true)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("deletedAt"), undefined),
            q.neq(q.field("isInternal"), true)
          )
        )
        .take(Math.min(MAX_FEEDBACK_PER_ORG, remaining));

      for (const item of feedbackItems) {
        entries.push({
          feedbackId: item._id,
          orgSlug: org.slug,
          updatedAt: item.updatedAt ?? item.createdAt,
        });
      }
    }

    return entries;
  },
  returns: v.array(
    v.object({
      feedbackId: v.id("feedback"),
      orgSlug: v.string(),
      updatedAt: v.number(),
    })
  ),
});
