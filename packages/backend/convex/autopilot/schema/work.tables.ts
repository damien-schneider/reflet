import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  assignedAgent,
  priority,
  workItemStatus,
  workItemType,
} from "./validators";

export const workTables = {
  autopilotWorkItems: defineTable({
    organizationId: v.id("organizations"),
    type: workItemType,
    parentId: v.optional(v.id("autopilotWorkItems")),
    title: v.string(),
    description: v.string(),
    status: workItemStatus,
    priority,
    assignedAgent: v.optional(assignedAgent),

    // Review/inbox — replaces autopilotInboxItems
    needsReview: v.boolean(),
    reviewType: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    // Execution (for dev tasks)
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    branch: v.optional(v.string()),

    // Initiative-specific
    completionPercent: v.optional(v.number()),

    // Spec-specific
    acceptanceCriteria: v.optional(v.array(v.string())),

    // Public roadmap & changelog
    isPublicRoadmap: v.optional(v.boolean()),
    includeInChangelog: v.optional(v.boolean()),
    createdByUser: v.optional(v.string()),

    // Metadata
    tags: v.optional(v.array(v.string())),

    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_agent", ["organizationId", "assignedAgent"])
    .index("by_org_review", ["organizationId", "needsReview"])
    .index("by_org_public", ["organizationId", "isPublicRoadmap"])
    .index("by_parent", ["parentId"]),

  feedbackTaskLinks: defineTable({
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    workItemId: v.id("autopilotWorkItems"),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_work_item", ["workItemId"])
    .index("by_organization", ["organizationId"]),
};
