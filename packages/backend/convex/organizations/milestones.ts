import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

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
              organizationStatusId: fb.organizationStatusId,
              status: fb.status,
              title: fb.title,
              voteCount: fb.voteCount,
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
          feedbackPreview: validFeedback.slice(0, 3),
          progress: {
            completed,
            inProgress,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            total,
          },
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
          commentCount: fb.commentCount,
          organizationStatus: orgStatus
            ? { color: orgStatus.color, name: orgStatus.name }
            : null,
          status: fb.status,
          title: fb.title,
          voteCount: fb.voteCount,
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
        completed,
        inProgress,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        total,
      },
    };
  },
});

export const create = mutation({
  args: {
    color: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    organizationId: v.id("organizations"),
    targetDate: v.optional(v.number()),
    timeHorizon: v.union(
      v.literal("now"),
      v.literal("next_month"),
      v.literal("next_quarter"),
      v.literal("half_year"),
      v.literal("next_year"),
      v.literal("future")
    ),
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
      color: args.color,
      createdAt: now,
      description: args.description,
      emoji: args.emoji,
      isPublic: args.isPublic ?? true,
      name: args.name,
      order: maxOrder + 1,
      organizationId: args.organizationId,
      status: "active",
      targetDate: args.targetDate,
      timeHorizon: args.timeHorizon,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    clearTargetDate: v.optional(v.boolean()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    id: v.id("milestones"),
    isPublic: v.optional(v.boolean()),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    targetDate: v.optional(v.number()),
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
