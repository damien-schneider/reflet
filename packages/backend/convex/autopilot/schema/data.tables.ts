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

  autopilotSecurityFindings: defineTable({
    organizationId: v.id("organizations"),
    scanId: v.optional(v.string()),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("info")
    ),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    filePath: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    status: v.union(
      v.literal("open"),
      v.literal("fixing"),
      v.literal("fixed"),
      v.literal("dismissed")
    ),
    fixedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_severity", ["organizationId", "severity"])
    .index("by_org_status", ["organizationId", "status"]),

  autopilotSupportConversations: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    subject: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("drafted"),
      v.literal("replied"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
    agentDraftReply: v.optional(v.string()),
    approvedReply: v.optional(v.string()),
    escalatedTo: v.optional(v.string()),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    messages: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),
};
