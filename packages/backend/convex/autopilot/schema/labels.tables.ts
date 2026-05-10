import { defineTable } from "convex/server";
import { v } from "convex/values";

export const labelsTables = {
  // Org-scoped work item labels with optional hierarchy.
  workItemLabels: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    parentLabelId: v.optional(v.id("workItemLabels")),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_parent", ["organizationId", "parentLabelId"]),

  // Many-to-many work item ↔ label.
  workItemLabelLinks: defineTable({
    organizationId: v.id("organizations"),
    workItemId: v.id("autopilotWorkItems"),
    labelId: v.id("workItemLabels"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_work_item", ["workItemId"])
    .index("by_label", ["labelId"])
    .index("by_work_item_label", ["workItemId", "labelId"]),
};
