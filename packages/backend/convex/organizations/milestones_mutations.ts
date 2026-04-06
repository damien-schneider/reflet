import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

/**
 * Create a new milestone
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.string(),
    timeHorizon: v.union(
      v.literal("now"),
      v.literal("next_month"),
      v.literal("next_quarter"),
      v.literal("half_year"),
      v.literal("next_year"),
      v.literal("future")
    ),
    targetDate: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create milestones");
    }

    // Auto-increment order within the time horizon group
    const existingInHorizon = await ctx.db
      .query("milestones")
      .withIndex("by_org_horizon", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("timeHorizon", args.timeHorizon)
      )
      .collect();

    const maxOrder = existingInHorizon.reduce(
      (max, m) => Math.max(max, m.order),
      -1
    );

    const now = Date.now();
    return ctx.db.insert("milestones", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      emoji: args.emoji,
      color: args.color,
      timeHorizon: args.timeHorizon,
      targetDate: args.targetDate,
      order: maxOrder + 1,
      status: "active",
      isPublic: args.isPublic ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a milestone
 */
export const update = mutation({
  args: {
    id: v.id("milestones"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    timeHorizon: v.optional(
      v.union(
        v.literal("now"),
        v.literal("next_month"),
        v.literal("next_quarter"),
        v.literal("half_year"),
        v.literal("next_year"),
        v.literal("future")
      )
    ),
    targetDate: v.optional(v.number()),
    clearTargetDate: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const milestone = await ctx.db.get(args.id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update milestones");
    }

    const { id, clearTargetDate, ...updates } = args;
    const patchData: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };
    if (clearTargetDate) {
      patchData.targetDate = undefined;
    }
    await ctx.db.patch(id, patchData);

    return id;
  },
});

/**
 * Delete a milestone and all its junction rows
 */
export const remove = mutation({
  args: { id: v.id("milestones") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const milestone = await ctx.db.get(args.id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete milestones");
    }

    // Delete all junction rows
    const junctions = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.id))
      .collect();

    for (const junction of junctions) {
      await ctx.db.delete(junction._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Reorder milestones
 */
export const reorder = mutation({
  args: {
    milestoneIds: v.array(v.id("milestones")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.milestoneIds.length === 0) {
      return true;
    }

    const firstId = args.milestoneIds[0];
    if (!firstId) {
      return true;
    }

    const first = await ctx.db.get(firstId);
    if (!first) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", first.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can reorder milestones");
    }

    const now = Date.now();
    for (let i = 0; i < args.milestoneIds.length; i++) {
      const milestoneId = args.milestoneIds[i];
      if (!milestoneId) {
        continue;
      }
      await ctx.db.patch(milestoneId, {
        order: i,
        updatedAt: now,
      });
    }

    return true;
  },
});

/**
 * Add feedback to a milestone
 */
export const addFeedback = mutation({
  args: {
    milestoneId: v.id("milestones"),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can link feedback to milestones");
    }

    // Check for duplicates
    const existing = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone_feedback", (q) =>
        q.eq("milestoneId", args.milestoneId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return ctx.db.insert("milestoneFeedback", {
      milestoneId: args.milestoneId,
      feedbackId: args.feedbackId,
      addedAt: Date.now(),
      addedBy: user._id,
    });
  },
});

/**
 * Remove feedback from a milestone
 */
export const removeFeedback = mutation({
  args: {
    milestoneId: v.id("milestones"),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can unlink feedback from milestones");
    }

    const junction = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone_feedback", (q) =>
        q.eq("milestoneId", args.milestoneId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (junction) {
      await ctx.db.delete(junction._id);
    }

    return true;
  },
});

/**
 * Mark a milestone as completed
 */
export const complete = mutation({
  args: { id: v.id("milestones") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const milestone = await ctx.db.get(args.id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", milestone.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can complete milestones");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return args.id;
  },
});
