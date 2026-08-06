import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { isValidEmail } from "../shared/validators";

// ============================================
// QUERIES
// ============================================

// ============================================
// MUTATIONS
// ============================================

export const subscribe = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const existing = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_email_org", (q) =>
        q.eq("email", email).eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return { alreadySubscribed: true };
    }

    const token = crypto.randomUUID();

    await ctx.db.insert("statusSubscribers", {
      email,
      organizationId: args.organizationId,
      subscribedAt: Date.now(),
      unsubscribeToken: token,
    });

    return { alreadySubscribed: false };
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", args.token)
      )
      .unique();

    if (!subscriber) {
      return { success: false };
    }

    await ctx.db.delete(subscriber._id);
    return { success: true };
  },
});
