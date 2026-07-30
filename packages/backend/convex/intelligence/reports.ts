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
    days: v.optional(v.number()),
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
      battlecards: battlecards.map((b) => {
        const competitor = competitors.find((c) => c._id === b.competitorId);
        return {
          competitorName: competitor?.name ?? "Unknown",
          content: b.content,
          generatedAt: b.aiGeneratedAt,
        };
      }),
      competitors: competitors.map((c) => ({
        aiProfile: c.aiProfile,
        featureCount: c.featureList?.length ?? 0,
        lastScrapedAt: c.lastScrapedAt,
        name: c.name,
        status: c.status,
        websiteUrl: c.websiteUrl,
      })),
      featureComparison: featureComparison?.features ?? [],
      generatedAt: Date.now(),
      insights: recentInsights.map((i) => ({
        createdAt: i.createdAt,
        priority: i.priority,
        status: i.status,
        summary: i.summary,
        title: i.title,
        type: i.type,
      })),
      llmVisibility: {
        averageStrength:
          recentLlmChecks.length > 0
            ? recentLlmChecks.reduce(
                (sum, c) => sum + c.recommendationStrength,
                0
              ) / recentLlmChecks.length
            : 0,
        checks: recentLlmChecks.map((c) => ({
          checkedAt: c.checkedAt,
          context: c.context,
          mentionsProduct: c.mentionsProduct,
          prompt: c.prompt,
          recommendationStrength: c.recommendationStrength,
          sentiment: c.sentiment,
        })),
        mentionRate:
          recentLlmChecks.length > 0
            ? recentLlmChecks.filter((c) => c.mentionsProduct).length /
              recentLlmChecks.length
            : 0,
        totalChecks: recentLlmChecks.length,
      },
      periodDays: days,
      summary: {
        activeCompetitors: competitors.filter((c) => c.status === "active")
          .length,
        insightsByPriority: countBy(recentInsights, "priority"),
        insightsByType: countBy(recentInsights, "type"),
        signalsBySource: countBy(recentSignals, "source"),
        signalsByType: countBy(recentSignals, "signalType"),
        totalInsights: recentInsights.length,
        totalSignals: recentSignals.length,
      },
    };
  },
});

/**
 * Get historical trend data — insights and signals over time
 */
export const getHistoricalTrends = query({
  args: {
    days: v.optional(v.number()),
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
        byInsightType: countBy(recentInsights, "type"),
        bySignalSource: countBy(recentSignals, "source"),
        insights: recentInsights.length,
        signals: recentSignals.length,
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
  competitiveAlerts: 0,
  featureRequests: 0,
  featureSuggestions: 0,
  insights: 0,
  painPoints: 0,
  signals: 0,
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
