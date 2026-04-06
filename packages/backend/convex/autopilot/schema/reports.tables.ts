import { defineTable } from "convex/server";
import { v } from "convex/values";
import { assignedAgent, priority } from "./validators";

const reportType = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("on_demand")
);

const trend = v.union(v.literal("up"), v.literal("down"), v.literal("stable"));

export const reportsTables = {
  autopilotReports: defineTable({
    organizationId: v.id("organizations"),
    reportType,
    title: v.string(),
    executiveSummary: v.string(),
    healthScore: v.number(),
    sections: v.array(
      v.object({
        heading: v.string(),
        content: v.string(),
        metrics: v.array(
          v.object({
            label: v.string(),
            value: v.string(),
            trend,
          })
        ),
      })
    ),
    recommendations: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        priority,
      })
    ),
    sourceAgent: v.optional(assignedAgent),
    tags: v.array(v.string()),

    // Review/inbox
    needsReview: v.boolean(),
    reviewedAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),

    // Status
    archived: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_type", ["organizationId", "reportType"])
    .index("by_org_review", ["organizationId", "needsReview"]),
};
