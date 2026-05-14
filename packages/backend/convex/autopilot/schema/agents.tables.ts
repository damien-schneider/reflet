import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  agentThreadRole,
  agentWorkStreamStatus,
  assignedAgent,
} from "./validators";

export const agentsTables = {
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

  autopilotAgentWorkStreams: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    workItemId: v.optional(v.id("autopilotWorkItems")),
    title: v.string(),
    status: agentWorkStreamStatus,
    content: v.string(),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_updated", ["organizationId", "updatedAt"])
    .index("by_org_agent_updated", ["organizationId", "agent", "updatedAt"])
    .index("by_org_agent_status", ["organizationId", "agent", "status"]),
};
