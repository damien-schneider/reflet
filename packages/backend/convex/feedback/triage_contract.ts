import { defineTable } from "convex/server";
import { v } from "convex/values";

export const triageInput = v.object({
  description: v.string(),
  title: v.string(),
});
export const triageQuestion = v.object({
  criteria: v.object({ false: v.string(), true: v.string() }),
  id: v.string(),
  instructions: v.string(),
});
export const triageAnswer = v.object({
  probability: v.number(),
  questionId: v.string(),
});
export const triageSuggestion = v.object({
  name: v.string(),
  outcome: v.union(
    v.literal("applied"),
    v.literal("refused"),
    v.literal("human"),
    v.literal("below_threshold"),
    v.literal("not_selected")
  ),
  probability: v.number(),
  tagId: v.id("tags"),
});
export const triageTag = v.object({
  _id: v.id("tags"),
  description: v.optional(v.string()),
  name: v.string(),
});
export const triageRunFields = {
  answers: v.optional(v.array(triageAnswer)),
  applyModeration: v.boolean(),
  completedAt: v.optional(v.number()),
  criteriaVersion: v.string(),
  error: v.optional(v.string()),
  feedbackId: v.id("feedback"),
  input: triageInput,
  inputVersion: v.string(),
  model: v.string(),
  organizationId: v.id("organizations"),
  publicationDecision: v.optional(v.string()),
  questions: v.array(triageQuestion),
  startedAt: v.number(),
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("stale")
  ),
  suggestions: v.optional(v.array(triageSuggestion)),
  tags: v.array(triageTag),
  thresholds: v.object({
    clarification: v.number(),
    junk: v.number(),
    maxTags: v.number(),
    tag: v.number(),
  }),
};
export const triageTables = {
  feedbackTriageRuns: defineTable(triageRunFields)
    .index("by_feedback", ["feedbackId"])
    .index("by_org_status_completed", [
      "organizationId",
      "status",
      "completedAt",
    ]),
};
