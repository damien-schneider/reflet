import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

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
