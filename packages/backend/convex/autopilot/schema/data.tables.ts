import { defineTable } from "convex/server";
import { v } from "convex/values";
import { leadSource, leadStatus } from "./validators";

export const dataTables = {
  autopilotRevenueSnapshots: defineTable({
    activeSubscriptions: v.number(),
    arr: v.number(),
    cancelledSubscriptions: v.optional(v.number()),
    churnRate: v.optional(v.number()),
    createdAt: v.number(),
    mrr: v.number(),
    newSubscriptions: v.optional(v.number()),
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
  })
    .index("by_org_date", ["organizationId", "snapshotDate"])
    .index("by_organization", ["organizationId"]),

  autopilotRepoAnalysis: defineTable({
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
    techStack: v.optional(v.string()),
    framework: v.optional(v.string()),
    hasCI: v.optional(v.boolean()),
    hasTests: v.optional(v.boolean()),
    hasDocs: v.optional(v.boolean()),
    hasLandingPage: v.optional(v.boolean()),
    hasAnalytics: v.optional(v.boolean()),
    hasMonitoring: v.optional(v.boolean()),
    projectStructure: v.optional(v.string()),
    maturityLevel: v.optional(
      v.union(
        v.literal("new"),
        v.literal("early"),
        v.literal("established"),
        v.literal("mature")
      )
    ),
    findings: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  autopilotLeads: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    source: leadSource,
    status: leadStatus,
    sourceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
    githubUsername: v.optional(v.string()),
    githubProfileUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    nextFollowUpAt: v.optional(v.number()),
    convertedAt: v.optional(v.number()),
    outreachCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_source", ["organizationId", "source"])
    .index("by_org_follow_up", ["organizationId", "nextFollowUpAt"]),
};
