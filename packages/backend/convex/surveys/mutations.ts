import { endingsOf, ruleIssue } from "@reflet/survey-core";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { assertButtonLinksSafe } from "./editing/button_links";
import { deleteQuestionAnswers, deleteSurveyCascade } from "./editing/cleanup";
import {
  assertTargetValid,
  backwardJumpFrom,
  renumber,
  rulesUsableBy,
  stripTargets,
} from "./editing/flow_edit";
import { insertIndexFor, insertStepsIntoSurvey } from "./editing/insert_steps";
import {
  changeSurveyStatus,
  duplicateSurveyRecords,
  insertSurveyWithQuestions,
  updateSurveySettings,
} from "./editing/survey_write";
import { loadSortedQuestions } from "./respondent/public_survey";
import {
  flowTargetValidator,
  logicRuleValidator,
  questionConfigValidator,
  questionDraftValidator,
  questionTypeValidator,
  surveyDisplayValidator,
  surveyEndingValidator,
  surveyStatusValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "./tableFields";

const loadManagedSurvey = async (
  ctx: MutationCtx,
  surveyId: Id<"surveys">,
  action: string
): Promise<{ survey: Doc<"surveys">; userId: string }> => {
  const survey = await ctx.db.get(surveyId);
  if (!survey) {
    throw new ConvexError("Survey not found.");
  }
  const { user } = await requireOrgAdmin(ctx, survey.organizationId, action);
  return { survey, userId: user._id };
};

const loadManagedQuestion = async (
  ctx: MutationCtx,
  questionId: Id<"surveyQuestions">
): Promise<{ question: Doc<"surveyQuestions">; survey: Doc<"surveys"> }> => {
  const question = await ctx.db.get(questionId);
  if (!question) {
    throw new ConvexError("Question not found.");
  }
  const { survey } = await loadManagedSurvey(
    ctx,
    question.surveyId,
    "manage survey questions"
  );
  return { question, survey };
};

export const create = mutation({
  args: {
    description: v.optional(v.string()),
    display: v.optional(surveyDisplayValidator),
    endings: v.optional(v.array(surveyEndingValidator)),
    organizationId: v.id("organizations"),
    questions: v.array(questionDraftValidator),
    title: v.string(),
    triggerConfig: triggerConfigValidator,
    triggerType: triggerTypeValidator,
  },
  handler: async (ctx, { organizationId, ...input }) => {
    const { user } = await requireOrgAdmin(
      ctx,
      organizationId,
      "create surveys"
    );
    return await insertSurveyWithQuestions(ctx, {
      ...input,
      createdBy: user._id,
      organizationId,
    });
  },
  returns: v.id("surveys"),
});

export const update = mutation({
  args: {
    description: v.optional(v.string()),
    display: v.optional(surveyDisplayValidator),
    endings: v.optional(v.array(surveyEndingValidator)),
    endsAt: v.optional(v.union(v.number(), v.null())),
    linkEnabled: v.optional(v.boolean()),
    maxResponses: v.optional(v.union(v.number(), v.null())),
    startsAt: v.optional(v.union(v.number(), v.null())),
    surveyId: v.id("surveys"),
    title: v.optional(v.string()),
    triggerConfig: triggerConfigValidator,
    triggerType: v.optional(triggerTypeValidator),
  },
  handler: async (ctx, { surveyId, ...settings }) => {
    const { survey } = await loadManagedSurvey(ctx, surveyId, "update surveys");
    await updateSurveySettings(ctx, survey, settings);
    return null;
  },
  returns: v.null(),
});

export const updateStatus = mutation({
  args: { status: surveyStatusValidator, surveyId: v.id("surveys") },
  handler: async (ctx, args) => {
    const { survey } = await loadManagedSurvey(
      ctx,
      args.surveyId,
      "change survey status"
    );
    await changeSurveyStatus(ctx, survey, args.status);
    return null;
  },
  returns: v.null(),
});

export const deleteSurvey = mutation({
  args: { surveyId: v.id("surveys") },
  handler: async (ctx, args) => {
    const { survey } = await loadManagedSurvey(
      ctx,
      args.surveyId,
      "delete surveys"
    );
    await deleteSurveyCascade(ctx, survey);
    return null;
  },
  returns: v.null(),
});

export const duplicate = mutation({
  args: { surveyId: v.id("surveys"), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { survey, userId } = await loadManagedSurvey(
      ctx,
      args.surveyId,
      "duplicate surveys"
    );
    return await duplicateSurveyRecords(ctx, survey, {
      createdBy: userId,
      title: args.title,
    });
  },
  returns: v.id("surveys"),
});

export const addQuestion = mutation({
  args: {
    after: v.optional(v.union(v.id("surveyQuestions"), v.null())),
    question: v.object({
      config: questionConfigValidator,
      description: v.optional(v.string()),
      required: v.boolean(),
      title: v.string(),
      type: questionTypeValidator,
    }),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const { survey } = await loadManagedSurvey(
      ctx,
      args.surveyId,
      "manage survey questions"
    );
    assertButtonLinksSafe({ configs: [args.question.config] });
    const questions = await loadSortedQuestions(ctx, survey._id);
    const insertAt = insertIndexFor(questions, args.after);
    const questionId = await ctx.db.insert("surveyQuestions", {
      ...args.question,
      order: insertAt,
      organizationId: survey.organizationId,
      surveyId: survey._id,
    });
    await renumber(ctx, [
      ...questions.slice(0, insertAt),
      { _id: questionId, order: insertAt },
      ...questions.slice(insertAt),
    ]);
    return questionId;
  },
  returns: v.id("surveyQuestions"),
});

/** Inserts drafted steps and their jumps in one transaction, optionally routing an existing jump through them. */
export const insertSteps = mutation({
  args: {
    after: v.optional(v.union(v.id("surveyQuestions"), v.null())),
    drafts: v.array(questionDraftValidator),
    splits: v.optional(
      v.object({
        questionId: v.id("surveyQuestions"),
        ruleId: v.optional(v.string()),
      })
    ),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, { surveyId, ...input }) => {
    const { survey } = await loadManagedSurvey(
      ctx,
      surveyId,
      "manage survey questions"
    );
    return await insertStepsIntoSurvey(ctx, survey, input);
  },
  returns: v.array(v.id("surveyQuestions")),
});

export const updateQuestion = mutation({
  args: {
    config: questionConfigValidator,
    description: v.optional(v.string()),
    logic: v.optional(v.array(logicRuleValidator)),
    next: v.optional(v.union(flowTargetValidator, v.null())),
    questionId: v.id("surveyQuestions"),
    required: v.optional(v.boolean()),
    title: v.optional(v.string()),
    type: v.optional(questionTypeValidator),
  },
  handler: async (ctx, { logic, next, questionId, type, ...fields }) => {
    const { question, survey } = await loadManagedQuestion(ctx, questionId);
    assertButtonLinksSafe({ configs: [fields.config] });
    const siblings = await loadSortedQuestions(ctx, survey._id);
    const endingIds = endingsOf(survey.endings).map((ending) => ending.id);
    const targets = [
      ...(logic ?? []).map((rule) => rule.target),
      ...(next ? [next] : []),
    ];
    for (const target of targets) {
      assertTargetValid(target, question.order, siblings, endingIds);
    }
    const nextType = type ?? question.type;
    const carriedOverLogic =
      logic ??
      question.logic?.filter(
        (rule) =>
          ruleIssue(
            { config: fields.config ?? question.config, type: nextType },
            rule
          ) === null
      );
    const nextLogic = rulesUsableBy(nextType, carriedOverLogic);
    const shouldRewriteLogic =
      logic !== undefined || (type !== undefined && type !== question.type);
    await ctx.db.patch(questionId, {
      ...(fields.title === undefined ? {} : { title: fields.title }),
      ...(fields.description === undefined
        ? {}
        : { description: fields.description }),
      ...(fields.required === undefined ? {} : { required: fields.required }),
      ...(fields.config === undefined ? {} : { config: fields.config }),
      ...(type === undefined ? {} : { type }),
      ...(shouldRewriteLogic ? { logic: nextLogic } : {}),
      ...(next === undefined ? {} : { next: next ?? undefined }),
    });
    return null;
  },
  returns: v.null(),
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("surveyQuestions") },
  handler: async (ctx, args) => {
    const { question, survey } = await loadManagedQuestion(
      ctx,
      args.questionId
    );
    await ctx.db.delete(question._id);
    const remaining = (await loadSortedQuestions(ctx, survey._id)).filter(
      (q) => q._id !== question._id
    );
    await stripTargets(
      ctx,
      remaining,
      (target) =>
        target.kind === "question" && target.questionId === question._id
    );
    await renumber(ctx, remaining);
    await deleteQuestionAnswers(ctx, question._id);
    return null;
  },
  returns: v.null(),
});

export const reorderQuestions = mutation({
  args: {
    questionIds: v.array(v.id("surveyQuestions")),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const { survey } = await loadManagedSurvey(
      ctx,
      args.surveyId,
      "manage survey questions"
    );
    const questions = await loadSortedQuestions(ctx, survey._id);
    const byId = new Map(questions.map((q) => [q._id, q]));
    const orderedQuestions = args.questionIds.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });
    const isFullPermutation =
      args.questionIds.length === questions.length &&
      new Set(args.questionIds).size === questions.length &&
      orderedQuestions.length === questions.length;
    if (!isFullPermutation) {
      throw new ConvexError("List every question of this survey exactly once.");
    }
    const backward = backwardJumpFrom(orderedQuestions, args.questionIds);
    if (backward) {
      throw new ConvexError(
        `“${backward.title}” would jump back to an earlier question. Remove that jump first.`
      );
    }
    await renumber(ctx, orderedQuestions);
    return null;
  },
  returns: v.null(),
});
