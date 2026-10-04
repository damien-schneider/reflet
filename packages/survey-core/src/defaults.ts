import type {
  LogicOperator,
  QuestionConfig,
  QuestionType,
  SurveyDisplay,
  SurveyEnding,
} from "./types";

export const DEFAULT_ENDING: SurveyEnding = {
  description: "Your answers have been recorded.",
  id: "default",
  title: "Thank you!",
};

export const DEFAULT_DISPLAY: SurveyDisplay = {
  frequency: "once",
  position: "bottom_right",
};

/** Wait between showings when a survey may be shown again. */
export const DEFAULT_RECONTACT_DAYS = 7;
export const DEFAULT_TIME_DELAY_MS = 5000;
export const DEFAULT_TEXT_MAX_CHARS = 1000;
export const MAX_OTHER_CHOICE_CHARS = 200;
export const NPS_MIN = 0;
export const NPS_MAX = 10;
const DEFAULT_RATING_MIN = 1;
const DEFAULT_RATING_MAX = 5;

/** Every survey has at least one ending: stored endings, or the default thank-you. */
export const endingsOf = (
  endings: readonly SurveyEnding[] | undefined
): SurveyEnding[] =>
  endings && endings.length > 0 ? [...endings] : [DEFAULT_ENDING];

export const displayOf = (display: SurveyDisplay | undefined): SurveyDisplay =>
  display ?? DEFAULT_DISPLAY;

export const ratingRange = (
  config: QuestionConfig | undefined
): { max: number; min: number } => ({
  max: config?.maxValue ?? DEFAULT_RATING_MAX,
  min: config?.minValue ?? DEFAULT_RATING_MIN,
});

export const textMaxChars = (config: QuestionConfig | undefined): number =>
  config?.maxLength ?? DEFAULT_TEXT_MAX_CHARS;

/** Statements show a message and a button; they never collect an answer. */
export const takesAnswer = (type: QuestionType): boolean =>
  type !== "statement";

const NUMERIC_OPERATORS: readonly LogicOperator[] = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "answered",
  "skipped",
];

export const OPERATORS_BY_TYPE: Record<QuestionType, readonly LogicOperator[]> =
  {
    boolean: ["equals", "skipped"],
    multiple_choice: ["includes", "answered", "skipped"],
    nps: NUMERIC_OPERATORS,
    rating: NUMERIC_OPERATORS,
    single_choice: ["equals", "not_equals", "answered", "skipped"],
    statement: [],
    text: ["includes", "answered", "skipped"],
  };

/** `answered` and `skipped` look only at whether an answer exists. */
export const operatorTakesValue = (operator: LogicOperator): boolean =>
  operator !== "answered" && operator !== "skipped";
