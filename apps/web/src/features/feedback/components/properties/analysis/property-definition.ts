import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  COMPLEXITY_LABELS,
  PRIORITY_LABELS,
} from "@reflet/backend/convex/feedback/property_values";

export type AnalysisPropertyName = "priority" | "complexity" | "timeEstimate";
export interface AnalysisPropertyValues {
  ai?: string | null;
  editable: boolean;
  human?: string | null;
  reasoning?: string | null;
}
export interface AnalysisPropertyProps {
  feedbackId: Id<"feedback">;
  name: AnalysisPropertyName;
  values: AnalysisPropertyValues;
}
export interface AnalysisEditor {
  changeSource: (reset: boolean) => Promise<void>;
  open: boolean;
  save: (value: string) => Promise<void>;
  saving: boolean;
  setOpen: (open: boolean) => void;
}

const isPriority = (
  value: string
): value is NonNullable<Doc<"feedback">["priority"]> =>
  Object.keys(PRIORITY_LABELS).some((option) => option === value);
const isComplexity = (
  value: string
): value is NonNullable<Doc<"feedback">["complexity"]> =>
  Object.keys(COMPLEXITY_LABELS).some((option) => option === value);

export const CLEAR_PROPERTY = {
  complexity: { clearComplexity: true },
  priority: { clearPriority: true },
  timeEstimate: { clearTimeEstimate: true },
} as const;
export const RESET_PROPERTY = {
  complexity: { resetComplexity: true },
  priority: { resetPriority: true },
  timeEstimate: { resetTimeEstimate: true },
} as const;
export const PROPERTY_ORIGIN_LABELS = {
  ai: "AI proposal",
  human: "Human decision",
  unset: "No value",
};

export function propertyValueLabel(
  name: AnalysisPropertyName,
  value: string | null | undefined
) {
  if (value === null || value === undefined) {
    return "Not set";
  }
  if (name === "priority" && isPriority(value)) {
    return PRIORITY_LABELS[value];
  }
  if (name === "complexity" && isComplexity(value)) {
    return COMPLEXITY_LABELS[value];
  }
  return value;
}

export function analysisValueUpdate(name: AnalysisPropertyName, value: string) {
  if (name === "priority" && isPriority(value)) {
    return { priority: value };
  }
  if (name === "complexity" && isComplexity(value)) {
    return { complexity: value };
  }
  if (name === "timeEstimate") {
    return { timeEstimate: value.trim() };
  }
}
