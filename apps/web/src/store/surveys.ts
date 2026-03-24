import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { atom } from "jotai";

// ============================================
// SURVEY LIST STORE
// ============================================

export type SurveyStatusFilter =
  | "all"
  | "draft"
  | "active"
  | "paused"
  | "closed";

export const surveyStatusFilterAtom = atom<SurveyStatusFilter>("all");

export const surveySearchAtom = atom<string>("");

// ============================================
// SURVEY BUILDER STORE
// ============================================

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

export interface ConditionalLogic {
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

export interface SurveyDraft {
  description?: string;
  questions: SurveyQuestion[];
  title: string;
  triggerConfig?: {
    delayMs?: number;
    pageUrl?: string;
    sampleRate?: number;
  };
  triggerType: TriggerType;
}

// Builder editing state
export const builderActiveQuestionIdAtom = atom<Id<"surveyQuestions"> | null>(
  null
);
export const builderPreviewModeAtom = atom(false);

// Undo/redo history
interface HistoryEntry {
  questions: SurveyQuestion[];
  timestamp: number;
}

export const builderHistoryAtom = atom<HistoryEntry[]>([]);
export const builderHistoryIndexAtom = atom<number>(-1);

// Derived atoms for undo/redo
export const canUndoAtom = atom((get) => get(builderHistoryIndexAtom) > 0);
export const canRedoAtom = atom(
  (get) => get(builderHistoryIndexAtom) < get(builderHistoryAtom).length - 1
);

// Auto-save state
export const builderDirtyAtom = atom(false);
export const builderSavingAtom = atom(false);
export const builderLastSavedAtom = atom<number | null>(null);
