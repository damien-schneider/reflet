import { defineTable } from "convex/server";
import { v } from "convex/values";

export const viewScope = v.union(v.literal("personal"), v.literal("shared"));

export const viewsTables = {
  // Saved tasks views — personal or shared per org.
  userViews: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    name: v.string(),
    scope: viewScope,
    filtersJson: v.string(),
    sortKey: v.optional(v.string()),
    groupKey: v.optional(v.string()),
    viewMode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_user", ["organizationId", "userId"]),
};
