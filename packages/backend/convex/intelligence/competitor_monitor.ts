import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get competitor by ID (internal use, no auth)
 */
export const getCompetitor = internalQuery({
  args: { competitorId: v.id("competitors") },
  handler: async (ctx, args) => {
    const competitor = await ctx.db.get(args.competitorId);
    return competitor;
  },
});

/**
 * Update competitor with scraped data
 */
export const updateCompetitorAfterScrape = internalMutation({
  args: {
    aiProfile: v.optional(v.string()),
    aiProfileUpdatedAt: v.optional(v.number()),
    competitorId: v.id("competitors"),
    featureList: v.optional(v.array(v.string())),
    lastScrapedAt: v.number(),
    lastScrapedContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { competitorId, ...updates } = args;
    await ctx.db.patch(competitorId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create an intelligence signal
 */
export const createSignal = internalMutation({
  args: {
    competitorId: v.optional(v.id("competitors")),
    content: v.string(),
    jobId: v.id("intelligenceJobs"),
    organizationId: v.id("organizations"),
    relevanceScore: v.number(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral")
    ),
    signalType: v.union(
      v.literal("pain_point"),
      v.literal("feature_request"),
      v.literal("competitor_update"),
      v.literal("pricing_change"),
      v.literal("market_trend"),
      v.literal("feature_gap")
    ),
    source: v.union(
      v.literal("reddit"),
      v.literal("hackernews"),
      v.literal("web"),
      v.literal("competitor_changelog"),
      v.literal("competitor_pricing"),
      v.literal("competitor_features")
    ),
    title: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signalId = await ctx.db.insert("intelligenceSignals", {
      competitorId: args.competitorId,
      content: args.content,
      createdAt: Date.now(),
      jobId: args.jobId,
      organizationId: args.organizationId,
      relevanceScore: args.relevanceScore,
      sentiment: args.sentiment,
      signalType: args.signalType,
      source: args.source,
      title: args.title,
      url: args.url,
    });
    return signalId;
  },
});

/**
 * Create an intelligence job record
 */
export const createJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("reddit_scan"),
      v.literal("web_search"),
      v.literal("competitor_scrape"),
      v.literal("synthesis")
    ),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("intelligenceJobs", {
      organizationId: args.organizationId,
      startedAt: Date.now(),
      status: "pending",
      type: args.type,
    });
    return jobId;
  },
});

/**
 * Update job status and stats
 */
export const updateJob = internalMutation({
  args: {
    errorMessage: v.optional(v.string()),
    jobId: v.id("intelligenceJobs"),
    stats: v.optional(
      v.object({
        errors: v.number(),
        itemsFound: v.number(),
        itemsProcessed: v.number(),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    if (args.stats) {
      updates.stats = args.stats;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.jobId, updates);
  },
});
