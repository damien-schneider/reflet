import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  autopilotTaskPriority,
  noteCategory,
  noteStatus,
  noteType,
} from "./validators";

export const notesTables = {
  autopilotNotes: defineTable({
    organizationId: v.id("organizations"),
    type: noteType,
    category: noteCategory,
    title: v.string(),
    description: v.string(),
    sourceAgent: v.string(),
    targetAgent: v.optional(v.string()),
    strength: v.number(),
    priority: autopilotTaskPriority,
    status: noteStatus,
    triagedAt: v.optional(v.number()),
    linkedInitiativeId: v.optional(v.id("autopilotInitiatives")),
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_category", ["organizationId", "category"])
    .index("by_org_created", ["organizationId", "createdAt"]),
};
