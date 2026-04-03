import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get recent community signals grouped by topic/keyword
 */
export const getSignalsByTopic = query({
  args: {
    organizationId: v.id("organizations"),
    source: v.optional(
      v.union(v.literal("reddit"), v.literal("web"), v.literal("all"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const limit = args.limit ?? 100;

    let signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    // Filter by source if specified
    const sourceFilter = args.source ?? "all";
    if (sourceFilter === "all") {
      // Only community sources for the community pulse view
      signals = signals.filter(
        (s) =>
          s.source === "reddit" ||
          s.source === "web" ||
          s.source === "hackernews"
      );
    } else {
      signals = signals.filter((s) => s.source === sourceFilter);
    }

    // Group signals by keyword
    const grouped: Record<
      string,
      {
        keyword: string;
        signals: typeof signals;
        sentimentBreakdown: {
          positive: number;
          negative: number;
          neutral: number;
        };
      }
    > = {};

    for (const signal of signals) {
      // Use the first word of the title as a rough grouping key
      // In practice, keywordId would link back to the keyword
      let groupKey = "General";
      if (signal.keywordId) {
        const keyword = await ctx.db.get(signal.keywordId);
        if (keyword) {
          groupKey = keyword.keyword;
        }
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          keyword: groupKey,
          signals: [],
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        };
      }

      const group = grouped[groupKey];
      if (group) {
        group.signals.push(signal);
        group.sentimentBreakdown[signal.sentiment]++;
      }
    }

    return Object.values(grouped);
  },
});

/**
 * Get trending topics — keywords with the most signals recently
 */
export const getTrendingTopics = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentSignals = signals.filter(
      (s) =>
        s.createdAt >= sevenDaysAgo &&
        (s.source === "reddit" ||
          s.source === "web" ||
          s.source === "hackernews")
    );

    // Count by signal type
    const typeCounts: Record<string, number> = {};
    for (const s of recentSignals) {
      typeCounts[s.signalType] = (typeCounts[s.signalType] ?? 0) + 1;
    }

    // Sentiment overview
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    for (const s of recentSignals) {
      if (s.sentiment === "positive") {
        positive++;
      } else if (s.sentiment === "negative") {
        negative++;
      } else {
        neutral++;
      }
    }

    return {
      totalSignals: recentSignals.length,
      typeCounts,
      sentimentOverview: { positive, negative, neutral },
      topPainPoints: recentSignals
        .filter((s) => s.signalType === "pain_point")
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5),
      topFeatureRequests: recentSignals
        .filter((s) => s.signalType === "feature_request")
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5),
    };
  },
});

/**
 * Get signal history for trends over time
 */
export const getSignalHistory = query({
  args: {
    organizationId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentSignals = signals.filter((s) => s.createdAt >= since);

    // Group by day
    const dailyCounts: Record<
      string,
      { total: number; positive: number; negative: number; neutral: number }
    > = {};

    for (const s of recentSignals) {
      const date =
        new Date(s.createdAt).toISOString().split("T")[0] ?? "unknown";
      if (!dailyCounts[date]) {
        dailyCounts[date] = { total: 0, positive: 0, negative: 0, neutral: 0 };
      }
      const day = dailyCounts[date];
      if (day) {
        day.total++;
        day[s.sentiment]++;
      }
    }

    return Object.entries(dailyCounts)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});
