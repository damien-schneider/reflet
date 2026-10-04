import type {
  DraftTarget,
  QuestionDraft,
} from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import type {
  SurveyEnding,
  TriggerConfig,
  TriggerType,
} from "@reflet/survey-core";

export type SurveyTemplateId =
  | "nps"
  | "csat"
  | "ces"
  | "pmf"
  | "feature_feedback"
  | "onboarding"
  | "churn"
  | "post_feedback";

export interface SurveyTemplate {
  description: string;
  endings?: SurveyEnding[];
  id: SurveyTemplateId;
  name: string;
  questions: QuestionDraft[];
  triggerConfig?: TriggerConfig;
  triggerType: TriggerType;
}

export const toQuestion = (questionIndex: number): DraftTarget => ({
  kind: "question",
  questionIndex,
});

export const toEnding = (endingId: string): DraftTarget => ({
  endingId,
  kind: "ending",
});

export const optionalText = (title: string, placeholder = "Your answer…") => ({
  config: { maxLength: 1000, placeholder },
  required: false,
  title,
  type: "text" as const,
});
