import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

const TIME_HORIZON_ORDER = [
  "now",
  "next_month",
  "next_quarter",
  "half_year",
  "next_year",
  "future",
] as const;

function getHorizonSortIndex(horizon: string): number {
  const index = TIME_HORIZON_ORDER.indexOf(
    horizon as (typeof TIME_HORIZON_ORDER)[number]
  );
  return index === -1 ? TIME_HORIZON_ORDER.length : index;
}

/**
 * List all active milestones for an organization with computed progress
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

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
      return [];
    }

    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Also include completed milestones
    const completedMilestones = await ctx.db
      .query("milestones")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    const allMilestones = [...milestones, ...completedMilestones];

    // Filter by public visibility for non-members
    const visibleMilestones = isMember
      ? allMilestones
      : allMilestones.filter((m) => m.isPublic);

    // Compute progress for each milestone
    const milestonesWithProgress = await Promise.all(
      visibleMilestones.map(async (milestone) => {
        const junctions = await ctx.db
          .query("milestoneFeedback")
          .withIndex("by_milestone", (q) => q.eq("milestoneId", milestone._id))
          .collect();

        const feedbackItems = await Promise.all(
          junctions.map(async (j) => {
            const fb = await ctx.db.get(j.feedbackId);
            if (!fb) {
              return null;
            }
            return {
              _id: fb._id,
              title: fb.title,
              status: fb.status,
              voteCount: fb.voteCount,
              organizationStatusId: fb.organizationStatusId,
            };
          })
        );

        const validFeedback = feedbackItems.filter(Boolean);
        const total = validFeedback.length;
        const completed = validFeedback.filter(
          (f) => f?.status === "completed"
        ).length;
        const inProgress = validFeedback.filter(
          (f) => f?.status === "in_progress"
        ).length;

        return {
          ...milestone,
          progress: {
            total,
            completed,
            inProgress,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
          feedbackPreview: validFeedback.slice(0, 3),
        };
      })
    );

    // Sort by time horizon order, then by order within group
    return milestonesWithProgress.sort((a, b) => {
      const horizonDiff =
        getHorizonSortIndex(a.timeHorizon) - getHorizonSortIndex(b.timeHorizon);
      if (horizonDiff !== 0) {
        return horizonDiff;
      }
      return a.order - b.order;
    });
  },
});

/**
 * Get a single milestone with full linked feedback items
 */
export const get = query({
  args: { id: v.id("milestones") },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.id);
    if (!milestone) {
      return null;
    }

    const junctions = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.id))
      .collect();

    const feedbackItems = await Promise.all(
      junctions.map(async (j) => {
        const fb = await ctx.db.get(j.feedbackId);
        if (!fb) {
          return null;
        }

        // Get organization status
        const orgStatus = fb.organizationStatusId
          ? await ctx.db.get(fb.organizationStatusId)
          : null;

        return {
          _id: fb._id,
          title: fb.title,
          status: fb.status,
          voteCount: fb.voteCount,
          commentCount: fb.commentCount,
          organizationStatus: orgStatus
            ? { name: orgStatus.name, color: orgStatus.color }
            : null,
        };
      })
    );

    const validFeedback = feedbackItems.filter(Boolean);
    const total = validFeedback.length;
    const completed = validFeedback.filter(
      (f) => f?.status === "completed"
    ).length;
    const inProgress = validFeedback.filter(
      (f) => f?.status === "in_progress"
    ).length;

    return {
      ...milestone,
      feedback: validFeedback,
      progress: {
        total,
        completed,
        inProgress,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  },
});

/**
 * List all milestones a given feedback belongs to
 */
export const listByFeedback = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const junctions = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const milestones = await Promise.all(
      junctions.map(async (j) => ctx.db.get(j.milestoneId))
    );

    return milestones.filter(Boolean);
  },
});

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

    const first = await ctx.db.get(args.milestoneIds[0]);
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
      await ctx.db.patch(args.milestoneIds[i], {
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
