import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUser } from "./utils";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * List soft-deleted feedback for an organization (admin-only)
 */
export const listDeleted = query({
  args: {
    organizationId: v.id("organizations"),
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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      return [];
    }

    // Get all soft-deleted feedback
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const deletedItems = feedbackItems.filter((f) => f.deletedAt);

    // Sort by deletion date (most recent first)
    deletedItems.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

    const now = Date.now();

    // Enrich with tags and daysRemaining
    return Promise.all(
      deletedItems.map(async (f) => {
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = (
          await Promise.all(
            feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
          )
        ).filter(Boolean);

        const elapsedMs = now - (f.deletedAt ?? 0);
        const daysRemaining = Math.max(
          0,
          Math.ceil((THIRTY_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000))
        );

        return {
          ...f,
          tags,
          daysRemaining,
        };
      })
    );
  },
});

/**
 * Get count of soft-deleted feedback for an organization (admin-only, for sidebar badge)
 */
export const getDeletedCount = query({
  args: {
    organizationId: v.id("organizations"),
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

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      return 0;
    }

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return feedbackItems.filter((f) => f.deletedAt).length;
  },
});
