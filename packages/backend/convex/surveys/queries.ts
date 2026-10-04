import {
  displayOf,
  endingsOf,
  sortByOrder,
  takesAnswer,
} from "@reflet/survey-core";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { completedSoFar } from "./lib/completed_count";
import {
  EXPORT_READ_LIMITS,
  loadRecentResponses,
} from "./lib/insights/recent_responses";
import {
  exportRowValidator,
  listResponseRows,
  loadExternalUsers,
  responseRowValidator,
  toExportRow,
} from "./lib/insights/response_rows";
import {
  flowTargetValidator,
  logicRuleValidator,
  questionConfigValidator,
  questionTypeValidator,
  responseStatusValidator,
  surveyDisplayValidator,
  surveyEndingValidator,
  surveyStatusValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "./tableFields";

const loadSurveyForMember = async (ctx: QueryCtx, surveyId: Id<"surveys">) => {
  const survey = await ctx.db.get(surveyId);
  if (!survey) {
    throw new Error("Survey not found");
  }
  await requireOrgMember(ctx, survey.organizationId);
  return survey;
};

const loadQuestions = (ctx: QueryCtx, surveyId: Id<"surveys">) =>
  ctx.db
    .query("surveyQuestions")
    .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
    .collect();

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(surveyStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const { status } = args;
    const surveysQuery = status
      ? ctx.db
          .query("surveys")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status)
          )
      : ctx.db
          .query("surveys")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", args.organizationId)
          );

    const surveys = await surveysQuery.order("desc").collect();

    return await Promise.all(
      surveys.map(async (survey) => ({
        _id: survey._id,
        completedCount: completedSoFar(survey),
        completionRate: survey.completionRate,
        createdAt: survey.createdAt,
        description: survey.description,
        linkEnabled: survey.linkEnabled ?? false,
        questionCount: (await loadQuestions(ctx, survey._id)).length,
        responseCount: survey.responseCount,
        status: survey.status,
        title: survey.title,
        triggerType: survey.triggerType,
        updatedAt: survey.updatedAt,
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("surveys"),
      completedCount: v.number(),
      completionRate: v.number(),
      createdAt: v.number(),
      description: v.optional(v.string()),
      linkEnabled: v.boolean(),
      questionCount: v.number(),
      responseCount: v.number(),
      status: surveyStatusValidator,
      title: v.string(),
      triggerType: triggerTypeValidator,
      updatedAt: v.number(),
    })
  ),
});

export const get = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      return null;
    }
    await requireOrgMember(ctx, survey.organizationId);

    const questions = sortByOrder(await loadQuestions(ctx, args.surveyId));

    return {
      _id: survey._id,
      completedCount: completedSoFar(survey),
      completionRate: survey.completionRate,
      createdAt: survey.createdAt,
      createdBy: survey.createdBy,
      description: survey.description,
      display: displayOf(survey.display),
      endings: endingsOf(survey.endings),
      endsAt: survey.endsAt,
      linkEnabled: survey.linkEnabled ?? false,
      maxResponses: survey.maxResponses,
      organizationId: survey.organizationId,
      questions: questions.map((question) => ({
        _id: question._id,
        config: question.config,
        description: question.description,
        logic: question.logic,
        next: question.next,
        order: question.order,
        required: question.required,
        title: question.title,
        type: question.type,
      })),
      responseCount: survey.responseCount,
      startsAt: survey.startsAt,
      status: survey.status,
      title: survey.title,
      triggerConfig: survey.triggerConfig,
      triggerType: survey.triggerType,
      updatedAt: survey.updatedAt,
    };
  },
  returns: v.union(
    v.object({
      _id: v.id("surveys"),
      completedCount: v.number(),
      completionRate: v.number(),
      createdAt: v.number(),
      createdBy: v.string(),
      description: v.optional(v.string()),
      display: surveyDisplayValidator,
      endings: v.array(surveyEndingValidator),
      endsAt: v.optional(v.number()),
      linkEnabled: v.boolean(),
      maxResponses: v.optional(v.number()),
      organizationId: v.id("organizations"),
      questions: v.array(
        v.object({
          _id: v.id("surveyQuestions"),
          config: questionConfigValidator,
          description: v.optional(v.string()),
          logic: v.optional(v.array(logicRuleValidator)),
          next: v.optional(flowTargetValidator),
          order: v.number(),
          required: v.boolean(),
          title: v.string(),
          type: questionTypeValidator,
        })
      ),
      responseCount: v.number(),
      startsAt: v.optional(v.number()),
      status: surveyStatusValidator,
      title: v.string(),
      triggerConfig: triggerConfigValidator,
      triggerType: triggerTypeValidator,
      updatedAt: v.number(),
    }),
    v.null()
  ),
});

export const listResponses = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(responseStatusValidator),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    await loadSurveyForMember(ctx, args.surveyId);
    return await listResponseRows(ctx, args);
  },
  returns: paginationResultValidator(responseRowValidator),
});

export const exportResponses = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    await loadSurveyForMember(ctx, args.surveyId);

    const questions = sortByOrder(await loadQuestions(ctx, args.surveyId));
    const { answersByResponse, responses, truncated } =
      await loadRecentResponses(ctx, args.surveyId, EXPORT_READ_LIMITS);
    const users = await loadExternalUsers(ctx, responses);
    const questionsById = new Map(questions.map((q) => [q._id, q]));

    return {
      questions: questions
        .filter((question) => takesAnswer(question.type))
        .map((question) => ({
          _id: question._id,
          title: question.title,
          type: question.type,
        })),
      rows: responses.map((response) =>
        toExportRow(
          response,
          answersByResponse.get(response._id) ?? [],
          questionsById,
          users
        )
      ),
      truncated,
    };
  },
  returns: v.object({
    questions: v.array(
      v.object({
        _id: v.id("surveyQuestions"),
        title: v.string(),
        type: questionTypeValidator,
      })
    ),
    rows: v.array(exportRowValidator),
    truncated: v.boolean(),
  }),
});
