import type { QuestionType, SurveyStatus, TriggerType } from "@/store/surveys";

export const STATUS_COLORS = {
  draft: "gray",
  active: "green",
  paused: "yellow",
  closed: "red",
} as const satisfies Record<SurveyStatus, string>;

export const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
} as const satisfies Record<SurveyStatus, string>;

export const TRIGGER_LABELS = {
  manual: "Manual",
  page_visit: "Page Visit",
  time_delay: "Time Delay",
  exit_intent: "Exit Intent",
  feedback_submitted: "After Feedback",
} as const satisfies Record<TriggerType, string>;

export const TRIGGER_DESCRIPTIONS: Record<
  TriggerType,
  { description: string; hint: string }
> = {
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
  exit_intent: {
    description: "Appears when a user is about to leave the page",
    hint: "Perfect for churn prevention and exit surveys",
  },
  feedback_submitted: {
    description: "Appears right after a user submits feedback",
    hint: "Follow up with deeper questions after initial feedback",
  },
};

export const QUESTION_TYPE_LABELS = {
  rating: "Rating Scale",
  nps: "NPS (0-10)",
  text: "Free Text",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  boolean: "Yes / No",
} as const satisfies Record<QuestionType, string>;

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  rating: "Numbered scale with custom range",
  nps: "Net Promoter Score, 0 to 10",
  text: "Open-ended written response",
  single_choice: "Pick one from a list",
  multiple_choice: "Pick multiple from a list",
  boolean: "Simple yes or no",
};

export const QUESTION_TYPE_ICONS = {
  rating: "Star",
  nps: "ChartBar",
  text: "TextAa",
  single_choice: "RadioButton",
  multiple_choice: "CheckSquare",
  boolean: "ToggleLeft",
} as const satisfies Record<QuestionType, string>;

export function getDefaultConfig(
  type: QuestionType,
  choices?: string[]
): Record<string, unknown> | undefined {
  if (type === "rating") {
    return {
      minValue: 1,
      maxValue: 5,
      minLabel: "Poor",
      maxLabel: "Excellent",
    };
  }
  if (type === "nps") {
    return {
      minValue: 0,
      maxValue: 10,
      minLabel: "Not likely",
      maxLabel: "Very likely",
    };
  }
  if (type === "single_choice" || type === "multiple_choice") {
    return { choices: choices ?? ["Option 1", "Option 2", "Option 3"] };
  }
  if (type === "text") {
    return { placeholder: "Your answer...", maxLength: 1000 };
  }
  return undefined;
}

export function getDefaultTitle(type: QuestionType): string {
  const defaults: Record<QuestionType, string> = {
    rating: "How would you rate your experience?",
    nps: "How likely are you to recommend us?",
    text: "Tell us more about your experience",
    single_choice: "Which option best describes you?",
    multiple_choice: "Which of these apply? (Select all)",
    boolean: "Would you recommend us to a friend?",
  };
  return defaults[type];
}
