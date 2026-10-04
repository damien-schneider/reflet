import {
  answerIssue,
  DEFAULT_ENDING,
  type FlowTarget,
  flowIssues,
  OPERATORS_BY_TYPE,
  operatorTakesValue,
  type RuleValue,
  type SurveyQuestion,
  takesAnswer,
} from "@reflet/survey-core";
import { ConvexError } from "convex/values";
import { cleanText, normalizeQuestionConfig } from "./ai_draft_config";
import type {
  DraftRule,
  DraftTarget,
  GeneratedDraft,
  GeneratedQuestion,
  GeneratedRule,
  GeneratedTarget,
  QuestionDraft,
  SurveyDraft,
} from "./ai_draft_schema";

export const MAX_DRAFT_QUESTIONS = 6;
const MAX_RULES_PER_QUESTION = 4;
const MAX_SURVEY_TITLE_CHARS = 120;
const MAX_QUESTION_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 300;
const MAX_RULE_TEXT_CHARS = 100;

const NO_QUESTIONS_MESSAGE =
  "The AI couldn’t turn that into survey questions. Describe what you want to learn and try again.";

const BOOLEAN_WORDS = new Map<string, boolean>([
  ["false", false],
  ["no", false],
  ["true", true],
  ["yes", true],
]);

type DraftBase = Omit<QuestionDraft, "logic" | "next">;

interface KeptQuestion {
  base: DraftBase;
  source: GeneratedQuestion;
  sourceIndex: number;
}

interface FlowContext {
  index: number;
  indexBySource: ReadonlyMap<number, number>;
  questionCount: number;
}

const toDraftBase = (source: GeneratedQuestion): DraftBase | null => {
  const title = cleanText(source.title, MAX_QUESTION_TITLE_CHARS);
  const config = normalizeQuestionConfig(source);
  if (!title || config === null) {
    return null;
  }
  const description = cleanText(source.description, MAX_DESCRIPTION_CHARS);
  return {
    ...(config ? { config } : {}),
    ...(description ? { description } : {}),
    required: takesAnswer(source.type) && source.required,
    title,
    type: source.type,
  };
};

const keepQuestions = (
  questions: readonly GeneratedQuestion[]
): KeptQuestion[] => {
  const kept: KeptQuestion[] = [];
  for (const [sourceIndex, source] of questions.entries()) {
    const base = toDraftBase(source);
    if (base) {
      kept.push({ base, source, sourceIndex });
    }
    if (kept.length === MAX_DRAFT_QUESTIONS) {
      break;
    }
  }
  return kept;
};

const candidateRuleValue = (
  question: DraftBase,
  value: RuleValue
): RuleValue | undefined => {
  switch (question.type) {
    case "nps":
    case "rating":
      return typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : value;
    case "boolean":
      return typeof value === "string"
        ? BOOLEAN_WORDS.get(value.trim().toLowerCase())
        : value;
    case "single_choice":
    case "multiple_choice": {
      const wanted = String(value).trim().toLocaleLowerCase();
      return question.config?.choices?.find(
        (choice) => choice.toLocaleLowerCase() === wanted
      );
    }
    case "text":
      return cleanText(String(value), MAX_RULE_TEXT_CHARS);
    default:
      return undefined;
  }
};

/** Coerces the model's value to one the question can actually receive, or undefined when it can't. */
const validRuleValue = (
  question: DraftBase,
  value: RuleValue | undefined
): RuleValue | undefined => {
  const candidate =
    value === undefined ? undefined : candidateRuleValue(question, value);
  if (candidate === undefined) {
    return undefined;
  }
  const asAnswer =
    question.type === "multiple_choice" ? [String(candidate)] : candidate;
  const issue = answerIssue(
    { config: { ...question.config, allowOther: false }, type: question.type },
    asAnswer
  );
  return issue === null ? candidate : undefined;
};

const resolveTarget = (
  target: GeneratedTarget,
  { index, indexBySource }: FlowContext
): DraftTarget | null => {
  if (target.kind === "ending") {
    const isDefaultEnding =
      target.endingId === undefined || target.endingId === DEFAULT_ENDING.id;
    return isDefaultEnding
      ? { endingId: DEFAULT_ENDING.id, kind: "ending" }
      : null;
  }
  const questionIndex =
    target.questionIndex === undefined
      ? undefined
      : indexBySource.get(target.questionIndex);
  return questionIndex !== undefined && questionIndex > index
    ? { kind: "question", questionIndex }
    : null;
};

