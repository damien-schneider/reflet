import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { logVisibilityChange } from "../organizations/visibility_log";
import { API_ACTOR_ID } from "../shared/actors";

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

    await logVisibilityChange(ctx, {
      actorId: API_ACTOR_ID,
      isPublic: args.isPublic,
      organization: org,
    });
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
