import { defineTable } from "convex/server";
import { v } from "convex/values";

export const questionTypeValidator = v.union(
  v.literal("rating"),
  v.literal("nps"),
  v.literal("text"),
  v.literal("single_choice"),
  v.literal("multiple_choice"),
  v.literal("boolean"),
  v.literal("statement")
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
  v.literal("feedback_submitted"),
  v.literal("event")
);

export const ratingStyleValidator = v.union(
  v.literal("number"),
  v.literal("star"),
  v.literal("emoji")
);

export const questionConfigValidator = v.optional(
  v.object({
    allowOther: v.optional(v.boolean()),
    buttonLabel: v.optional(v.string()),
    buttonUrl: v.optional(v.string()),
    choices: v.optional(v.array(v.string())),
    maxLabel: v.optional(v.string()),
    maxLength: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    minLabel: v.optional(v.string()),
    minValue: v.optional(v.number()),
    placeholder: v.optional(v.string()),
    ratingStyle: v.optional(ratingStyleValidator),
  })
);

export const triggerConfigValidator = v.optional(
  v.object({
    delayMs: v.optional(v.number()),
    eventName: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    sampleRate: v.optional(v.number()),
  })
);

export const responseStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned")
);

export const responseChannelValidator = v.union(
  v.literal("in_app"),
  v.literal("link")
);

export const answerValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string())
);

export const logicOperatorValidator = v.union(
  v.literal("equals"),
  v.literal("not_equals"),
  v.literal("greater_than"),
  v.literal("less_than"),
  v.literal("includes"),
  v.literal("answered"),
  v.literal("skipped")
);

export const ruleValueValidator = v.union(v.string(), v.number(), v.boolean());

export const flowTargetValidator = v.union(
  v.object({
    kind: v.literal("question"),
    questionId: v.id("surveyQuestions"),
  }),
  v.object({ endingId: v.string(), kind: v.literal("ending") })
);

export const logicRuleValidator = v.object({
  id: v.string(),
  operator: logicOperatorValidator,
  target: flowTargetValidator,
  value: v.optional(ruleValueValidator),
});

export const draftTargetValidator = v.union(
  v.object({ kind: v.literal("question"), questionIndex: v.number() }),
  v.object({ endingId: v.string(), kind: v.literal("ending") })
);

export const draftRuleValidator = v.object({
  id: v.string(),
  operator: logicOperatorValidator,
  target: draftTargetValidator,
  value: v.optional(ruleValueValidator),
});

export const questionDraftValidator = v.object({
  config: questionConfigValidator,
  description: v.optional(v.string()),
  logic: v.optional(v.array(draftRuleValidator)),
  next: v.optional(draftTargetValidator),
  required: v.boolean(),
  title: v.string(),
  type: questionTypeValidator,
});

export const surveyEndingValidator = v.object({
  buttonLabel: v.optional(v.string()),
  buttonUrl: v.optional(v.string()),
  description: v.optional(v.string()),
  id: v.string(),
  title: v.string(),
});

export const surveyDisplayValidator = v.object({
  frequency: v.union(
    v.literal("once"),
    v.literal("until_completed"),
    v.literal("recurring")
  ),
  position: v.optional(
    v.union(
      v.literal("bottom_right"),
      v.literal("bottom_left"),
      v.literal("center")
    )
  ),
  recontactDays: v.optional(v.number()),
});

export const publicQuestionValidator = v.object({
  _id: v.id("surveyQuestions"),
  config: questionConfigValidator,
  description: v.optional(v.string()),
  logic: v.optional(v.array(logicRuleValidator)),
  next: v.optional(flowTargetValidator),
  order: v.number(),
  required: v.boolean(),
  title: v.string(),
  type: questionTypeValidator,
});

export const publicSurveyValidator = v.object({
  _id: v.id("surveys"),
  description: v.optional(v.string()),
  display: surveyDisplayValidator,
  endings: v.array(surveyEndingValidator),
  questions: v.array(publicQuestionValidator),
  title: v.string(),
  triggerConfig: triggerConfigValidator,
  triggerType: triggerTypeValidator,
});

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
    config: questionConfigValidator,
    description: v.optional(v.string()),
    logic: v.optional(v.array(logicRuleValidator)),
    next: v.optional(flowTargetValidator),
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
    channel: v.optional(responseChannelValidator),
    completedAt: v.optional(v.number()),
    endingId: v.optional(v.string()),
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
    .index("by_survey_respondent", ["surveyId", "respondentId"])
    .index("by_survey_external_user", ["surveyId", "externalUserId"])
    .index("by_status_started", ["status", "startedAt"])
    .index("by_organization", ["organizationId"]),

  surveys: defineTable({
    completedCount: v.optional(v.number()),
    completionRate: v.number(),
    createdAt: v.number(),
    createdBy: v.string(),
    description: v.optional(v.string()),
    display: v.optional(surveyDisplayValidator),
    endings: v.optional(v.array(surveyEndingValidator)),
    endsAt: v.optional(v.number()),
    linkEnabled: v.optional(v.boolean()),
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
