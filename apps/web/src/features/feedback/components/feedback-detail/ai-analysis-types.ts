export type Priority = "critical" | "high" | "medium" | "low" | "none";
export type Complexity =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "very_complex";

export const PRIORITY_OPTIONS: Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
  "none",
];

export const COMPLEXITY_OPTIONS: Complexity[] = [
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
];

export const isPriority = (value: string): value is Priority =>
  PRIORITY_OPTIONS.some((o) => o === value);

export const isComplexity = (value: string): value is Complexity =>
  COMPLEXITY_OPTIONS.some((o) => o === value);
