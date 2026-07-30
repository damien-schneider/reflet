import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// INTELLIGENCE VALIDATORS
// ============================================

export const scanFrequency = v.union(
  v.literal("daily"),
  v.literal("twice_weekly"),
  v.literal("weekly")
);

export const competitorStatus = v.union(
  v.literal("active"),
  v.literal("paused")
);

export const intelligenceJobType = v.union(
  v.literal("reddit_scan"),
  v.literal("web_search"),
  v.literal("competitor_scrape"),
  v.literal("synthesis")
);

export const intelligenceJobStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

export const signalSource = v.union(
  v.literal("reddit"),
  v.literal("hackernews"),
  v.literal("web"),
  v.literal("competitor_changelog"),
  v.literal("competitor_pricing"),
  v.literal("competitor_features")
);

export const signalType = v.union(
  v.literal("pain_point"),
  v.literal("feature_request"),
  v.literal("competitor_update"),
  v.literal("pricing_change"),
  v.literal("market_trend"),
  v.literal("feature_gap")
);

export const signalSentiment = v.union(
  v.literal("positive"),
  v.literal("negative"),
  v.literal("neutral")
);

export const insightType = v.union(
  v.literal("feature_suggestion"),
  v.literal("competitive_alert"),
  v.literal("market_opportunity"),
  v.literal("risk_warning"),
  v.literal("battlecard")
);

export const insightPriority = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

export const insightStatus = v.union(
  v.literal("new"),
  v.literal("reviewed"),
  v.literal("dismissed"),
  v.literal("converted_to_feedback")
);

export const keywordSource = v.union(
  v.literal("reddit"),
  v.literal("web"),
  v.literal("both")
);

// ============================================
// INTELLIGENCE TABLES
// ============================================

export const intelligenceTables = {
  battlecards: defineTable({
    aiGeneratedAt: v.number(),
    competitorId: v.id("competitors"),
    content: v.string(),
    lastUpdatedAt: v.number(),
    organizationId: v.id("organizations"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_competitor", ["competitorId"])
    .index("by_org_competitor", ["organizationId", "competitorId"]),

  competitors: defineTable({
    aiProfile: v.optional(v.string()),
    aiProfileUpdatedAt: v.optional(v.number()),
    changelogUrl: v.optional(v.string()),
    createdAt: v.number(),
    description: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    featureList: v.optional(v.array(v.string())),
    featuresUrl: v.optional(v.string()),
    lastScrapedAt: v.optional(v.number()),
    lastScrapedContent: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
    pricingUrl: v.optional(v.string()),
    status: competitorStatus,
    updatedAt: v.number(),
    websiteUrl: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  featureComparisons: defineTable({
    aiGeneratedAt: v.number(),
    features: v.array(
      v.object({
        competitors: v.array(
          v.object({
            competitorId: v.id("competitors"),
            details: v.optional(v.string()),
            hasIt: v.boolean(),
          })
        ),
        featureName: v.string(),
        userProductHasIt: v.boolean(),
      })
    ),
    lastUpdatedAt: v.number(),
    organizationId: v.id("organizations"),
  }).index("by_organization", ["organizationId"]),
  intelligenceConfig: defineTable({
    competitorTrackingEnabled: v.boolean(),
    createdAt: v.number(),
    lastScanAt: v.optional(v.number()),
    nextScanAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    redditEnabled: v.boolean(),
    scanFrequency,
    updatedAt: v.number(),
    webSearchEnabled: v.boolean(),
  }).index("by_organization", ["organizationId"]),

  intelligenceInsights: defineTable({
    competitorIds: v.optional(v.array(v.id("competitors"))),
    createdAt: v.number(),
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
    organizationId: v.id("organizations"),
    priority: insightPriority,
    reasoning: v.optional(v.string()),
    signalIds: v.array(v.id("intelligenceSignals")),
    status: insightStatus,
    suggestedFeedbackDescription: v.optional(v.string()),
    suggestedFeedbackTitle: v.optional(v.string()),
    summary: v.string(),
    title: v.string(),
    type: insightType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  intelligenceJobs: defineTable({
    completedAt: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    dismissedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    organizationId: v.id("organizations"),
    startedAt: v.number(),
    stats: v.optional(
      v.object({
        errors: v.number(),
        itemsFound: v.number(),
        itemsProcessed: v.number(),
      })
    ),
    status: intelligenceJobStatus,
    type: intelligenceJobType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "type"]),

  intelligenceKeywords: defineTable({
    createdAt: v.number(),
    keyword: v.string(),
    organizationId: v.id("organizations"),
    source: keywordSource,
    subreddit: v.optional(v.string()),
  }).index("by_organization", ["organizationId"]),

  intelligenceSignals: defineTable({
    author: v.optional(v.string()),
    competitorId: v.optional(v.id("competitors")),
    content: v.string(),
    createdAt: v.number(),
    jobId: v.id("intelligenceJobs"),
    keywordId: v.optional(v.id("intelligenceKeywords")),
    organizationId: v.id("organizations"),
    publishedAt: v.optional(v.number()),
    relevanceScore: v.number(),
    sentiment: signalSentiment,
    signalType,
    source: signalSource,
    title: v.string(),
    url: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_competitor", ["competitorId"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  llmVisibilityChecks: defineTable({
    checkedAt: v.number(),
    context: v.string(),
    mentionedCompetitors: v.array(v.string()),
    mentionsProduct: v.boolean(),
    model: v.string(),
    organizationId: v.id("organizations"),
    prompt: v.string(),
    recommendationStrength: v.number(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral")
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_checked", ["organizationId", "checkedAt"]),
};
