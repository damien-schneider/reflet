import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// MILESTONE TIME HORIZON VALIDATOR
// ============================================

const timeHorizon = v.union(
  v.literal("now"),
  v.literal("next_month"),
  v.literal("next_quarter"),
  v.literal("half_year"),
  v.literal("next_year"),
  v.literal("future")
);

// ============================================
// MILESTONE QUERIES
// ============================================

export const listMilestones = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    let milestones = await ctx.db
      .query("milestones")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const status = args.status ?? "all";
    if (status !== "all") {
      milestones = milestones.filter((m) => m.status === status);
    }

    milestones.sort((a, b) => a.order - b.order);

    const items = await Promise.all(
      milestones.map(async (m) => {
        const feedbackLinks = await ctx.db
          .query("milestoneFeedback")
          .withIndex("by_milestone", (q) => q.eq("milestoneId", m._id))
          .collect();
        return {
          color: m.color,
          completedAt: m.completedAt,
          createdAt: m.createdAt,
          description: m.description,
          emoji: m.emoji,
          feedbackCount: feedbackLinks.length,
          id: m._id,
          isPublic: m.isPublic,
          name: m.name,
          status: m.status,
          targetDate: m.targetDate,
          timeHorizon: m.timeHorizon,
        };
      })
    );

    return items;
  },
});

export const getMilestone = internalQuery({
  args: {
    milestoneId: v.id("milestones"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      return null;
    }

    const feedbackLinks = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.milestoneId))
      .collect();

    const linkedFeedback = await Promise.all(
      feedbackLinks.map(async (link) => {
        const f = await ctx.db.get(link.feedbackId);
        if (!f) {
          return null;
        }
        return {
          id: f._id,
          status: f.status,
          title: f.title,
          voteCount: f.voteCount,
        };
      })
    );

    return {
      color: milestone.color,
      completedAt: milestone.completedAt,
      createdAt: milestone.createdAt,
      description: milestone.description,
      emoji: milestone.emoji,
      id: milestone._id,
      isPublic: milestone.isPublic,
      linkedFeedback: linkedFeedback.filter(Boolean),
      name: milestone.name,
      status: milestone.status,
      targetDate: milestone.targetDate,
      timeHorizon: milestone.timeHorizon,
    };
  },
});

// ============================================
// MILESTONE MUTATIONS
// ============================================

export const createMilestone = internalMutation({
  args: {
    color: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    name: v.string(),
    organizationId: v.id("organizations"),
    targetDate: v.optional(v.number()),
    timeHorizon,
  },
  handler: async (ctx, args) => {
    // Find max order
    const existing = await ctx.db
      .query("milestones")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const maxOrder = existing.reduce((max, m) => Math.max(max, m.order), -1);

    const now = Date.now();
    const id = await ctx.db.insert("milestones", {
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

    return { id };
  },
  returns: v.object({ id: v.id("milestones") }),
});

export const updateMilestone = internalMutation({
  args: {
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    milestoneId: v.id("milestones"),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    targetDate: v.optional(v.number()),
    timeHorizon: v.optional(timeHorizon),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      throw new Error("Milestone not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.emoji !== undefined) {
      updates.emoji = args.emoji;
    }
    if (args.color !== undefined) {
      updates.color = args.color;
    }
    if (args.timeHorizon !== undefined) {
      updates.timeHorizon = args.timeHorizon;
    }
    if (args.targetDate !== undefined) {
      updates.targetDate = args.targetDate;
    }
    if (args.isPublic !== undefined) {
      updates.isPublic = args.isPublic;
    }

    await ctx.db.patch(args.milestoneId, updates);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const completeMilestone = internalMutation({
  args: {
    milestoneId: v.id("milestones"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      throw new Error("Milestone not found");
    }

    await ctx.db.patch(args.milestoneId, {
      completedAt: Date.now(),
      status: "completed",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const deleteMilestone = internalMutation({
  args: {
    milestoneId: v.id("milestones"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      throw new Error("Milestone not found");
    }

    // Unlink all feedback
    const links = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.milestoneId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.milestoneId);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const linkMilestoneFeedback = internalMutation({
  args: {
    action: v.union(v.literal("link"), v.literal("unlink")),
    feedbackId: v.id("feedback"),
    milestoneId: v.id("milestones"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      throw new Error("Milestone not found");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const existing = await ctx.db
      .query("milestoneFeedback")
      .withIndex("by_milestone_feedback", (q) =>
        q.eq("milestoneId", args.milestoneId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (args.action === "link") {
      if (!existing) {
        await ctx.db.insert("milestoneFeedback", {
          addedAt: Date.now(),
          feedbackId: args.feedbackId,
          milestoneId: args.milestoneId,
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
