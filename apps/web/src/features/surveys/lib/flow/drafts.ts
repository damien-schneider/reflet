import type {
  DraftTarget,
  QuestionDraft,
} from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import type {
  FlowTarget,
  LogicRule,
  SurveyEnding,
  SurveyQuestion,
} from "@reflet/survey-core";
import { endingsOf } from "@reflet/survey-core";

/** Ending targets the survey doesn't have fall back to its first ending. */
const resolveDraftTarget = <QuestionId extends string>(
  target: DraftTarget,
  questionIds: readonly QuestionId[],
  storedEndings?: readonly SurveyEnding[]
): FlowTarget<QuestionId> | undefined => {
  if (target.kind === "question") {
    const questionId = questionIds[target.questionIndex];
    return questionId === undefined
      ? undefined
      : { kind: "question", questionId };
  }
  const endings = endingsOf(storedEndings);
  const ending =
    endings.find((candidate) => candidate.id === target.endingId) ?? endings[0];
  return ending ? { endingId: ending.id, kind: "ending" } : undefined;
};

const resolveDraftRules = <QuestionId extends string>(
  draft: QuestionDraft,
  questionIds: readonly QuestionId[],
  storedEndings?: readonly SurveyEnding[]
): LogicRule<QuestionId>[] =>
  (draft.logic ?? []).flatMap((rule) => {
    const target = resolveDraftTarget(rule.target, questionIds, storedEndings);
    return target ? [{ ...rule, target }] : [];
  });

/** What the drafts become once created with these ids, in this order; used for previews. */
export const resolveDraftQuestions = <QuestionId extends string>(
  drafts: readonly QuestionDraft[],
  questionIds: readonly QuestionId[],
  storedEndings?: readonly SurveyEnding[]
): SurveyQuestion<QuestionId>[] =>
  drafts.flatMap((draft, order) => {
    const questionId = questionIds[order];
    if (questionId === undefined) {
      return [];
    }
    const { logic: _logic, next, ...fields } = draft;
    const resolvedNext = next
      ? resolveDraftTarget(next, questionIds, storedEndings)
      : undefined;
    return [
      {
        ...fields,
        _id: questionId,
        logic: resolveDraftRules(draft, questionIds, storedEndings),
        order,
        ...(resolvedNext ? { next: resolvedNext } : {}),
      },
    ];
  });
