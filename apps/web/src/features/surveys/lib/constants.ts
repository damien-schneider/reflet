import type {
  QuestionConfig,
  QuestionType,
  SurveyStatus,
  TriggerType,
} from "@/store/surveys";

export const STATUS_COLORS = {
  active: "green",
  closed: "red",
  draft: "gray",
  paused: "yellow",
} as const satisfies Record<SurveyStatus, string>;

export const STATUS_LABELS = {
  active: "Active",
  closed: "Closed",
  draft: "Draft",
  paused: "Paused",
} as const satisfies Record<SurveyStatus, string>;

export const TRIGGER_LABELS = {
  exit_intent: "Exit intent",
  feedback_submitted: "After feedback",
  manual: "Manual",
  page_visit: "Page visit",
  time_delay: "Time delay",
} as const satisfies Record<TriggerType, string>;

export const TRIGGER_DESCRIPTIONS: Record<
  TriggerType,
  { description: string; hint: string }
> = {
  exit_intent: {
    description: "Appears when a user is about to leave the page",
    hint: "Useful for exit surveys and understanding churn.",
  },
  feedback_submitted: {
    description: "Appears right after a user submits feedback",
    hint: "Follow up with deeper questions after their first feedback.",
  },
  manual: {
    description: "Show it yourself with an API or widget SDK call",
    hint: "For in-app moments you control from your own code.",
  },
  page_visit: {
    description: "Appears when a user visits a specific page",
    hint: "Ask about a specific page, like pricing or checkout.",
  },
  time_delay: {
    description: "Appears after a user has been on the page for a while",
    hint: "Reaches engaged users who have spent time exploring.",
  },
};

export const QUESTION_TYPE_LABELS = {
  boolean: "Yes / no",
  multiple_choice: "Multiple choice",
  nps: "NPS (0–10)",
  rating: "Rating scale",
  single_choice: "Single choice",
  text: "Free text",
} as const satisfies Record<QuestionType, string>;

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  boolean: "Simple yes or no",
  multiple_choice: "Pick multiple from a list",
  nps: "Net Promoter Score, 0 to 10",
  rating: "Numbered scale with custom range",
  single_choice: "Pick one from a list",
  text: "Open-ended written response",
};

export function getDefaultConfig(
  type: QuestionType,
  choices?: string[]
): QuestionConfig | undefined {
  if (type === "rating") {
    return {
      maxLabel: "Excellent",
      maxValue: 5,
      minLabel: "Poor",
      minValue: 1,
    };
  }
  if (type === "nps") {
    return {
      maxLabel: "Very likely",
      maxValue: 10,
      minLabel: "Not likely",
      minValue: 0,
    };
  }
  if (type === "single_choice" || type === "multiple_choice") {
    return { choices: choices ?? ["Option 1", "Option 2", "Option 3"] };
  }
  if (type === "text") {
    return { maxLength: 1000, placeholder: "Your answer…" };
  }
}

export function getDefaultTitle(type: QuestionType): string {
  const defaults: Record<QuestionType, string> = {
    boolean: "Would you recommend us to a friend?",
    multiple_choice: "Which of these apply? (Select all)",
    nps: "How likely are you to recommend us?",
    rating: "How would you rate your experience?",
    single_choice: "Which option best describes you?",
    text: "Tell us more about your experience",
  };
  return defaults[type];
}
