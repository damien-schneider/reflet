import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUser } from "./utils";

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new tag
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create tags");
    }

    // Get max lane order if this is a roadmap lane
    let laneOrder: number | undefined;
    if (args.isRoadmapLane) {
      const existingLanes = await ctx.db
        .query("tags")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("isRoadmapLane"), true))
        .collect();

      const maxOrder = existingLanes.reduce(
        (max, lane) => Math.max(max, lane.laneOrder ?? 0),
        0
      );
      laneOrder = maxOrder + 1;
    }

    const tagId = await ctx.db.insert("tags", {
      organizationId: args.organizationId,
      name: args.name,
      color: args.color,
      isDoneStatus: args.isDoneStatus ?? false,
      isRoadmapLane: args.isRoadmapLane ?? false,
      laneOrder,
      createdAt: Date.now(),
    });

    return tagId;
  },
});

/**
 * Update a tag
 */
export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update tags");
    }

    // Handle lane order if becoming a roadmap lane
    const updates: Partial<typeof tag> = {};

    if (args.isRoadmapLane && !tag.isRoadmapLane) {
      const existingLanes = await ctx.db
        .query("tags")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", tag.organizationId)
        )
        .filter((q) => q.eq(q.field("isRoadmapLane"), true))
        .collect();

      const maxOrder = existingLanes.reduce(
        (max, lane) => Math.max(max, lane.laneOrder ?? 0),
        0
      );
      updates.laneOrder = maxOrder + 1;
    } else if (args.isRoadmapLane === false && tag.isRoadmapLane) {
      updates.laneOrder = undefined;
    }

    const { id, ...otherUpdates } = args;
    await ctx.db.patch(id, { ...otherUpdates, ...updates });

    return id;
  },
});

/**
 * Reorder roadmap lanes
 */
export const reorderLanes = mutation({
  args: {
    organizationId: v.id("organizations"),
    laneIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can reorder lanes");
    }

    // Update lane orders
    for (let i = 0; i < args.laneIds.length; i++) {
      const laneId = args.laneIds[i];
      if (laneId) {
        await ctx.db.patch(laneId, { laneOrder: i });
      }
    }

    return true;
  },
});

/**
 * Delete a tag
 */
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", tag.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete tags");
    }

    // Remove tag from all feedback
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    for (const ft of feedbackTags) {
      await ctx.db.delete(ft._id);
    }

    // Clear roadmapLane on feedback using this tag
    if (tag.isRoadmapLane) {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", tag.organizationId)
        )
        .filter((q) => q.eq(q.field("roadmapLane"), args.id))
        .collect();

      for (const f of feedback) {
        await ctx.db.patch(f._id, { roadmapLane: undefined });
      }
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Add a tag to feedback
 */
export const addToFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Verify tag belongs to same org
    if (tag.organizationId !== feedback.organizationId) {
      throw new Error("Tag does not belong to this organization");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can add tags to feedback");
    }

    // Check if already added
    const existing = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert("feedbackTags", {
      feedbackId: args.feedbackId,
      tagId: args.tagId,
    });

    return id;
  },
});

/**
 * Remove a tag from feedback
 */
export const removeFromFeedback = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove tags from feedback");
    }

    const feedbackTag = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (feedbackTag) {
      await ctx.db.delete(feedbackTag._id);
    }

    return true;
  },
});
