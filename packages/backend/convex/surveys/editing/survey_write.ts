import { endingsOf, flowIssues } from "@reflet/survey-core";
import { ConvexError, type Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { hasReachedCap } from "../respondent/eligibility";
import { loadSortedQuestions } from "../respondent/public_survey";
import type {
  surveyDisplayValidator,
  surveyEndingValidator,
  surveyStatusValidator,
  triggerConfigValidator,
  triggerTypeValidator,
} from "../tableFields";
import { assertButtonLinksSafe } from "./button_links";
import {
  insertDraftRows,
  type QuestionDraft,
  resolveDraftLinks,
} from "./draft_questions";
import { remapTarget, stripTargets } from "./flow_edit";

type SurveyEnding = Infer<typeof surveyEndingValidator>;

export interface SurveySettings {
  description?: string;
  display?: Infer<typeof surveyDisplayValidator>;
  endings?: SurveyEnding[];
  endsAt?: number | null;
  linkEnabled?: boolean;
  maxResponses?: number | null;
  startsAt?: number | null;
  title?: string;
  triggerConfig?: Infer<typeof triggerConfigValidator>;
  triggerType?: Infer<typeof triggerTypeValidator>;
}

const assertEndingsValid = (endings: readonly SurveyEnding[] | undefined) => {
  const ids = (endings ?? []).map((ending) => ending.id.trim());
  if (ids.some((id) => id === "")) {
    throw new ConvexError("Every ending needs an id.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new ConvexError("Ending ids must be unique.");
  }
};

/** Creates a draft survey; draft targets reference questions by their index in `questions`. */
export const insertSurveyWithQuestions = async (
  ctx: MutationCtx,
  input: {
    createdBy: string;
    description?: string;
    display?: Infer<typeof surveyDisplayValidator>;
    endings?: SurveyEnding[];
    organizationId: Id<"organizations">;
    questions: QuestionDraft[];
    title: string;
    triggerConfig?: Infer<typeof triggerConfigValidator>;
    triggerType: Infer<typeof triggerTypeValidator>;
  }
): Promise<Id<"surveys">> => {
  assertEndingsValid(input.endings);
  assertButtonLinksSafe({
    configs: input.questions.map((draft) => draft.config),
    endings: input.endings,
  });
  const endingIds = endingsOf(input.endings).map((ending) => ending.id);
  const now = Date.now();
  const surveyId = await ctx.db.insert("surveys", {
    completedCount: 0,
    completionRate: 0,
    createdAt: now,
    createdBy: input.createdBy,
    description: input.description,
    display: input.display,
    endings: input.endings,
    organizationId: input.organizationId,
    responseCount: 0,
    status: "draft",
    title: input.title,
    triggerConfig: input.triggerConfig,
    triggerType: input.triggerType,
    updatedAt: now,
  });

  const questionIds = await insertDraftRows(ctx, {
    drafts: input.questions,
    firstOrder: 0,
    organizationId: input.organizationId,
    surveyId,
  });
  for (const [index, draft] of input.questions.entries()) {
    const questionId = questionIds[index];
    if (questionId && (draft.logic || draft.next)) {
      await ctx.db.patch(
        questionId,
        resolveDraftLinks(draft, index, {
          draftLabel: "Question",
          endingIds,
          questionIds,
        })
      );
    }
  }
  return surveyId;
};

/** Copies a survey as a new draft, pointing every jump at the copied questions. */
export const duplicateSurveyRecords = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">,
  copy: { createdBy: string; title?: string }
): Promise<Id<"surveys">> => {
  const now = Date.now();
  const newSurveyId = await ctx.db.insert("surveys", {
    completedCount: 0,
    completionRate: 0,
    createdAt: now,
    createdBy: copy.createdBy,
    description: survey.description,
    display: survey.display,
    endings: survey.endings,
    linkEnabled: survey.linkEnabled,
    maxResponses: survey.maxResponses,
    organizationId: survey.organizationId,
    responseCount: 0,
    status: "draft",
    title: copy.title ?? `${survey.title} (copy)`,
    triggerConfig: survey.triggerConfig,
    triggerType: survey.triggerType,
    updatedAt: now,
  });

  const questions = await loadSortedQuestions(ctx, survey._id);
  const newIdOf = new Map<Id<"surveyQuestions">, Id<"surveyQuestions">>();
  for (const [order, question] of questions.entries()) {
    newIdOf.set(
      question._id,
      await ctx.db.insert("surveyQuestions", {
        config: question.config,
        description: question.description,
        order,
        organizationId: survey.organizationId,
        required: question.required,
        surveyId: newSurveyId,
        title: question.title,
        type: question.type,
      })
    );
  }
  for (const question of questions) {
    const copiedId = newIdOf.get(question._id);
    if (!(copiedId && (question.logic || question.next))) {
      continue;
    }
    await ctx.db.patch(copiedId, {
      logic: question.logic?.flatMap((rule) => {
        const target = remapTarget(rule.target, newIdOf);
        return target ? [{ ...rule, target }] : [];
      }),
      next: question.next && remapTarget(question.next, newIdOf),
    });
  }
  return newSurveyId;
};

/** Publishing requires a flow without blocking issues and room under the response cap. */
export const changeSurveyStatus = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">,
  status: Infer<typeof surveyStatusValidator>
): Promise<void> => {
  if (status === "active" && survey.status !== "active") {
    if (hasReachedCap(survey)) {
      throw new ConvexError(
        "This survey reached its response limit. Raise or remove the limit before reopening it."
      );
    }
    const questions = await loadSortedQuestions(ctx, survey._id);
    const blocking = flowIssues(questions, survey.endings).find(
      (issue) => issue.severity === "error"
    );
    if (blocking) {
      const position = questions.findIndex(
        (q) => q._id === blocking.questionId
      );
      throw new ConvexError(
        position === -1
          ? blocking.message
          : `Question ${position + 1}: ${blocking.message}`
      );
    }
  }
  await ctx.db.patch(survey._id, { status, updatedAt: Date.now() });
};

