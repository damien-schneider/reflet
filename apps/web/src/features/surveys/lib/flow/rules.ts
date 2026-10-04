import {
  type FlowTarget,
  type LogicOperator,
  type LogicRule,
  NPS_MAX,
  NPS_MIN,
  OPERATORS_BY_TYPE,
  operatorTakesValue,
  type QuestionConfig,
  type QuestionType,
  type RuleValue,
  ratingRange,
} from "@reflet/survey-core";

interface RuleSubject {
  config?: QuestionConfig;
  type: QuestionType;
}

const SCORE_SUBJECT = { nps: "Score", rating: "Rating" } as const;

const SCORE_COMPARISON_SYMBOLS: Record<LogicOperator, string> = {
  answered: "",
  equals: "=",
  greater_than: ">",
  includes: "=",
  less_than: "<",
  not_equals: "≠",
  skipped: "",
};

const MISSING_VALUE = "…";

const quoted = (value: RuleValue | undefined) =>
  value === undefined || value === "" ? MISSING_VALUE : `“${String(value)}”`;

/** The condition of a rule in plain words, as shown on canvas edges and the outline. */
export const describeRule = (
  rule: Pick<LogicRule, "operator" | "value">,
  question: RuleSubject
): string => {
  if (rule.operator === "answered") {
    return "Answered";
  }
  if (rule.operator === "skipped") {
    return "Skipped";
  }
  if (question.type === "nps" || question.type === "rating") {
    const value = rule.value === undefined ? MISSING_VALUE : rule.value;
    return `${SCORE_SUBJECT[question.type]} ${SCORE_COMPARISON_SYMBOLS[rule.operator]} ${value}`;
  }
  if (question.type === "boolean") {
    if (typeof rule.value !== "boolean") {
      return `Answered ${MISSING_VALUE}`;
    }
    return rule.value ? "Answered “Yes”" : "Answered “No”";
  }
  if (question.type === "text") {
    return `Mentions ${quoted(rule.value)}`;
  }
  return rule.operator === "not_equals"
    ? `Didn’t pick ${quoted(rule.value)}`
    : `Picked ${quoted(rule.value)}`;
};

const NUMERIC_OPERATOR_LABELS: Record<LogicOperator, string> = {
  answered: "is answered",
  equals: "is",
  greater_than: "is more than",
  includes: "includes",
  less_than: "is less than",
  not_equals: "is not",
  skipped: "is skipped",
};

/** Operator wording for the inspector's “If answer …” sentence. */
export const operatorLabel = (
  type: QuestionType,
  operator: LogicOperator
): string => {
  if (operator === "includes") {
    return type === "text" ? "contains" : "includes";
  }
  return NUMERIC_OPERATOR_LABELS[operator];
};

export const scaleRange = (question: RuleSubject) =>
  question.type === "nps"
    ? { max: NPS_MAX, min: NPS_MIN }
    : ratingRange(question.config);

export interface RuleValueOption {
  label: string;
  value: RuleValue;
}

/** The values a rule may compare against, or `null` when the value is free text. */
export const ruleValueOptions = (
  question: RuleSubject
): RuleValueOption[] | null => {
  if (question.type === "nps" || question.type === "rating") {
    const { max, min } = scaleRange(question);
    return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => ({
      label: String(min + index),
      value: min + index,
    }));
  }
  if (question.type === "boolean") {
    return [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ];
  }
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    return (question.config?.choices ?? []).map((choice) => ({
      label: choice,
      value: choice,
    }));
  }
  return null;
};

/** A value that keeps the rule valid after its operator changes. */
export const defaultRuleValue = (
  question: RuleSubject,
  operator: LogicOperator
): RuleValue | undefined => {
  if (!operatorTakesValue(operator)) {
    return undefined;
  }
  const options = ruleValueOptions(question);
  if (options === null) {
    return "";
  }
  return options[0]?.value;
};

export const createRuleId = (): string => crypto.randomUUID();

export const newRule = <QuestionId extends string>(
  question: RuleSubject,
  target: FlowTarget<QuestionId>
): LogicRule<QuestionId> => {
  const operator = OPERATORS_BY_TYPE[question.type][0] ?? "answered";
  const value = defaultRuleValue(question, operator);
  return {
    id: createRuleId(),
    operator,
    target,
    ...(value === undefined ? {} : { value }),
  };
};
