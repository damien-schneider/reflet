import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityLogAgent,
  agentThreadRole,
  assignedAgent,
  inboxItemType,
} from "./validators";

export const agentsTables = {
  autopilotAgentMemory: defineTable({
    agent: activityLogAgent,
    content: v.string(),
    createdAt: v.number(),
    memoryType: v.union(
      v.literal("context"),
      v.literal("preference"),
      v.literal("summary")
    ),
    organizationId: v.id("organizations"),
    updatedAt: v.number(),
  }).index("by_org_agent", ["organizationId", "agent"]),

  autopilotAgentThreads: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    threadId: v.string(),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_agent", ["organizationId", "agent"]),

  autopilotAgentMessages: defineTable({
    organizationId: v.id("organizations"),
    threadId: v.id("autopilotAgentThreads"),
    role: agentThreadRole,
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_org_thread", ["organizationId", "threadId"]),

  autopilotAgentMetrics: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    period: v.string(),
    tasksCompleted: v.number(),
    tasksFailed: v.number(),
    avgCompletionTimeMs: v.optional(v.number()),
    approvalRate: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_agent", ["organizationId", "agent"])
    .index("by_org_period", ["organizationId", "period"]),

  autopilotFeedbackLog: defineTable({
    organizationId: v.id("organizations"),
    inboxItemId: v.id("autopilotInboxItems"),
    agent: activityLogAgent,
    itemType: inboxItemType,
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_agent", ["organizationId", "agent"])
    .index("by_inbox_item", ["inboxItemId"]),
};
