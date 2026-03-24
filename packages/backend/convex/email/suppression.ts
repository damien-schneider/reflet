import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

export const isEmailSuppressed = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const suppression = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return suppression !== null;
  },
});

export const listSuppressions = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can view suppressions");
    }

    return await ctx.db.query("emailSuppressions").order("desc").take(200);
  },
});

export const addSuppression = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage suppressions");
    }

    const normalizedEmail = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("emailSuppressions", {
      email: normalizedEmail,
      reason: "manual",
      originalEventType: "manual",
      suppressedAt: Date.now(),
    });
  },
});

export const removeSuppression = mutation({
  args: {
    organizationId: v.id("organizations"),
    suppressionId: v.id("emailSuppressions"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage suppressions");
    }

    const suppression = await ctx.db.get(args.suppressionId);
    if (!suppression) {
      throw new Error("Suppression not found");
    }

    await ctx.db.delete(args.suppressionId);
  },
});
