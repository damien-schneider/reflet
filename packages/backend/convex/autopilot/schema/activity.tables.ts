import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityEntityType,
  activityLogLevel,
  assignedAgent,
  codingAdapterType,
  runStatus,
} from "./validators";

export const activityTables = {
  autopilotRuns: defineTable({
    organizationId: v.id("organizations"),
    workItemId: v.id("autopilotWorkItems"),
    adapter: codingAdapterType,
    status: runStatus,
    externalRef: v.optional(v.string()),
    branch: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    ciStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed")
      )
    ),
    ciFailureLog: v.optional(v.string()),
    tokensUsed: v.number(),
    estimatedCostUsd: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_work_item", ["workItemId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_external_ref", ["externalRef"]),

  autopilotActivityLog: defineTable({
    organizationId: v.id("organizations"),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: assignedAgent,
    targetAgent: v.optional(assignedAgent),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
    action: v.optional(v.string()),
    entityType: v.optional(activityEntityType),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_work_item", ["workItemId"])
    .index("by_org_action", ["organizationId", "action"]),
};
