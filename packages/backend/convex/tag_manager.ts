import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

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

    // Sort by laneOrder for roadmap lanes, then by name
    return tags.sort((a, b) => {
      if (a.isRoadmapLane && b.isRoadmapLane) {
        return (a.laneOrder ?? 0) - (b.laneOrder ?? 0);
      }
      if (a.isRoadmapLane) {
        return -1;
      }
      if (b.isRoadmapLane) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Get roadmap lanes (tags configured as lanes)
 */
export const getRoadmapLanes = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isRoadmapLane"), true))
      .collect();

    return tags.sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));
  },
});

/**
 * Get roadmap configuration (lanes for display)
 * Returns { lanes: Tag[] } for compatibility with roadmap page
 */
export const getRoadmapConfig = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isRoadmapLane"), true))
      .collect();

    const lanes = tags.sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0));

    return { lanes };
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
