import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityEntityType,
  activityLogLevel,
  assignedRole,
  autopilotExecutionActionKind,
  autopilotExecutionStatus,
  autopilotExecutionTriggerReason,
  chainNodeKind,
  roleSkill,
} from "./validators";

export const activityTables = {
  autopilotActivityLog: defineTable({
    organizationId: v.id("organizations"),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    role: assignedRole,
    targetRole: v.optional(assignedRole),
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

  autopilotExecutions: defineTable({
    organizationId: v.id("organizations"),
    role: roleSkill,
    status: autopilotExecutionStatus,
    triggerReason: autopilotExecutionTriggerReason,
    actionKind: autopilotExecutionActionKind,
    title: v.string(),
    chainNode: v.optional(chainNodeKind),
    workItemId: v.optional(v.id("autopilotWorkItems")),
    branch: v.optional(v.string()),
    blockerKind: v.optional(v.string()),
    blockerMessage: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    maxRetries: v.number(),
    nextRetryAt: v.optional(v.number()),
    queuedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_role_status", ["organizationId", "role", "status"])
    .index("by_org_branch_status", ["organizationId", "branch", "status"]),

  autopilotDeliverableStates: defineTable({
    organizationId: v.id("organizations"),
    node: chainNodeKind,
    sourceCommitSha: v.optional(v.string()),
    currentCommitSha: v.optional(v.string()),
    sourceCommitCount: v.number(),
    currentCommitCount: v.number(),
    lastCheckedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_node", ["organizationId", "node"]),
};
