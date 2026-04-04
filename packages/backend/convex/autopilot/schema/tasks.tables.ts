import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityLogAgent,
  activityLogLevel,
  assignedAgent,
  autonomyLevel,
  autopilotTaskPriority,
  autopilotTaskStatus,
  codingAdapterType,
  runStatus,
  taskOrigin,
} from "./validators";

export const tasksTables = {
  autopilotTasks: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    status: autopilotTaskStatus,
    priority: autopilotTaskPriority,
    assignedAgent,
    origin: taskOrigin,
    autonomyLevel,
    parentTaskId: v.optional(v.id("autopilotTasks")),
    blockedByTaskId: v.optional(v.id("autopilotTasks")),
    technicalSpec: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    retryCount: v.number(),
    maxRetries: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // New: link tasks to initiatives/stories/specs
    initiativeId: v.optional(v.id("autopilotInitiatives")),
    userStoryId: v.optional(v.id("autopilotUserStories")),
    technicalSpecId: v.optional(v.id("autopilotTechnicalSpecs")),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_agent", ["organizationId", "assignedAgent"])
    .index("by_org_priority", ["organizationId", "priority"])
    .index("by_parent", ["parentTaskId"])
    .index("by_blocked_by", ["blockedByTaskId"]),

  autopilotRuns: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
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
    .index("by_task", ["taskId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_external_ref", ["externalRef"]),

  autopilotActivityLog: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: activityLogAgent,
    targetAgent: v.optional(activityLogAgent),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_task", ["taskId"]),
};
