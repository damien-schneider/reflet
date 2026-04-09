import { defineTable } from "convex/server";
import { v } from "convex/values";
import { assignedAgent, memoryCategory } from "./validators";

export const memoryTables = {
  autopilotAgentMemories: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    category: memoryCategory,
    key: v.string(),
    value: v.string(),
    outcome: v.optional(
      v.union(v.literal("success"), v.literal("failure"), v.literal("neutral"))
    ),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_agent", ["organizationId", "agent"])
    .index("by_org_agent_category", ["organizationId", "agent", "category"])
    .index("by_org_agent_key", ["organizationId", "agent", "key"]),
};
