import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Generate a full intelligence report for export
 */
export const getExportReport = query({
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can export reports");
    }

    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    // Gather all intelligence data
    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentInsights = insights.filter((i) => i.createdAt >= since);

    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentSignals = signals.filter((s) => s.createdAt >= since);

    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const battlecards = await ctx.db
      .query("battlecards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const featureComparison = await ctx.db
      .query("featureComparisons")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const llmChecks = await ctx.db
      .query("llmVisibilityChecks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentLlmChecks = llmChecks.filter((c) => c.checkedAt >= since);

    return {
      generatedAt: Date.now(),
      periodDays: days,
      summary: {
        totalInsights: recentInsights.length,
        totalSignals: recentSignals.length,
        activeCompetitors: competitors.filter((c) => c.status === "active")
          .length,
        insightsByType: countBy(recentInsights, "type"),
        insightsByPriority: countBy(recentInsights, "priority"),
        signalsBySource: countBy(recentSignals, "source"),
        signalsByType: countBy(recentSignals, "signalType"),
      },
      insights: recentInsights.map((i) => ({
        title: i.title,
        type: i.type,
        priority: i.priority,
        summary: i.summary,
        status: i.status,
        createdAt: i.createdAt,
      })),
      competitors: competitors.map((c) => ({
        name: c.name,
        websiteUrl: c.websiteUrl,
        status: c.status,
        aiProfile: c.aiProfile,
        featureCount: c.featureList?.length ?? 0,
        lastScrapedAt: c.lastScrapedAt,
      })),
      battlecards: battlecards.map((b) => {
        const competitor = competitors.find((c) => c._id === b.competitorId);
        return {
          competitorName: competitor?.name ?? "Unknown",
          content: b.content,
          generatedAt: b.aiGeneratedAt,
        };
      }),
      featureComparison: featureComparison?.features ?? [],
      llmVisibility: {
        totalChecks: recentLlmChecks.length,
        averageStrength:
          recentLlmChecks.length > 0
            ? recentLlmChecks.reduce(
                (sum, c) => sum + c.recommendationStrength,
                0
              ) / recentLlmChecks.length
            : 0,
        mentionRate:
          recentLlmChecks.length > 0
            ? recentLlmChecks.filter((c) => c.mentionsProduct).length /
              recentLlmChecks.length
            : 0,
        checks: recentLlmChecks.map((c) => ({
          prompt: c.prompt,
          mentionsProduct: c.mentionsProduct,
          recommendationStrength: c.recommendationStrength,
          sentiment: c.sentiment,
          context: c.context,
          checkedAt: c.checkedAt,
        })),
      },
    };
  },
});

/**
 * Get historical trend data — insights and signals over time
 */
export const getHistoricalTrends = query({
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
      return null;
    }

    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentInsights = insights.filter((i) => i.createdAt >= since);
    const recentSignals = signals.filter((s) => s.createdAt >= since);

    const timeline = buildTimeline(recentInsights, recentSignals);

    return {
      timeline,
      totals: {
        insights: recentInsights.length,
        signals: recentSignals.length,
        byInsightType: countBy(recentInsights, "type"),
        bySignalSource: countBy(recentSignals, "source"),
      },
    };
  },
});

// ============================================
// HELPERS
// ============================================

interface DailyEntry {
  competitiveAlerts: number;
  featureRequests: number;
  featureSuggestions: number;
  insights: number;
  painPoints: number;
  signals: number;
}

const emptyDay = (): DailyEntry => ({
  insights: 0,
  signals: 0,
  featureSuggestions: 0,
  competitiveAlerts: 0,
  painPoints: 0,
  featureRequests: 0,
});

const getDateKey = (timestamp: number): string =>
  new Date(timestamp).toISOString().split("T")[0] ?? "unknown";

const ensureDay = (
  data: Record<string, DailyEntry>,
  date: string
): DailyEntry => {
  if (!data[date]) {
    data[date] = emptyDay();
  }
  return data[date] as DailyEntry;
};

const buildTimeline = (
  insights: { createdAt: number; type: string }[],
  signals: { createdAt: number; signalType: string }[]
): {
  date: string;
  insights: number;
  signals: number;
  featureSuggestions: number;
  competitiveAlerts: number;
  painPoints: number;
  featureRequests: number;
}[] => {
  const dailyData: Record<string, DailyEntry> = {};

  for (const insight of insights) {
    const day = ensureDay(dailyData, getDateKey(insight.createdAt));
    day.insights++;
    if (insight.type === "feature_suggestion") {
      day.featureSuggestions++;
    }
    if (insight.type === "competitive_alert") {
      day.competitiveAlerts++;
    }
  }

  for (const signal of signals) {
    const day = ensureDay(dailyData, getDateKey(signal.createdAt));
    day.signals++;
    if (signal.signalType === "pain_point") {
      day.painPoints++;
    }
    if (signal.signalType === "feature_request") {
      day.featureRequests++;
    }
  }

  return Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const countBy = <T extends Record<string, unknown>>(
  items: T[],
  key: string
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = String(item[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
};
