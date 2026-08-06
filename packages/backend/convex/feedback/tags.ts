import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

// Helper to generate slug from name
const DEFAULT_TAGS = [
  {
    color: "#3b82f6",
    description: "New feature suggestions and ideas",
    name: "Feature Request",
    slug: "feature-request",
  },
  {
    color: "#ef4444",
    description: "Issues and problems to be fixed",
    name: "Bug Report",
    slug: "bug-report",
  },
  {
    color: "#8b5cf6",
    description: "Improvements to existing features",
    name: "Enhancement",
    slug: "enhancement",
  },
  {
    color: "#f59e0b",
    description: "Questions and support requests",
    name: "Question",
    slug: "question",
  },
] as const;

// ============================================
// QUERIES
// ============================================

/**
 * List all tags for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
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
    const user = await authComponent.safeGetAuthUser(ctx);

    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    if (!(isMember || org.isPublic)) {
      return null;
    }

    return tag;
  },
});

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

export const createDefaults = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Check if tags already exist
    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existingTags) {
      return []; // Already initialized
    }

    const now = Date.now();
    const tagIds: string[] = [];

    for (const tag of DEFAULT_TAGS) {
      const id = await ctx.db.insert("tags", {
        color: tag.color,
        createdAt: now,
        description: tag.description,
        name: tag.name,
        organizationId: args.organizationId,
        slug: tag.slug,
        updatedAt: now,
      });
      tagIds.push(id);
    }

    return tagIds;
  },
});
