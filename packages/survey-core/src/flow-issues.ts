import { answerIssue } from "./answers";
import {
  endingsOf,
  OPERATORS_BY_TYPE,
  operatorTakesValue,
  ratingRange,
  takesAnswer,
} from "./defaults";
import { flowEdges, sortByOrder } from "./flow";
import type {
  FlowTarget,
  LogicRule,
  SurveyEnding,
  SurveyQuestion,
} from "./types";

export interface FlowIssue {
  message: string;
  questionId?: string;
  ruleId?: string;
  /** Errors block publishing; warnings only show in the editor. */
  severity: "error" | "warning";
}

const MIN_CHOICES = 2;

const questionShapeIssues = (question: SurveyQuestion): FlowIssue[] => {
  const issues: FlowIssue[] = [];
  const at = (message: string, severity: FlowIssue["severity"] = "error") =>
    issues.push({ message, questionId: question._id, severity });

  if (question.title.trim() === "") {
    at("Add a question title.");
  }
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    const choices = question.config?.choices ?? [];
    if (choices.length < MIN_CHOICES) {
      at(`Add at least ${MIN_CHOICES} options.`);
    }
    if (choices.some((choice) => choice.trim() === "")) {
      at("Fill in or remove empty options.");
    }
    if (new Set(choices).size !== choices.length) {
      at("Options must be unique.");
    }
  }
  if (question.type === "rating") {
    const { max, min } = ratingRange(question.config);
    if (min >= max) {
      at("The lowest rating must be below the highest.");
    }
  }
  return issues;
};

const targetIssue = (
  question: SurveyQuestion,
  target: FlowTarget,
  byId: ReadonlyMap<string, SurveyQuestion>,
  endings: readonly SurveyEnding[]
): string | null => {
  if (target.kind === "ending") {
    return endings.some((ending) => ending.id === target.endingId)
      ? null
      : "This jump points to an ending that no longer exists.";
  }
  const destination = byId.get(target.questionId);
  if (!destination) {
    return "This jump points to a question that no longer exists.";
  }
  return destination.order > question.order
    ? null
    : "Jumps can only go to a later question.";
};

export const ruleIssue = (
  question: Pick<SurveyQuestion, "config" | "type">,
  rule: Pick<LogicRule, "operator" | "value">
): string | null => {
  if (!OPERATORS_BY_TYPE[question.type].includes(rule.operator)) {
    return "This condition doesn’t apply to this question type.";
  }
  if (!operatorTakesValue(rule.operator)) {
    return null;
  }
  if (rule.value === undefined) {
    return "Pick a value for this condition.";
  }
  if (question.type === "text") {
    return typeof rule.value === "string" && rule.value.trim() !== ""
      ? null
      : "Type the text to look for.";
  }
  const comparesBound =
    rule.operator === "greater_than" || rule.operator === "less_than";
  if (comparesBound) {
    return typeof rule.value === "number"
      ? null
      : "Pick a number for this condition.";
  }
  const asAnswer =
    question.type === "multiple_choice" ? [String(rule.value)] : rule.value;
  return answerIssue(
    { ...question, config: { ...question.config, allowOther: false } },
    asAnswer
  ) === null
    ? null
    : "This value isn’t one of the question’s answers.";
};

const unreachableIssues = (
  sorted: readonly SurveyQuestion[],
  endings: readonly SurveyEnding[]
): FlowIssue[] => {
  const [first] = sorted;
  if (!first) {
    return [];
  }
  const orderOf = new Map(
    sorted.map((question) => [question._id, question.order])
  );
  const reached = new Set<string>([first._id]);
  for (const edge of flowEdges(sorted, endings)) {
    if (!reached.has(edge.from) || edge.target.kind !== "question") {
      continue;
    }
    const isForwardJump =
      (orderOf.get(edge.target.questionId) ?? -1) >
      (orderOf.get(edge.from) ?? 0);
    if (isForwardJump) {
      reached.add(edge.target.questionId);
    }
  }
  return sorted
    .filter((question) => !reached.has(question._id))
    .map((question) => ({
      message: "No path leads to this question.",
      questionId: question._id,
      severity: "warning",
    }));
};

/** Everything that would make the flow behave differently from what the editor shows. */
export const flowIssues = (
  questions: readonly SurveyQuestion[],
  storedEndings?: readonly SurveyEnding[]
): FlowIssue[] => {
  const sorted = sortByOrder(questions);
  const endings = endingsOf(storedEndings);
  if (!sorted.some((question) => takesAnswer(question.type))) {
    return [{ message: "Add at least one question.", severity: "error" }];
  }
  const byId = new Map(sorted.map((question) => [question._id, question]));
  const issues = sorted.flatMap((question) => {
    const ruleIssues = (question.logic ?? []).flatMap((rule) => {
      const message =
        ruleIssue(question, rule) ??
        targetIssue(question, rule.target, byId, endings);
      return message
        ? [
            {
              message,
              questionId: question._id,
              ruleId: rule.id,
              severity: "error" as const,
            },
          ]
        : [];
    });
    const nextMessage =
      question.next && targetIssue(question, question.next, byId, endings);
    const nextIssues: FlowIssue[] = nextMessage
      ? [{ message: nextMessage, questionId: question._id, severity: "error" }]
      : [];
    return [...questionShapeIssues(question), ...ruleIssues, ...nextIssues];
  });
  for (const ending of endings) {
    if (ending.title.trim() === "") {
      issues.push({ message: "Give every ending a title.", severity: "error" });
    }
  }
  return [...issues, ...unreachableIssues(sorted, endings)];
};

export const hasBlockingIssues = (issues: readonly FlowIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");
