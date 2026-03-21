import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
      id: org._id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      primaryColor: org.primaryColor,
      isPublic: org.isPublic,
      subscriptionTier: org.subscriptionTier,
      subscriptionStatus: org.subscriptionStatus,
      supportEnabled: org.supportEnabled,
      feedbackSettings: org.feedbackSettings,
      changelogSettings: org.changelogSettings,
      createdAt: org.createdAt,
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
              title: f.title,
              status: f.status,
              voteCount: f.voteCount,
              priority: f.priority,
            };
          })
        );

        return {
          id: m._id,
          name: m.name,
          description: m.description,
          emoji: m.emoji,
          color: m.color,
          timeHorizon: m.timeHorizon,
          targetDate: m.targetDate,
          feedback: feedbackItems.filter(Boolean),
        };
      })
    );

    return {
      milestones: roadmapItems,
      statuses: statuses.map((s) => ({
        id: s._id,
        name: s.name,
        color: s.color,
        icon: s.icon,
      })),
    };
  },
});

// ============================================
// ORGANIZATION MUTATIONS
// ============================================

export const updateOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    primaryColor: v.optional(v.string()),
    supportEnabled: v.optional(v.boolean()),
  },
  returns: v.object({ success: v.boolean() }),
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
});
