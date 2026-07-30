import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const duplicateTables = {
  duplicatePairs: defineTable({
    detectedAt: v.number(),
    feedbackIdA: v.id("feedback"),
    feedbackIdB: v.id("feedback"),
    organizationId: v.id("organizations"),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    similarityScore: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("merged")
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_feedback_a", ["feedbackIdA"])
    .index("by_feedback_b", ["feedbackIdB"]),

  mergeHistory: defineTable({
    mergedAt: v.number(),
    mergedBy: v.string(),
    organizationId: v.id("organizations"),
    sourceDescription: v.string(),
    sourceFeedbackId: v.id("feedback"),
    sourceStatus: feedbackStatus,
    sourceTitle: v.string(),
    sourceVoteCount: v.number(),
    targetFeedbackId: v.id("feedback"),
  }).index("by_organization", ["organizationId"]),
};
