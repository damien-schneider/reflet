import { endingsOf, flowEdges } from "@reflet/survey-core";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { loadSortedQuestions } from "../respondent/public_survey";
import { assertButtonLinksSafe } from "./button_links";
import {
  type DraftScope,
  insertDraftRows,
  type QuestionDraft,
  resolveDraftLinks,
} from "./draft_questions";
import {
  assertTargetValid,
  renumber,
  type StoredRule,
  type StoredTarget,
} from "./flow_edit";

type Question = Doc<"surveyQuestions">;
type QuestionId = Id<"surveyQuestions">;

/** `null` inserts first, `undefined` appends. */
export type InsertAfter = QuestionId | null | undefined;

export interface JumpToSplit {
  questionId: QuestionId;
  /** Absent when the jump being split is the question's explicit `next`. */
  ruleId?: string;
}

export const insertIndexFor = (
  questions: readonly Question[],
  after: InsertAfter
): number => {
  if (after === null) {
    return 0;
  }
  if (after === undefined) {
    return questions.length;
  }
  const afterIndex = questions.findIndex((question) => question._id === after);
  if (afterIndex === -1) {
    throw new ConvexError("Question not found in this survey.");
  }
  return afterIndex + 1;
};

/** Where `source` goes when no rule matches, as the runtime resolves it today. */
const defaultTargetOf = (
  questions: readonly Question[],
  source: Question,
  endings: Doc<"surveys">["endings"]
): StoredTarget | undefined => {
  const edge = flowEdges(questions, endings).find(
    (candidate) => candidate.kind === "default" && candidate.from === source._id
  );
  if (edge?.target.kind === "ending") {
    return { endingId: edge.target.endingId, kind: "ending" };
  }
  const destination = questions.find(
    (question) =>
      edge?.target.kind === "question" &&
      question._id === edge.target.questionId
  );
  return destination && { kind: "question", questionId: destination._id };
};

interface SplitPlan {
  formerTarget: StoredTarget;
  rewireSource: (firstInsertedId: QuestionId) => {
    logic?: StoredRule[];
    next: StoredTarget | undefined;
  };
  source: Question;
}

/** Resolved before inserting, so the source's implicit default path is read from the original order. */
const planSplit = (
  questions: readonly Question[],
  endings: Doc<"surveys">["endings"],
  split: JumpToSplit
): SplitPlan => {
  const source = questions.find(
    (question) => question._id === split.questionId
  );
  if (!source) {
    throw new ConvexError("Question not found in this survey.");
  }
  const formerTarget =
    split.ruleId === undefined
      ? source.next
      : source.logic?.find((rule) => rule.id === split.ruleId)?.target;
  if (!formerTarget) {
    throw new ConvexError("That jump no longer exists. Reload and try again.");
  }
  if (split.ruleId === undefined) {
    return {
      formerTarget,
      rewireSource: (firstInsertedId) => ({
        next: { kind: "question", questionId: firstInsertedId },
      }),
      source,
    };
  }
  const keptDefault =
    source.next ?? defaultTargetOf(questions, source, endings);
  return {
    formerTarget,
    rewireSource: (firstInsertedId) => ({
      logic: (source.logic ?? []).map((rule) =>
        rule.id === split.ruleId
          ? {
              ...rule,
              target: { kind: "question", questionId: firstInsertedId },
            }
          : rule
      ),
      next: keptDefault,
    }),
    source,
  };
};

/**
 * Inserts the drafts as consecutive steps with their jumps, optionally routing an
 * existing jump through them; any invalid target rejects the whole insert.
 */
export const insertStepsIntoSurvey = async (
  ctx: MutationCtx,
  survey: Doc<"surveys">,
  input: { after?: InsertAfter; drafts: QuestionDraft[]; splits?: JumpToSplit }
): Promise<QuestionId[]> => {
  if (input.drafts.length === 0) {
    throw new ConvexError("Add at least one step.");
  }
  assertButtonLinksSafe({ configs: input.drafts.map((draft) => draft.config) });
  const questions = await loadSortedQuestions(ctx, survey._id);
  const insertAt = insertIndexFor(questions, input.after);
  const split =
    input.splits && planSplit(questions, survey.endings, input.splits);

  const insertedIds = await insertDraftRows(ctx, {
    drafts: input.drafts,
    firstOrder: insertAt,
    organizationId: survey.organizationId,
    surveyId: survey._id,
  });
  const orderedIds = [
    ...questions.slice(0, insertAt).map((question) => question._id),
    ...insertedIds,
    ...questions.slice(insertAt).map((question) => question._id),
  ];
  await renumber(ctx, [
    ...questions.slice(0, insertAt),
    ...insertedIds.map((_id, index) => ({ _id, order: insertAt + index })),
    ...questions.slice(insertAt),
  ]);

  const siblings = orderedIds.map((_id, order) => ({ _id, order }));
  const endingIds = endingsOf(survey.endings).map((ending) => ending.id);
  const patchWithValidJumps = async (
    questionId: QuestionId,
    links: { logic?: StoredRule[]; next: StoredTarget | undefined }
  ) => {
    const fromOrder = orderedIds.indexOf(questionId);
    const targets = [
      ...(links.logic ?? []).map((rule) => rule.target),
      ...(links.next ? [links.next] : []),
    ];
    for (const target of targets) {
      assertTargetValid(target, fromOrder, siblings, endingIds);
    }
    await ctx.db.patch(questionId, links);
  };

  const scope: DraftScope = {
    draftLabel: "New step",
    endingIds,
    fallbackEndingId: endingIds[0],
    questionIds: insertedIds,
  };
  const lastIndex = input.drafts.length - 1;
  for (const [index, draft] of input.drafts.entries()) {
    const questionId = insertedIds[index];
    const links = resolveDraftLinks(draft, index, scope);
    const next =
      index === lastIndex && !draft.next ? split?.formerTarget : links.next;
    if (questionId && (links.logic || next)) {
      await patchWithValidJumps(questionId, { logic: links.logic, next });
    }
  }
  const [firstInsertedId] = insertedIds;
  if (split && firstInsertedId) {
    await patchWithValidJumps(
      split.source._id,
      split.rewireSource(firstInsertedId)
    );
  }
  return insertedIds;
};
