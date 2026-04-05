import { defineTable } from "convex/server";
import { v } from "convex/values";
import { agentThreadRole, assignedAgent } from "./validators";

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
};
