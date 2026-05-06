import { defineTable } from "convex/server";
import { v } from "convex/values";
import { validatorScoreObject } from "./use_cases.tables";
import {
  assignedAgent,
  documentStatus,
  documentType,
  impactLevel,
} from "./validators";

export const documentsTables = {
  autopilotDocuments: defineTable({
    organizationId: v.id("organizations"),
    type: documentType,
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    sourceAgent: v.optional(assignedAgent),
    status: documentStatus,

    // Chain dependencies — upstream docs this artifact derives from
    dependsOnDocIds: v.optional(v.array(v.id("autopilotDocuments"))),

    // Validator scoring (set by validator agent)
    validation: v.optional(validatorScoreObject),

    // Review/inbox
    needsReview: v.boolean(),
    reviewType: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    // Linking
    linkedWorkItemId: v.optional(v.id("autopilotWorkItems")),
    linkedCompetitorId: v.optional(v.id("autopilotCompetitors")),
    linkedLeadId: v.optional(v.id("autopilotLeads")),

    // Research metadata
    relevanceScore: v.optional(v.number()),
    impactLevel: v.optional(impactLevel),
    sourceUrls: v.optional(v.array(v.string())),
    keyFindings: v.optional(v.array(v.string())),

    // Growth content metadata (platform targeting)
    platform: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    publishedUrl: v.optional(v.string()),

    // Flexible metadata (support thread messages, email headers, etc.)
    metadata: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_org_agent", ["organizationId", "sourceAgent"])
    .index("by_org_review", ["organizationId", "needsReview"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_linked_work", ["linkedWorkItemId"]),
};
