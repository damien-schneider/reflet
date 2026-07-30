import { defineTable } from "convex/server";
import { v } from "convex/values";

export const questionTypeValidator = v.union(
  v.literal("rating"),
  v.literal("nps"),
  v.literal("text"),
  v.literal("single_choice"),
  v.literal("multiple_choice"),
  v.literal("boolean")
);

export const surveyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("closed")
);

export const triggerTypeValidator = v.union(
  v.literal("manual"),
  v.literal("page_visit"),
  v.literal("time_delay"),
  v.literal("exit_intent"),
  v.literal("feedback_submitted")
);

export const questionConfigValidator = v.optional(
  v.object({
    choices: v.optional(v.array(v.string())),
    maxLabel: v.optional(v.string()),
    maxLength: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    minLabel: v.optional(v.string()),
    minValue: v.optional(v.number()),
    placeholder: v.optional(v.string()),
  })
);

export const triggerConfigValidator = v.optional(
  v.object({
    delayMs: v.optional(v.number()),
    pageUrl: v.optional(v.string()),
    sampleRate: v.optional(v.number()),
  })
);

export const responseStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned")
);

export const answerValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string())
);

export const conditionalLogicConditionValidator = v.union(
  v.literal("equals"),
  v.literal("not_equals"),
  v.literal("greater_than"),
  v.literal("less_than"),
  v.literal("contains"),
  v.literal("answered"),
  v.literal("not_answered")
);

export const conditionalLogicValidator = v.optional(
  v.object({
    condition: v.optional(conditionalLogicConditionValidator),
    dependsOn: v.optional(v.id("surveyQuestions")),
    value: v.optional(v.union(v.string(), v.number(), v.boolean())),
  })
);

export const surveyTables = {
  surveyAnswers: defineTable({
    answeredAt: v.number(),
    organizationId: v.id("organizations"),
    questionId: v.id("surveyQuestions"),
    responseId: v.id("surveyResponses"),
    surveyId: v.id("surveys"),
    value: answerValueValidator,
  })
    .index("by_response", ["responseId"])
    .index("by_question", ["questionId"])
    .index("by_survey", ["surveyId"])
    .index("by_survey_date", ["surveyId", "answeredAt"]),

  surveyQuestions: defineTable({
    conditionalLogic: conditionalLogicValidator,
    config: questionConfigValidator,
    description: v.optional(v.string()),
    order: v.number(),
    organizationId: v.id("organizations"),
    required: v.boolean(),
    surveyId: v.id("surveys"),
    title: v.string(),
    type: questionTypeValidator,
  })
    .index("by_survey", ["surveyId"])
    .index("by_survey_order", ["surveyId", "order"]),

  surveyResponses: defineTable({
    completedAt: v.optional(v.number()),
    externalUserId: v.optional(v.id("externalUsers")),
    metadata: v.optional(
      v.object({
        pageUrl: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    organizationId: v.id("organizations"),
    respondentId: v.optional(v.string()),
    startedAt: v.number(),
    status: responseStatusValidator,
    surveyId: v.id("surveys"),
  })
    .index("by_survey", ["surveyId"])
    .index("by_survey_status", ["surveyId", "status"])
    .index("by_organization", ["organizationId"]),
  surveys: defineTable({
    completionRate: v.number(),
    createdAt: v.number(),
    createdBy: v.string(),
    description: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
    organizationId: v.id("organizations"),
    responseCount: v.number(),
    startsAt: v.optional(v.number()),
    status: surveyStatusValidator,
    title: v.string(),
    triggerConfig: triggerConfigValidator,
    triggerType: triggerTypeValidator,
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"]),
};
