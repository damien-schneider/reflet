import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type {
  SurveyQuestion as CoreSurveyQuestion,
  FlowTarget,
  LogicRule,
} from "@reflet/survey-core";
import { atom } from "jotai";

export type {
  QuestionConfig,
  QuestionType,
  SurveyEnding,
  TriggerType,
} from "@reflet/survey-core";

export type SurveyStatus = "draft" | "active" | "paused" | "closed";

export type SurveyStatusFilter = "all" | SurveyStatus;

export type QuestionId = Id<"surveyQuestions">;
export type SurveyQuestion = CoreSurveyQuestion<QuestionId>;
export type QuestionTarget = FlowTarget<QuestionId>;
export type QuestionRule = LogicRule<QuestionId>;

export const surveyStatusFilterAtom = atom<SurveyStatusFilter>("all");

export const surveySearchAtom = atom<string>("");

export type FlowStepRef =
  | { kind: "start" }
  | { kind: "question"; questionId: QuestionId; ruleId?: string }
  | { kind: "ending"; endingId: string };

export const selectedFlowStepAtom = atom<FlowStepRef | null>(null);

/** Node id the canvas should scroll into view once it is rendered. */
export const flowRevealRequestAtom = atom<string | null>(null);

export const flowPreviewOpenAtom = atom(false);

export const flowOutlineOpenAtom = atom(true);