const normalizeRule = (
  question: DraftBase,
  rule: GeneratedRule,
  context: FlowContext
): Omit<DraftRule, "id"> | null => {
  if (!OPERATORS_BY_TYPE[question.type].includes(rule.operator)) {
    return null;
  }
  const target = resolveTarget(rule.target, context);
  if (!target) {
    return null;
  }
  if (!operatorTakesValue(rule.operator)) {
    return { operator: rule.operator, target };
  }
  const value = validRuleValue(question, rule.value);
  return value === undefined
    ? null
    : { operator: rule.operator, target, value };
};

const normalizeLogic = (
  { base, source }: KeptQuestion,
  context: FlowContext
): DraftRule[] => {
  const logic: DraftRule[] = [];
  const seenConditions = new Set<string>();
  for (const generatedRule of source.logic ?? []) {
    const rule = normalizeRule(base, generatedRule, context);
    const condition = rule && `${rule.operator}:${String(rule.value)}`;
    if (!(rule && condition) || seenConditions.has(condition)) {
      continue;
    }
    seenConditions.add(condition);
    logic.push({
      ...rule,
      id: `q${context.index + 1}-rule-${logic.length + 1}`,
    });
    if (logic.length === MAX_RULES_PER_QUESTION) {
      break;
    }
  }
  return logic;
};

const normalizeNext = (
  { source }: KeptQuestion,
  context: FlowContext
): DraftTarget | null => {
  const next = source.next && resolveTarget(source.next, context);
  if (!next) {
    return null;
  }
  const isLast = context.index === context.questionCount - 1;
  const followsNaturally =
    next.kind === "question"
      ? next.questionIndex === context.index + 1
      : isLast;
  return followsNaturally ? null : next;
};

const draftQuestionId = (index: number) => `draft-${index}`;

const toFlowTarget = (target: DraftTarget): FlowTarget =>
  target.kind === "question"
    ? { kind: "question", questionId: draftQuestionId(target.questionIndex) }
    : target;

const firstBlockingIssue = (questions: readonly QuestionDraft[]) => {
  const flowQuestions: SurveyQuestion[] = questions.map((question, order) => ({
    ...question,
    _id: draftQuestionId(order),
    logic: question.logic?.map((rule) => ({
      ...rule,
      target: toFlowTarget(rule.target),
    })),
    next: question.next && toFlowTarget(question.next),
    order,
  }));
  return flowIssues(flowQuestions).find((issue) => issue.severity === "error");
};

/**
 * Turns raw model output into a draft `surveys.mutations.create` accepts:
 * sizes clamped, choices deduped, rules the runtime can't evaluate dropped,
 * targets remapped to the kept questions and forward-only.
 */
export const normalizeGeneratedDraft = (
  generated: GeneratedDraft
): SurveyDraft => {
  const title = cleanText(generated.title, MAX_SURVEY_TITLE_CHARS);
  const kept = keepQuestions(generated.questions);
  if (!(title && kept.some(({ base }) => takesAnswer(base.type)))) {
    throw new ConvexError(NO_QUESTIONS_MESSAGE);
  }
  const indexBySource = new Map(
    kept.map(({ sourceIndex }, index) => [sourceIndex, index])
  );
  const questions = kept.map((entry, index): QuestionDraft => {
    const context = { index, indexBySource, questionCount: kept.length };
    const logic = normalizeLogic(entry, context);
    const next = normalizeNext(entry, context);
    return {
      ...entry.base,
      ...(logic.length > 0 ? { logic } : {}),
      ...(next ? { next } : {}),
    };
  });
  const blocking = firstBlockingIssue(questions);
  if (blocking) {
    throw new ConvexError(
      `The AI draft isn’t usable yet: ${blocking.message} Try rephrasing your request.`
    );
  }
  const description = cleanText(generated.description, MAX_DESCRIPTION_CHARS);
  return { ...(description ? { description } : {}), questions, title };
};
