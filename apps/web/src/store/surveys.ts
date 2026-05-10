import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export type QuestionType =
  | "rating"
  | "nps"
  | "text"
  | "single_choice"
  | "multiple_choice"
  | "boolean";

export type SurveyStatus = "draft" | "active" | "paused" | "closed";

export type TriggerType =
  | "manual"
  | "page_visit"
  | "time_delay"
  | "exit_intent"
  | "feedback_submitted";

export interface QuestionConfig {
  choices?: string[];
  maxLabel?: string;
  maxLength?: number;
  maxValue?: number;
  minLabel?: string;
  minValue?: number;
  placeholder?: string;
}

interface ConditionalLogic {
  condition?:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "answered"
    | "not_answered";
  dependsOn?: Id<"surveyQuestions">;
  value?: string | number | boolean;
}

export interface SurveyQuestion {
  _id: Id<"surveyQuestions">;
  conditionalLogic?: ConditionalLogic;
  config?: QuestionConfig;
  description?: string;
  order: number;
  required: boolean;
  title: string;
  type: QuestionType;
}
