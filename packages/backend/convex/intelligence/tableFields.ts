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
  intelligenceConfig: defineTable({
    organizationId: v.id("organizations"),
    scanFrequency,
    redditEnabled: v.boolean(),
    webSearchEnabled: v.boolean(),
    competitorTrackingEnabled: v.boolean(),
    lastScanAt: v.optional(v.number()),
    nextScanAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  competitors: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    websiteUrl: v.string(),
    changelogUrl: v.optional(v.string()),
    pricingUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string()),
    featuresUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    aiProfile: v.optional(v.string()),
    aiProfileUpdatedAt: v.optional(v.number()),
    status: competitorStatus,
    lastScrapedContent: v.optional(v.string()),
    lastScrapedAt: v.optional(v.number()),
    featureList: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  intelligenceKeywords: defineTable({
    organizationId: v.id("organizations"),
    keyword: v.string(),
    source: keywordSource,
    subreddit: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  intelligenceJobs: defineTable({
    organizationId: v.id("organizations"),
    type: intelligenceJobType,
    status: intelligenceJobStatus,
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    stats: v.optional(
      v.object({
        itemsFound: v.number(),
        itemsProcessed: v.number(),
        errors: v.number(),
      })
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "type"]),

  intelligenceSignals: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("intelligenceJobs"),
    source: signalSource,
    competitorId: v.optional(v.id("competitors")),
    keywordId: v.optional(v.id("intelligenceKeywords")),
    title: v.string(),
    content: v.string(),
    url: v.optional(v.string()),
    author: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    signalType,
    relevanceScore: v.number(),
    sentiment: signalSentiment,
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_competitor", ["competitorId"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  intelligenceInsights: defineTable({
    organizationId: v.id("organizations"),
    signalIds: v.array(v.id("intelligenceSignals")),
    type: insightType,
    title: v.string(),
    summary: v.string(),
    reasoning: v.optional(v.string()),
    priority: insightPriority,
    suggestedFeedbackTitle: v.optional(v.string()),
    suggestedFeedbackDescription: v.optional(v.string()),
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
    competitorIds: v.optional(v.array(v.id("competitors"))),
    status: insightStatus,
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  featureComparisons: defineTable({
    organizationId: v.id("organizations"),
    features: v.array(
      v.object({
        featureName: v.string(),
        userProductHasIt: v.boolean(),
        competitors: v.array(
          v.object({
            competitorId: v.id("competitors"),
            hasIt: v.boolean(),
            details: v.optional(v.string()),
          })
        ),
      })
    ),
    aiGeneratedAt: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  battlecards: defineTable({
    organizationId: v.id("organizations"),
    competitorId: v.id("competitors"),
    content: v.string(),
    aiGeneratedAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_competitor", ["competitorId"])
    .index("by_org_competitor", ["organizationId", "competitorId"]),

  llmVisibilityChecks: defineTable({
    organizationId: v.id("organizations"),
    prompt: v.string(),
    model: v.string(),
    mentionsProduct: v.boolean(),
    mentionedCompetitors: v.array(v.string()),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral")
    ),
    context: v.string(),
    recommendationStrength: v.number(),
    checkedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_checked", ["organizationId", "checkedAt"]),
};
