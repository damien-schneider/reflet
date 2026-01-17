import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { polar } from "./polar";
import { getAuthUser } from "./utils";

// ============================================
// ACTIONS - Use Polar component for subscription management
// ============================================

/**
 * Sync products from Polar (run once after setting up products in Polar dashboard)
 */
export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
    return { success: true };
  },
});

// ============================================
// MUTATIONS - Checkout metadata for frontend
// ============================================

/**
 * Create checkout session metadata (for frontend to redirect)
 */
export const createCheckoutMetadata = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can manage subscription");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Return metadata for checkout - the frontend will use this to create the checkout URL
    return {
      organizationId: args.organizationId,
      organizationSlug: org.slug,
      organizationName: org.name,
      userId: user._id,
      userEmail: user.email,
    };
  },
});
