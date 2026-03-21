import { query } from "./_generated/server";

/**
 * Get all public organization slugs for sitemap generation.
 */
export const getPublicOrgSlugs = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    return orgs
      .filter((org) => org.isPublic && !org.deletedAt)
      .map((org) => ({
        slug: org.slug,
        updatedAt: org.updatedAt ?? org.createdAt,
      }));
  },
});

/**
 * Get all approved feedback IDs grouped by org slug for sitemap generation.
 */
export const getPublicFeedbackForSitemap = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    const publicOrgs = orgs.filter((org) => org.isPublic && !org.deletedAt);

    const entries: {
      orgSlug: string;
      feedbackId: string;
      updatedAt: number;
    }[] = [];

    for (const org of publicOrgs) {
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      for (const item of feedbackItems) {
        if (item.isApproved && !item.deletedAt) {
          entries.push({
            orgSlug: org.slug,
            feedbackId: item._id,
            updatedAt: item.updatedAt ?? item.createdAt,
          });
        }
      }
    }

    return entries;
  },
});
