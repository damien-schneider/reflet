import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// ORGANIZATION QUERIES
// ============================================

export const getOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    return {
      changelogSettings: org.changelogSettings,
      createdAt: org.createdAt,
      feedbackSettings: org.feedbackSettings,
      id: org._id,
      isPublic: org.isPublic,
      logo: org.logo,
      name: org.name,
      primaryColor: org.primaryColor,
      slug: org.slug,
      subscriptionStatus: org.subscriptionStatus,
      subscriptionTier: org.subscriptionTier,
      supportEnabled: org.supportEnabled,
    };
  },
});

export const getRoadmap = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get active milestones with their feedback
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    milestones.sort((a, b) => a.order - b.order);

    // Get statuses
    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const roadmapItems = await Promise.all(
      milestones.map(async (m) => {
        const feedbackLinks = await ctx.db
          .query("milestoneFeedback")
          .withIndex("by_milestone", (q) => q.eq("milestoneId", m._id))
          .collect();

        const feedbackItems = await Promise.all(
          feedbackLinks.map(async (link) => {
            const f = await ctx.db.get(link.feedbackId);
            if (!f) {
              return null;
            }
            return {
              id: f._id,
              priority: f.priority,
              status: f.status,
              title: f.title,
              voteCount: f.voteCount,
            };
          })
        );

        return {
          color: m.color,
          description: m.description,
          emoji: m.emoji,
          feedback: feedbackItems.filter(Boolean),
          id: m._id,
          name: m.name,
          targetDate: m.targetDate,
          timeHorizon: m.timeHorizon,
        };
      })
    );

    return {
      milestones: roadmapItems,
      statuses: statuses.map((s) => ({
        color: s.color,
        icon: s.icon,
        id: s._id,
        name: s.name,
      })),
    };
  },
});

// ============================================
// ORGANIZATION MUTATIONS
// ============================================

export const updateOrganization = internalMutation({
  args: {
    isPublic: v.optional(v.boolean()),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    primaryColor: v.optional(v.string()),
    supportEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.isPublic !== undefined) {
      updates.isPublic = args.isPublic;
    }
    if (args.primaryColor !== undefined) {
      updates.primaryColor = args.primaryColor;
    }
    if (args.supportEnabled !== undefined) {
      updates.supportEnabled = args.supportEnabled;
    }

    await ctx.db.patch(args.organizationId, updates);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