const assertScheduleValid = (
  survey: Doc<"surveys">,
  settings: SurveySettings
) => {
  if (
    typeof settings.maxResponses === "number" &&
    !(Number.isInteger(settings.maxResponses) && settings.maxResponses > 0)
  ) {
    throw new ConvexError(
      "The response limit must be a whole number above zero."
    );
  }
  const startsAt =
    settings.startsAt === undefined ? survey.startsAt : settings.startsAt;
  const endsAt =
    settings.endsAt === undefined ? survey.endsAt : settings.endsAt;
  if (
    typeof startsAt === "number" &&
    typeof endsAt === "number" &&
    endsAt <= startsAt
  ) {
    throw new ConvexError("The survey must end after it starts.");
  }
};

/** `null` clears a schedule or cap; removed endings stop being jump targets. */
export const updateSurveySettings = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">,
  settings: SurveySettings
): Promise<void> => {
  assertScheduleValid(survey, settings);
  if (settings.endings !== undefined) {
    assertEndingsValid(settings.endings);
    assertButtonLinksSafe({ endings: settings.endings });
    const keptEndingIds = endingsOf(settings.endings).map(
      (ending) => ending.id
    );
    await stripTargets(
      ctx,
      await loadSortedQuestions(ctx, survey._id),
      (target) =>
        target.kind === "ending" && !keptEndingIds.includes(target.endingId)
    );
  }
  const { endsAt, maxResponses, startsAt } = settings;
  await ctx.db.patch(survey._id, {
    ...(settings.title === undefined ? {} : { title: settings.title }),
    ...(settings.description === undefined
      ? {}
      : { description: settings.description }),
    ...(settings.triggerType === undefined
      ? {}
      : { triggerType: settings.triggerType }),
    ...(settings.triggerConfig === undefined
      ? {}
      : { triggerConfig: settings.triggerConfig }),
    ...(settings.display === undefined ? {} : { display: settings.display }),
    ...(settings.endings === undefined ? {} : { endings: settings.endings }),
    ...(settings.linkEnabled === undefined
      ? {}
      : { linkEnabled: settings.linkEnabled }),
    ...(startsAt === undefined ? {} : { startsAt: startsAt ?? undefined }),
    ...(endsAt === undefined ? {} : { endsAt: endsAt ?? undefined }),
    ...(maxResponses === undefined
      ? {}
      : { maxResponses: maxResponses ?? undefined }),
    updatedAt: Date.now(),
  });
};
