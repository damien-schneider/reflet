import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

export const getOrCreate = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const existing = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return existing;
    }

    const now = Date.now();

    const configId = await ctx.db.insert("intelligenceConfig", {
      competitorTrackingEnabled: false,
      createdAt: now,
      organizationId: args.organizationId,
      redditEnabled: false,
      scanFrequency: "weekly",
      updatedAt: now,
      webSearchEnabled: false,
    });

    return await ctx.db.get(configId);
  },
});

export const update = mutation({
  args: {
    competitorTrackingEnabled: v.optional(v.boolean()),
    organizationId: v.id("organizations"),
    redditEnabled: v.optional(v.boolean()),
    scanFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("twice_weekly"),
        v.literal("weekly")
      )
    ),
    webSearchEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update intelligence config");
    }

    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      throw new Error("Intelligence config not found");
    }

    const { organizationId: _, ...updates } = args;

    await ctx.db.patch(config._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(config._id);
  },
});

export const getConfigForScan = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});
