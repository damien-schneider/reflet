import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityEntityType,
  activityLogLevel,
  assignedAgent,
} from "./validators";

export const activityTables = {
  autopilotActivityLog: defineTable({
    organizationId: v.id("organizations"),
    workItemId: v.optional(v.id("autopilotWorkItems")),
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
