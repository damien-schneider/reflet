import { defineTable } from "convex/server";
import { v } from "convex/values";

export const competitorsTables = {
  autopilotCompetitors: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    strengths: v.optional(v.string()),
    weaknesses: v.optional(v.string()),
    pricingTier: v.optional(v.string()),
    features: v.optional(v.string()),
    pricing: v.optional(v.string()),
    differentiator: v.optional(v.string()),
    trafficEstimate: v.optional(v.string()),
    socialLinks: v.optional(v.string()),
    lastResearchedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Structured intelligence fields — populated by processCompetitorMoves
    competitivityScore: v.optional(v.number()),
    moves: v.optional(
      v.array(
        v.object({
          action: v.string(),
          impact: v.string(),
          sourceUrl: v.optional(v.string()),
          competitivityScore: v.number(),
          recordedAt: v.number(),
        })
      )
    ),
    featureGaps: v.optional(
      v.array(
        v.object({
          feature: v.string(),
          us: v.string(),
          them: v.string(),
          gap: v.string(),
        })
      )
    ),
    // Arrays preferred by UI; legacy string fields (strengths/weaknesses) kept for backward compat
    strengthsList: v.optional(v.array(v.string())),
    weaknessesList: v.optional(v.array(v.string())),
  }).index("by_organization", ["organizationId"]),
};
