import type { QuestionType, SurveyStatus, TriggerType } from "@/store/surveys";

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
  exit_intent: "Exit Intent",
  feedback_submitted: "After Feedback",
  manual: "Manual",
  page_visit: "Page Visit",
  time_delay: "Time Delay",
} as const satisfies Record<TriggerType, string>;

export const TRIGGER_DESCRIPTIONS: Record<
  TriggerType,
  { description: string; hint: string }
> = {
  exit_intent: {
    description: "Appears when a user is about to leave the page",
    hint: "Perfect for churn prevention and exit surveys",
  },
  feedback_submitted: {
    description: "Appears right after a user submits feedback",
    hint: "Follow up with deeper questions after initial feedback",
  },
  manual: {
    description: "Show via API or widget SDK call",
    hint: "Best for targeted in-app moments you control programmatically",
  },
  page_visit: {
    description: "Appears when a user visits a specific page",
    hint: "Great for page-specific feedback like pricing or checkout",
  },
  time_delay: {
    description: "Appears after a user has been on the page for a while",
    hint: "Ideal for engaged users who have spent time exploring",
  },
};

export const QUESTION_TYPE_LABELS = {
  boolean: "Yes / No",
  multiple_choice: "Multiple Choice",
  nps: "NPS (0-10)",
  rating: "Rating Scale",
  single_choice: "Single Choice",
  text: "Free Text",
} as const satisfies Record<QuestionType, string>;

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  boolean: "Simple yes or no",
  multiple_choice: "Pick multiple from a list",
  nps: "Net Promoter Score, 0 to 10",
  rating: "Numbered scale with custom range",
  single_choice: "Pick one from a list",
  text: "Open-ended written response",
};

export const QUESTION_TYPE_ICONS = {
  boolean: "ToggleLeft",
  multiple_choice: "CheckSquare",
  nps: "ChartBar",
  rating: "Star",
  single_choice: "RadioButton",
  text: "TextAa",
} as const satisfies Record<QuestionType, string>;

export function getDefaultConfig(
  type: QuestionType,
  choices?: string[]
): Record<string, unknown> | undefined {
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
    return { maxLength: 1000, placeholder: "Your answer..." };
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
