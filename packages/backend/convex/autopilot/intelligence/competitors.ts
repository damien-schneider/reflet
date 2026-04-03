import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// URL VALIDATION
// ============================================

const validateUrl = (url: string): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("URL must use http or https protocol");
    }
  } catch {
    throw new Error("Invalid URL format");
  }
  return parsedUrl.href;
};

// ============================================
// QUERIES
// ============================================

/**
 * List all competitors for an organization
 */
export const list = query({
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
      return [];
    }

    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return competitors.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get a single competitor by ID
 */
export const get = query({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      return null;
    }

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return competitor;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Add a new competitor
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    websiteUrl: v.string(),
    changelogUrl: v.optional(v.string()),
    pricingUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    featuresUrl: v.optional(v.string()),
    description: v.optional(v.string()),
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
      throw new Error("Only admins can add competitors");
    }

    // Validate URL format
    const websiteUrl = validateUrl(args.websiteUrl);

    const changelogUrl = args.changelogUrl
      ? validateUrl(args.changelogUrl)
      : undefined;
    const pricingUrl = args.pricingUrl
      ? validateUrl(args.pricingUrl)
      : undefined;
    const docsUrl = args.docsUrl ? validateUrl(args.docsUrl) : undefined;
    const featuresUrl = args.featuresUrl
      ? validateUrl(args.featuresUrl)
      : undefined;

    const now = Date.now();

    const competitorId = await ctx.db.insert("competitors", {
      organizationId: args.organizationId,
      name: args.name,
      websiteUrl,
      changelogUrl,
      pricingUrl,
      docsUrl,
      featuresUrl,
      description: args.description,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule a scrape
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.intelligence.competitor_monitor.scrapeCompetitor,
      { competitorId }
    );

    return competitorId;
  },
});

/**
 * Update competitor fields
 */
export const update = mutation({
  args: {
    id: v.id("competitors"),
    name: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    changelogUrl: v.optional(v.string()),
    pricingUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    featuresUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      throw new Error("Competitor not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update competitors");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.websiteUrl !== undefined) {
      updates.websiteUrl = validateUrl(args.websiteUrl);
    }
    if (args.changelogUrl !== undefined) {
      updates.changelogUrl = validateUrl(args.changelogUrl);
    }
    if (args.pricingUrl !== undefined) {
      updates.pricingUrl = validateUrl(args.pricingUrl);
    }
    if (args.docsUrl !== undefined) {
      updates.docsUrl = validateUrl(args.docsUrl);
    }
    if (args.featuresUrl !== undefined) {
      updates.featuresUrl = validateUrl(args.featuresUrl);
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a competitor and related battlecards
 */
export const remove = mutation({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      throw new Error("Competitor not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can remove competitors");
    }

    // Delete related battlecards
    const battlecards = await ctx.db
      .query("battlecards")
      .withIndex("by_competitor", (q) => q.eq("competitorId", args.id))
      .collect();

    for (const battlecard of battlecards) {
      await ctx.db.delete(battlecard._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Pause competitor monitoring
 */
export const pause = mutation({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      throw new Error("Competitor not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can pause competitors");
    }

    await ctx.db.patch(args.id, {
      status: "paused" as const,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Resume competitor monitoring
 */
export const resume = mutation({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const competitor = await ctx.db.get(args.id);
    if (!competitor) {
      throw new Error("Competitor not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", competitor.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can resume competitors");
    }

    await ctx.db.patch(args.id, {
      status: "active" as const,
      updatedAt: Date.now(),
    });

    return true;
  },
});
