import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pricingModel = v.union(
  v.literal("free"),
  v.literal("freemium"),
  v.literal("paid"),
  v.literal("open_source"),
  v.literal("enterprise"),
  v.literal("unknown")
);

export const productProfileEditedBy = v.union(
  v.literal("agent"),
  v.literal("user")
);

const productProfileSnapshot = v.object({
  productName: v.string(),
  tagline: v.string(),
  oneLiner: v.string(),
  category: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  valueProposition: v.string(),
  differentiators: v.array(v.string()),
  primaryUserVerbs: v.array(v.string()),
  targetAudienceTags: v.array(v.string()),
  pricingModel: v.optional(pricingModel),
});

export const productProfileTables = {
  autopilotProductProfile: defineTable({
    organizationId: v.id("organizations"),
    productName: v.string(),
    tagline: v.string(),
    oneLiner: v.string(),
    category: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    valueProposition: v.string(),
    differentiators: v.array(v.string()),
    primaryUserVerbs: v.array(v.string()),
    targetAudienceTags: v.array(v.string()),
    pricingModel: v.optional(pricingModel),
    ownerAgent: v.string(),
    generatedBy: productProfileEditedBy,
    sourceAnalysisId: v.optional(v.id("repoAnalysis")),
    version: v.number(),
    userEdited: v.boolean(),
    userEditedAt: v.optional(v.number()),
    userEditProtectedUntil: v.optional(v.number()),
    stalenessAlertDays: v.number(),
    lastUpdatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  autopilotProductProfileVersions: defineTable({
    profileId: v.id("autopilotProductProfile"),
    version: v.number(),
    snapshot: productProfileSnapshot,
    editedBy: productProfileEditedBy,
    editingAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),
};
