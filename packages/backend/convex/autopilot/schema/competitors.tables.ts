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
  }).index("by_organization", ["organizationId"]),
};
