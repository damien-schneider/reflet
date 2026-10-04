import { OPERATORS_BY_TYPE, takesAnswer } from "@reflet/survey-core";
import { ConvexError, type Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type {
  flowTargetValidator,
  logicRuleValidator,
  questionTypeValidator,
} from "../tableFields";

export type StoredTarget = Infer<typeof flowTargetValidator>;
export type StoredRule = Infer<typeof logicRuleValidator>;
type QuestionType = Infer<typeof questionTypeValidator>;
type Question = Doc<"surveyQuestions">;

/** Jumps must land on an existing, later question or an existing ending so flows never loop. */
export const assertTargetValid = (
  target: StoredTarget,
  fromOrder: number,
  siblings: readonly Pick<Question, "_id" | "order">[],
  endingIds: readonly string[]
): void => {
  if (target.kind === "ending") {
    if (!endingIds.includes(target.endingId)) {
      throw new ConvexError(
        "This jump points to an ending that doesn't exist."
      );
    }
    return;
  }
  const destination = siblings.find((q) => q._id === target.questionId);
  if (!destination) {
    throw new ConvexError(
      "This jump points to a question that doesn't exist in this survey."
    );
  }
  if (destination.order <= fromOrder) {
    throw new ConvexError("Jumps can only go to a later question.");
  }
};

/** Statements ignore rules, and each type only supports its own operators. */
export const rulesUsableBy = (
  type: QuestionType,
  logic: readonly StoredRule[] | undefined
): StoredRule[] | undefined => {
  if (!(logic && takesAnswer(type))) {
    return;
  }
  return logic.filter((rule) =>
    OPERATORS_BY_TYPE[type].includes(rule.operator)
  );
};

/** Drops rules and clears `next` that point at removed targets; null when nothing changes. */
const withoutTargets = (
  question: Question,
  isRemoved: (target: StoredTarget) => boolean
): {
  logic: StoredRule[] | undefined;
  next: StoredTarget | undefined;
} | null => {
  const logic = question.logic?.filter((rule) => !isRemoved(rule.target));
  const clearsNext = question.next !== undefined && isRemoved(question.next);
  const dropsRules = (logic?.length ?? 0) !== (question.logic?.length ?? 0);
  if (!(clearsNext || dropsRules)) {
    return null;
  }
  return { logic, next: clearsNext ? undefined : question.next };
};

export const stripTargets = async (
  ctx: MutationCtx,
  questions: readonly Question[],
  isRemoved: (target: StoredTarget) => boolean
): Promise<void> => {
  for (const question of questions) {
    const stripped = withoutTargets(question, isRemoved);
    if (stripped) {
      await ctx.db.patch(question._id, stripped);
    }
  }
};

export const remapTarget = (
  target: StoredTarget,
  newIdOf: ReadonlyMap<Id<"surveyQuestions">, Id<"surveyQuestions">>
): StoredTarget | undefined => {
  if (target.kind === "ending") {
    return target;
  }
  const questionId = newIdOf.get(target.questionId);
  return questionId ? { kind: "question", questionId } : undefined;
};

/** The first question whose rule or `next` would jump backward under `orderedIds`. */
export const backwardJumpFrom = (
  questions: readonly Question[],
  orderedIds: readonly Id<"surveyQuestions">[]
): Question | undefined => {
  const positionOf = new Map(orderedIds.map((id, index) => [id, index]));
  const jumpsBackward = (from: Question, target: StoredTarget | undefined) =>
    target?.kind === "question" &&
    (positionOf.get(target.questionId) ?? -1) <=
      (positionOf.get(from._id) ?? 0);
  return questions.find(
    (question) =>
      jumpsBackward(question, question.next) ||
      (question.logic ?? []).some((rule) =>
        jumpsBackward(question, rule.target)
      )
  );
};

/** Writes orders 0..n-1 following the given sequence. */
export const renumber = async (
  ctx: MutationCtx,
  orderedQuestions: readonly Pick<Question, "_id" | "order">[]
): Promise<void> => {
  for (const [index, question] of orderedQuestions.entries()) {
    if (question.order !== index) {
      await ctx.db.patch(question._id, { order: index });
    }
  }
};
