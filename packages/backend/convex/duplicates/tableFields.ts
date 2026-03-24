import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const duplicateTables = {
  duplicatePairs: defineTable({
    organizationId: v.id("organizations"),
    feedbackIdA: v.id("feedback"),
    feedbackIdB: v.id("feedback"),
    similarityScore: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("merged")
    ),
    detectedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_feedback_a", ["feedbackIdA"])
    .index("by_feedback_b", ["feedbackIdB"]),

  mergeHistory: defineTable({
    organizationId: v.id("organizations"),
    sourceFeedbackId: v.id("feedback"),
    targetFeedbackId: v.id("feedback"),
    mergedBy: v.string(),
    mergedAt: v.number(),
    sourceTitle: v.string(),
    sourceDescription: v.string(),
    sourceVoteCount: v.number(),
    sourceStatus: feedbackStatus,
  }).index("by_organization", ["organizationId"]),
};
