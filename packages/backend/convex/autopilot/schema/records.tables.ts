import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  architectureDecisionStatus,
  autopilotTaskPriority,
  initiativeCreatedBy,
  initiativeStatus,
  technicalSpecComplexity,
  technicalSpecStatus,
  userStoryStatus,
} from "./validators";

export const recordsTables = {
  autopilotInitiatives: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    status: initiativeStatus,
    priority: autopilotTaskPriority,
    successMetrics: v.optional(v.string()),
    completionPercent: v.number(),
    targetDate: v.optional(v.number()),
    createdBy: initiativeCreatedBy,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  autopilotUserStories: defineTable({
    organizationId: v.id("organizations"),
    initiativeId: v.id("autopilotInitiatives"),
    title: v.string(),
    description: v.string(),
    acceptanceCriteria: v.array(v.string()),
    status: userStoryStatus,
    priority: autopilotTaskPriority,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_initiative", ["initiativeId"])
    .index("by_org_status", ["organizationId", "status"]),

  autopilotTechnicalSpecs: defineTable({
    organizationId: v.id("organizations"),
    userStoryId: v.id("autopilotUserStories"),
    filesToModify: v.array(v.string()),
    filesToCreate: v.array(v.string()),
    changes: v.string(),
    testingRequirements: v.string(),
    complexity: technicalSpecComplexity,
    status: technicalSpecStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_userStory", ["userStoryId"]),

  autopilotArchitectureDecisions: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    context: v.string(),
    decision: v.string(),
    consequences: v.string(),
    status: architectureDecisionStatus,
    relatedInitiativeId: v.optional(v.id("autopilotInitiatives")),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  autopilotDocPages: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    path: v.string(),
    content: v.string(),
    lastVerifiedAt: v.optional(v.number()),
    isStale: v.boolean(),
    relatedInitiativeId: v.optional(v.id("autopilotInitiatives")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_stale", ["organizationId", "isStale"]),
};
