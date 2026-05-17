import { v } from "convex/values";
import { query } from "../_generated/server";
import { isOrgReader } from "../shared/access";

// ============================================
// QUERIES
// ============================================

/**
 * List all tags for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    if (!(await isOrgReader(ctx, org))) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sort alphabetically by name
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get a tag by organization and slug (for public pages)
 */
export const getBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    const tag = await ctx.db
      .query("tags")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug)
      )
      .unique();

    if (!tag) {
      return null;
    }

    // Tags are accessible if org is public or user is a member
    if (!(await isOrgReader(ctx, org))) {
      return null;
    }

    return tag;
  },
});

/**
 * List public tags for an organization (returns all tags if org is public)
 */
export const listPublic = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org?.isPublic) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return tags.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get tags for a specific feedback item
 */
export const getForFeedback = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => {
        const tag = await ctx.db.get(ft.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});
