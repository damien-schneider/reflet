import { defineTable } from "convex/server";
import { v } from "convex/values";
import { assignedAgent } from "./validators";

export const documentsTables = {
  autopilotDocuments: defineTable({
    organizationId: v.id("organizations"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    sourceAgent: v.optional(assignedAgent),
    linkedTable: v.optional(v.string()),
    linkedId: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_org_agent", ["organizationId", "sourceAgent"])
    .index("by_linked", ["linkedTable", "linkedId"]),
};
