import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

// Subscription plan limits
export const PLAN_LIMITS = {
  free: {
    maxBoards: 1,
    maxMembers: 3,
    maxFeedbackPerBoard: 100,
    customBranding: false,
    apiAccess: false,
  },
  pro: {
    maxBoards: 5,
    maxMembers: 10,
    maxFeedbackPerBoard: 1000,
    customBranding: true,
    apiAccess: true,
  },
} as const;

// ============================================
// QUERIES
// ============================================

/**
 * List all organizations the current user is a member of
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) {
          return null;
        }
        return {
          ...org,
          role: membership.role,
        };
      })
    );

    return organizations.filter(Boolean);
  },
});

/**
 * Get a single organization by ID
 */
export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!org.isPublic && user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.id).eq("userId", user._id)
        )
        .unique();

      if (!membership) {
        return null;
      }
      return { ...org, role: membership.role };
    }

    if (org.isPublic) {
      return org;
    }

    return null;
  },
});

/**
 * Get organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    if (org.isPublic) {
      if (user) {
        const membership = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org_user", (q) =>
            q.eq("organizationId", org._id).eq("userId", user._id)
          )
          .unique();

        if (membership) {
          return { ...org, role: membership.role };
        }
      }
      return { ...org, role: null };
    }

    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }
    return { ...org, role: membership.role };
  },
});
