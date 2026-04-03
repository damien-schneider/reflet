import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * List all keywords for an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const keywords = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return keywords.sort((a, b) => a.keyword.localeCompare(b.keyword));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Add a new keyword
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    keyword: v.string(),
    source: v.union(v.literal("reddit"), v.literal("web"), v.literal("both")),
    subreddit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can add keywords");
    }

    // Check for duplicates (same keyword + source + subreddit for same org)
    const existing = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const isDuplicate = existing.some(
      (k) =>
        k.keyword === args.keyword.trim() &&
        k.source === args.source &&
        k.subreddit === args.subreddit
    );

    if (isDuplicate) {
      throw new Error(
        "This keyword already exists with the same source and subreddit"
      );
    }

    const keywordId = await ctx.db.insert("intelligenceKeywords", {
      organizationId: args.organizationId,
      keyword: args.keyword.trim(),
      source: args.source,
      subreddit: args.subreddit?.trim() || undefined,
      createdAt: Date.now(),
    });

    return keywordId;
  },
});

/**
 * Update keyword fields
 */
export const update = mutation({
  args: {
    id: v.id("intelligenceKeywords"),
    keyword: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("reddit"), v.literal("web"), v.literal("both"))
    ),
    subreddit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Keyword not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", existing.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update keywords");
    }

    const updates: Record<string, unknown> = {};

    if (args.keyword !== undefined) {
      updates.keyword = args.keyword.trim();
    }
    if (args.source !== undefined) {
      updates.source = args.source;
    }
    if (args.subreddit !== undefined) {
      updates.subreddit = args.subreddit.trim() || undefined;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a keyword by ID
 */
export const remove = mutation({
  args: { id: v.id("intelligenceKeywords") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const keyword = await ctx.db.get(args.id);
    if (!keyword) {
      throw new Error("Keyword not found");
    }

    // Check admin permission and verify org ownership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", keyword.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove keywords");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
