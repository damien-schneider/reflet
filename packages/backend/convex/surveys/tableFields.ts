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
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    minLabel: v.optional(v.string()),
    maxLabel: v.optional(v.string()),
    choices: v.optional(v.array(v.string())),
    placeholder: v.optional(v.string()),
    maxLength: v.optional(v.number()),
  })
);

export const triggerConfigValidator = v.optional(
  v.object({
    pageUrl: v.optional(v.string()),
    delayMs: v.optional(v.number()),
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
    dependsOn: v.optional(v.id("surveyQuestions")),
    condition: v.optional(conditionalLogicConditionValidator),
    value: v.optional(v.union(v.string(), v.number(), v.boolean())),
  })
);

export const surveyTables = {
  surveys: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    status: surveyStatusValidator,
    createdBy: v.string(),
    triggerType: triggerTypeValidator,
    triggerConfig: triggerConfigValidator,
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    maxResponses: v.optional(v.number()),
    responseCount: v.number(),
    completionRate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"]),

  surveyQuestions: defineTable({
    surveyId: v.id("surveys"),
    organizationId: v.id("organizations"),
    type: questionTypeValidator,
    title: v.string(),
    description: v.optional(v.string()),
    required: v.boolean(),
    order: v.number(),
    config: questionConfigValidator,
    conditionalLogic: conditionalLogicValidator,
  })
    .index("by_survey", ["surveyId"])
    .index("by_survey_order", ["surveyId", "order"]),

  surveyResponses: defineTable({
    surveyId: v.id("surveys"),
    organizationId: v.id("organizations"),
    externalUserId: v.optional(v.id("externalUsers")),
    respondentId: v.optional(v.string()),
    status: responseStatusValidator,
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        pageUrl: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
  })
    .index("by_survey", ["surveyId"])
    .index("by_survey_status", ["surveyId", "status"])
    .index("by_organization", ["organizationId"]),

  surveyAnswers: defineTable({
    responseId: v.id("surveyResponses"),
    questionId: v.id("surveyQuestions"),
    surveyId: v.id("surveys"),
    organizationId: v.id("organizations"),
    value: answerValueValidator,
    answeredAt: v.number(),
  })
    .index("by_response", ["responseId"])
    .index("by_question", ["questionId"])
    .index("by_survey", ["surveyId"])
    .index("by_survey_date", ["surveyId", "answeredAt"]),
};
