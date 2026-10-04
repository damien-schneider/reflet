export const QUESTION_TYPES = [
  "rating",
  "nps",
  "text",
  "single_choice",
  "multiple_choice",
  "boolean",
  "statement",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const RATING_STYLES = ["number", "star", "emoji"] as const;
export type RatingStyle = (typeof RATING_STYLES)[number];

export const LOGIC_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "includes",
  "answered",
  "skipped",
] as const;
export type LogicOperator = (typeof LOGIC_OPERATORS)[number];

export const TRIGGER_TYPES = [
  "manual",
  "page_visit",
  "time_delay",
  "exit_intent",
  "feedback_submitted",
  "event",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const DISPLAY_FREQUENCIES = [
  "once",
  "until_completed",
  "recurring",
] as const;
export type DisplayFrequency = (typeof DISPLAY_FREQUENCIES)[number];

export const SURVEY_POSITIONS = [
  "bottom_right",
  "bottom_left",
  "center",
] as const;
export type SurveyPosition = (typeof SURVEY_POSITIONS)[number];

export type AnswerValue = string | number | boolean | string[];
export type RuleValue = string | number | boolean;

export type FlowTarget<QuestionId extends string = string> =
  | { kind: "question"; questionId: QuestionId }
  | { kind: "ending"; endingId: string };

export interface LogicRule<QuestionId extends string = string> {
  id: string;
  operator: LogicOperator;
  target: FlowTarget<QuestionId>;
  value?: RuleValue;
}

export interface QuestionConfig {
  allowOther?: boolean;
  buttonLabel?: string;
  buttonUrl?: string;
  choices?: string[];
  maxLabel?: string;
  maxLength?: number;
  maxValue?: number;
  minLabel?: string;
  minValue?: number;
  placeholder?: string;
  ratingStyle?: RatingStyle;
}

export interface FlowQuestion<QuestionId extends string = string> {
  _id: QuestionId;
  config?: QuestionConfig;
  logic?: LogicRule<QuestionId>[];
  next?: FlowTarget<QuestionId>;
  order: number;
  required: boolean;
  type: QuestionType;
}

export interface SurveyQuestion<QuestionId extends string = string>
  extends FlowQuestion<QuestionId> {
  description?: string;
  title: string;
}

export interface SurveyEnding {
  buttonLabel?: string;
  buttonUrl?: string;
  description?: string;
  id: string;
  title: string;
}

export interface TriggerConfig {
  delayMs?: number;
  eventName?: string;
  pageUrl?: string;
  sampleRate?: number;
}

export interface SurveyDisplay {
  frequency: DisplayFrequency;
  position?: SurveyPosition;
  recontactDays?: number;
}

/** What a respondent's client receives: everything needed to arm triggers and run the flow. */
export interface PublicSurvey<QuestionId extends string = string> {
  _id: string;
  description?: string;
  display: SurveyDisplay;
  endings: SurveyEnding[];
  questions: SurveyQuestion<QuestionId>[];
  title: string;
  triggerConfig?: TriggerConfig;
  triggerType: TriggerType;
}

export type Answers = ReadonlyMap<string, AnswerValue>;
