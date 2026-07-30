import { getDefaultConfig } from "@/features/surveys/lib/constants";
import type { QuestionType } from "@/store/surveys";

interface TemplateQuestion {
  config?: Record<string, unknown>;
  description?: string;
  required: boolean;
  title: string;
  type: QuestionType;
}

interface SurveyTemplate {
  description: string;
  icon: string;
  id: SurveyTemplateId;
  name: string;
  questions: TemplateQuestion[];
}

export type SurveyTemplateId =
  | "blank"
  | "nps"
  | "csat"
  | "product_feedback"
  | "feature_request"
  | "onboarding"
  | "churn";

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    description: "Start from scratch",
    icon: "📄",
    id: "blank",
    name: "Blank Survey",
    questions: [],
  },
  {
    description: "Measure customer loyalty with a standard NPS survey",
    icon: "📊",
    id: "nps",
    name: "Net Promoter Score",
    questions: [
      {
        config: {
          maxLabel: "Extremely likely",
          maxValue: 10,
          minLabel: "Not at all likely",
          minValue: 0,
        },
        required: true,
        title: "How likely are you to recommend us to a friend or colleague?",
        type: "nps",
      },
      {
        config: { maxLength: 500, placeholder: "Tell us more..." },
        required: false,
        title: "What is the primary reason for your score?",
        type: "text",
      },
    ],
  },
  {
    description: "Measure overall satisfaction with your product or service",
    icon: "⭐",
    id: "csat",
    name: "Customer Satisfaction",
    questions: [
      {
        config: {
          maxLabel: "Very satisfied",
          maxValue: 5,
          minLabel: "Very dissatisfied",
          minValue: 1,
        },
        required: true,
        title: "How satisfied are you with our product?",
        type: "rating",
      },
      {
        config: {
          choices: [
            "Ease of use",
            "Features",
            "Performance",
            "Design",
            "Support",
            "Price",
          ],
        },
        required: true,
        title: "Which aspect of our product do you value most?",
        type: "single_choice",
      },
      {
        config: { maxLength: 1000, placeholder: "Your suggestions..." },
        required: false,
        title: "How can we improve your experience?",
        type: "text",
      },
    ],
  },
  {
    description: "Collect general feedback about your product experience",
    icon: "💬",
    id: "product_feedback",
    name: "Product Feedback",
    questions: [
      {
        config: {
          maxLabel: "Excellent",
          maxValue: 5,
          minLabel: "Poor",
          minValue: 1,
        },
        required: true,
        title: "How would you rate your overall experience?",
        type: "rating",
      },
      {
        config: {
          choices: [
            "Dashboard",
            "Reports",
            "Integrations",
            "Settings",
            "API",
            "Other",
          ],
        },
        required: true,
        title: "What features do you use most? (Select all that apply)",
        type: "multiple_choice",
      },
      {
        required: true,
        title: "Would you recommend our product to others?",
        type: "boolean",
      },
      {
        config: { maxLength: 1000, placeholder: "Share your thoughts..." },
        required: false,
        title: "Any additional comments or suggestions?",
        type: "text",
      },
    ],
  },
  {
    description: "Prioritize features based on user demand",
    icon: "🚀",
    id: "feature_request",
    name: "Feature Request",
    questions: [
      {
        config: {
          choices: [
            "User interface",
            "Performance",
            "New features",
            "Documentation",
            "Integrations",
            "Mobile experience",
          ],
        },
        required: true,
        title: "Which area needs the most improvement?",
        type: "single_choice",
      },
      {
        config: {
          maxLength: 2000,
          placeholder: "Be as specific as possible...",
        },
        required: true,
        title: "Describe the feature or improvement you'd like to see",
        type: "text",
      },
      {
        config: {
          maxLabel: "Critical",
          maxValue: 5,
          minLabel: "Nice to have",
          minValue: 1,
        },
        description: "1 = Nice to have, 5 = Critical",
        required: true,
        title: "How important is this to your workflow?",
        type: "rating",
      },
    ],
  },
  {
    description: "Evaluate new user experience and setup flow",
    icon: "👋",
    id: "onboarding",
    name: "Onboarding Experience",
    questions: [
      {
        config: {
          maxLabel: "Very easy",
          maxValue: 5,
          minLabel: "Very difficult",
          minValue: 1,
        },
        required: true,
        title: "How easy was it to get started?",
        type: "rating",
      },
      {
        required: true,
        title: "Did you find the documentation helpful?",
        type: "boolean",
      },
      {
        config: {
          choices: [
            "Search engine",
            "Social media",
            "Friend or colleague",
            "Blog post",
            "Conference",
            "Other",
          ],
        },
        required: false,
        title: "How did you hear about us?",
        type: "single_choice",
      },
      {
        config: { maxLength: 500, placeholder: "Any friction points..." },
        required: false,
        title: "What almost stopped you from signing up?",
        type: "text",
      },
    ],
  },
  {
    description: "Understand why users might leave",
    icon: "🔄",
    id: "churn",
    name: "Churn Prevention",
    questions: [
      {
        config: {
          choices: [
            "Too expensive",
            "Missing features",
            "Too complex",
            "Found an alternative",
            "No longer needed",
            "Poor support",
            "Other",
          ],
        },
        required: true,
        title: "What is the main reason you're considering leaving?",
        type: "single_choice",
      },
      {
        config: {
          maxLabel: "Very likely",
          maxValue: 5,
          minLabel: "Very unlikely",
          minValue: 1,
        },
        required: true,
        title: "How likely are you to continue using our product?",
        type: "rating",
      },
      {
        config: { maxLength: 1000, placeholder: "Tell us what we can do..." },
        required: false,
        title: "What would make you stay?",
        type: "text",
      },
    ],
  },
];

export function createQuestionsFromTemplate(
  templateId: SurveyTemplateId
): TemplateQuestion[] {
  const template = SURVEY_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return [];
  }
  return template.questions.map((q) => ({
    ...q,
    config: q.config ?? getDefaultConfig(q.type),
  }));
}
