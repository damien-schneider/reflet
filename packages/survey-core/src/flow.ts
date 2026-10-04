import { endingsOf, takesAnswer } from "./defaults";
import type {
  Answers,
  AnswerValue,
  FlowQuestion,
  FlowTarget,
  LogicRule,
  SurveyEnding,
} from "./types";

export type FlowStep<Q extends FlowQuestion> =
  | { kind: "question"; question: Q }
  | { kind: "ending"; ending: SurveyEnding };

export interface FlowPath<Q extends FlowQuestion> {
  ending: SurveyEnding;
  questions: Q[];
}

export const isEmptyAnswer = (value: AnswerValue | undefined): boolean => {
  if (value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

const includesValue = (answer: AnswerValue, expected: unknown): boolean => {
  if (typeof expected !== "string") {
    return false;
  }
  if (Array.isArray(answer)) {
    return answer.includes(expected);
  }
  return (
    typeof answer === "string" &&
    answer.toLowerCase().includes(expected.toLowerCase())
  );
};

const compareNumbers = (
  answer: AnswerValue,
  expected: unknown,
  compare: (answer: number, expected: number) => boolean
): boolean =>
  typeof answer === "number" &&
  typeof expected === "number" &&
  compare(answer, expected);

export const evaluateRule = (
  rule: Pick<LogicRule, "operator" | "value">,
  answer: AnswerValue | undefined
): boolean => {
  const empty = isEmptyAnswer(answer);
  if (rule.operator === "answered") {
    return !empty;
  }
  if (rule.operator === "skipped") {
    return empty;
  }
  if (answer === undefined || empty) {
    return false;
  }
  switch (rule.operator) {
    case "equals":
      return answer === rule.value;
    case "not_equals":
      return answer !== rule.value;
    case "greater_than":
      return compareNumbers(answer, rule.value, (a, b) => a > b);
    case "less_than":
      return compareNumbers(answer, rule.value, (a, b) => a < b);
    case "includes":
      return includesValue(answer, rule.value);
    default:
      return false;
  }
};

export const sortByOrder = <Q extends FlowQuestion>(
  questions: readonly Q[]
): Q[] => [...questions].sort((a, b) => a.order - b.order);

/** `endingsOf` never returns an empty list, so the first ending always exists. */
const firstEnding = (endings: readonly SurveyEnding[]): SurveyEnding =>
  endings[0] as SurveyEnding;

/**
 * Jumps only go forward in question order, so every flow ends. A target that
 * points backward or at a deleted question is ignored and the default path wins.
 */
const stepForTarget = <Q extends FlowQuestion>(
  sorted: readonly Q[],
  from: Q,
  target: FlowTarget,
  endings: readonly SurveyEnding[]
): FlowStep<Q> | null => {
  if (target.kind === "ending") {
    const ending =
      endings.find((candidate) => candidate.id === target.endingId) ??
      firstEnding(endings);
    return { ending, kind: "ending" };
  }
  const question = sorted.find((q) => q._id === target.questionId);
  return question && question.order > from.order
    ? { kind: "question", question }
    : null;
};

const defaultStepAfter = <Q extends FlowQuestion>(
  sorted: readonly Q[],
  from: Q,
  endings: readonly SurveyEnding[]
): FlowStep<Q> => {
  const following = sorted.find((q) => q.order > from.order);
  return following
    ? { kind: "question", question: following }
    : { ending: firstEnding(endings), kind: "ending" };
};

export const firstStep = <Q extends FlowQuestion>(
  questions: readonly Q[],
  storedEndings?: readonly SurveyEnding[]
): FlowStep<Q> => {
  const [first] = sortByOrder(questions);
  return first
    ? { kind: "question", question: first }
    : { ending: firstEnding(endingsOf(storedEndings)), kind: "ending" };
};

export const resolveNextStep = <Q extends FlowQuestion>(
  questions: readonly Q[],
  current: Q,
  answer: AnswerValue | undefined,
  storedEndings?: readonly SurveyEnding[]
): FlowStep<Q> => {
  const sorted = sortByOrder(questions);
  const endings = endingsOf(storedEndings);
  const matchedRule = takesAnswer(current.type)
    ? current.logic?.find((rule) => evaluateRule(rule, answer))
    : undefined;
  const target = matchedRule?.target ?? current.next;
  const jumped = target
    ? stepForTarget(sorted, current, target, endings)
    : null;
  return jumped ?? defaultStepAfter(sorted, current, endings);
};

/** Follows the flow from `start` using known answers; unanswered questions take their skipped path. */
export const walkFrom = <Q extends FlowQuestion>(
  questions: readonly Q[],
  start: FlowStep<Q>,
  answers: Answers,
  storedEndings?: readonly SurveyEnding[]
): FlowPath<Q> => {
  const visited: Q[] = [];
  let step = start;
  while (step.kind === "question" && visited.length <= questions.length) {
    visited.push(step.question);
    step = resolveNextStep(
      questions,
      step.question,
      answers.get(step.question._id),
      storedEndings
    );
  }
  const ending =
    step.kind === "ending"
      ? step.ending
      : firstEnding(endingsOf(storedEndings));
  return { ending, questions: visited };
};

export const walkPath = <Q extends FlowQuestion>(
  questions: readonly Q[],
  answers: Answers,
  storedEndings?: readonly SurveyEnding[]
): FlowPath<Q> =>
  walkFrom(
    questions,
    firstStep(questions, storedEndings),
    answers,
    storedEndings
  );

/** Required questions on the respondent's actual path that still have no answer. */
export const missingRequiredAnswers = <Q extends FlowQuestion>(
  questions: readonly Q[],
  answers: Answers,
  storedEndings?: readonly SurveyEnding[]
): Q[] =>
  walkPath(questions, answers, storedEndings).questions.filter(
    (question) =>
      question.required &&
      takesAnswer(question.type) &&
      isEmptyAnswer(answers.get(question._id))
  );

export type FlowEdge =
  | { from: string; kind: "default"; target: FlowTarget }
  | { from: string; kind: "rule"; rule: LogicRule; target: FlowTarget };

const asTarget = <Q extends FlowQuestion>(step: FlowStep<Q>): FlowTarget =>
  step.kind === "question"
    ? { kind: "question", questionId: step.question._id }
    : { endingId: step.ending.id, kind: "ending" };

/** Every connection a respondent can take, as the runtime would resolve it. */
export const flowEdges = <Q extends FlowQuestion>(
  questions: readonly Q[],
  storedEndings?: readonly SurveyEnding[]
): FlowEdge[] => {
  const sorted = sortByOrder(questions);
  const endings = endingsOf(storedEndings);
  return sorted.flatMap((question): FlowEdge[] => {
    const ruleEdges: FlowEdge[] = takesAnswer(question.type)
      ? (question.logic ?? []).map((rule) => ({
          from: question._id,
          kind: "rule",
          rule,
          target: rule.target,
        }))
      : [];
    const defaultStep =
      (question.next &&
        stepForTarget(sorted, question, question.next, endings)) ||
      defaultStepAfter(sorted, question, endings);
    return [
      ...ruleEdges,
      { from: question._id, kind: "default", target: asTarget(defaultStep) },
    ];
  });
};
