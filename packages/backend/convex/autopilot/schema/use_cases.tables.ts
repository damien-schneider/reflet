import { defineTable } from "convex/server";
import { v } from "convex/values";

const validatorScoreObject = v.object({
  cost: v.number(),
  devComplexity: v.number(),
  maintainability: v.number(),
  utility: v.number(),
  audienceBreadth: v.number(),
  composite: v.number(),
  rationale: v.string(),
  recommendation: v.union(
    v.literal("publish"),
    v.literal("revise"),
    v.literal("reject")
  ),
  scoredAt: v.number(),
});

export const useCasesTables = {
  autopilotUseCases: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    personaIds: v.array(v.id("autopilotPersonas")),
    triggerScenario: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    sourceDocIds: v.array(v.id("autopilotDocuments")),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("archived")
    ),
    validation: v.optional(validatorScoreObject),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),
};

export { validatorScoreObject };
