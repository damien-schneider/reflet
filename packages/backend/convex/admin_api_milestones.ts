import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
          id: m._id,
          name: m.name,
          description: m.description,
          emoji: m.emoji,
          color: m.color,
          timeHorizon: m.timeHorizon,
          targetDate: m.targetDate,
          status: m.status,
          isPublic: m.isPublic,
          completedAt: m.completedAt,
          feedbackCount: feedbackLinks.length,
          createdAt: m.createdAt,
        };
      })
    );

    return items;
  },
});

export const getMilestone = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    milestoneId: v.id("milestones"),
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
          title: f.title,
          status: f.status,
          voteCount: f.voteCount,
        };
      })
    );

    return {
      id: milestone._id,
      name: milestone.name,
      description: milestone.description,
      emoji: milestone.emoji,
      color: milestone.color,
      timeHorizon: milestone.timeHorizon,
      targetDate: milestone.targetDate,
      status: milestone.status,
      isPublic: milestone.isPublic,
      completedAt: milestone.completedAt,
      createdAt: milestone.createdAt,
      linkedFeedback: linkedFeedback.filter(Boolean),
    };
  },
});

// ============================================
// MILESTONE MUTATIONS
// ============================================

export const createMilestone = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.string(),
    timeHorizon,
    targetDate: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.object({ id: v.id("milestones") }),
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

    return { id };
  },
});

export const updateMilestone = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    milestoneId: v.id("milestones"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    timeHorizon: v.optional(timeHorizon),
    targetDate: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const completeMilestone = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    milestoneId: v.id("milestones"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.organizationId !== args.organizationId) {
      throw new Error("Milestone not found");
    }

    await ctx.db.patch(args.milestoneId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteMilestone = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    milestoneId: v.id("milestones"),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const linkMilestoneFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    milestoneId: v.id("milestones"),
    feedbackId: v.id("feedback"),
    action: v.union(v.literal("link"), v.literal("unlink")),
  },
  returns: v.object({ success: v.boolean() }),
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
          milestoneId: args.milestoneId,
          feedbackId: args.feedbackId,
          addedAt: Date.now(),
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
