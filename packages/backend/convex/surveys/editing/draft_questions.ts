import { ConvexError, type Infer } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type {
  draftTargetValidator,
  questionDraftValidator,
} from "../tableFields";
import { rulesUsableBy, type StoredRule, type StoredTarget } from "./flow_edit";

export type QuestionDraft = Infer<typeof questionDraftValidator>;
type DraftTarget = Infer<typeof draftTargetValidator>;

/** How a batch of drafts maps onto real records; draft targets name questions by their index in the batch. */
export interface DraftScope {
  draftLabel: "Question" | "New step";
  endingIds: readonly string[];
  /** Used for endings the survey doesn't have; without it those drafts are rejected. */
  fallbackEndingId?: string;
  questionIds: readonly Id<"surveyQuestions">[];
}

const resolveDraftTarget = (
  target: DraftTarget,
  fromIndex: number,
  scope: DraftScope
): StoredTarget => {
  const label = `${scope.draftLabel} ${fromIndex + 1}`;
  if (target.kind === "ending") {
    if (scope.endingIds.includes(target.endingId)) {
      return target;
    }
    if (scope.fallbackEndingId === undefined) {
      throw new ConvexError(`${label} jumps to an ending that doesn't exist.`);
    }
    return { endingId: scope.fallbackEndingId, kind: "ending" };
  }
  const questionId = Number.isInteger(target.questionIndex)
    ? scope.questionIds[target.questionIndex]
    : undefined;
  if (!questionId) {
    throw new ConvexError(`${label} jumps to a question that doesn't exist.`);
  }
  if (target.questionIndex <= fromIndex) {
    throw new ConvexError(`${label} can only jump to a later question.`);
  }
  return { kind: "question", questionId };
};

export const resolveDraftLinks = (
  draft: QuestionDraft,
  index: number,
  scope: DraftScope
): { logic: StoredRule[] | undefined; next: StoredTarget | undefined } => ({
  logic: rulesUsableBy(
    draft.type,
    draft.logic?.map((rule) => ({
      ...rule,
      target: resolveDraftTarget(rule.target, index, scope),
    }))
  ),
  next: draft.next && resolveDraftTarget(draft.next, index, scope),
});

/** Inserts the drafts' question rows without their jumps, at consecutive orders from `firstOrder`. */
export const insertDraftRows = async (
  ctx: MutationCtx,
  batch: {
    drafts: readonly QuestionDraft[];
    firstOrder: number;
    organizationId: Id<"organizations">;
    surveyId: Id<"surveys">;
  }
): Promise<Id<"surveyQuestions">[]> => {
  const questionIds: Id<"surveyQuestions">[] = [];
  for (const [index, draft] of batch.drafts.entries()) {
    questionIds.push(
      await ctx.db.insert("surveyQuestions", {
        config: draft.config,
        description: draft.description,
        order: batch.firstOrder + index,
        organizationId: batch.organizationId,
        required: draft.required,
        surveyId: batch.surveyId,
        title: draft.title,
        type: draft.type,
      })
    );
  }
  return questionIds;
};
