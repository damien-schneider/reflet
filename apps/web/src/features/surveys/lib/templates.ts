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
    id: "blank",
    name: "Blank Survey",
    description: "Start from scratch",
    icon: "📄",
    questions: [],
  },
  {
    id: "nps",
    name: "Net Promoter Score",
    description: "Measure customer loyalty with a standard NPS survey",
    icon: "📊",
    questions: [
      {
        type: "nps",
        title: "How likely are you to recommend us to a friend or colleague?",
        required: true,
        config: {
          minValue: 0,
          maxValue: 10,
          minLabel: "Not at all likely",
          maxLabel: "Extremely likely",
        },
      },
      {
        type: "text",
        title: "What is the primary reason for your score?",
        required: false,
        config: { placeholder: "Tell us more...", maxLength: 500 },
      },
    ],
  },
  {
    id: "csat",
    name: "Customer Satisfaction",
    description: "Measure overall satisfaction with your product or service",
    icon: "⭐",
    questions: [
      {
        type: "rating",
        title: "How satisfied are you with our product?",
        required: true,
        config: {
          minValue: 1,
          maxValue: 5,
          minLabel: "Very dissatisfied",
          maxLabel: "Very satisfied",
        },
      },
      {
        type: "single_choice",
        title: "Which aspect of our product do you value most?",
        required: true,
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
      },
      {
        type: "text",
        title: "How can we improve your experience?",
        required: false,
        config: { placeholder: "Your suggestions...", maxLength: 1000 },
      },
    ],
  },
  {
    id: "product_feedback",
    name: "Product Feedback",
    description: "Collect general feedback about your product experience",
    icon: "💬",
    questions: [
      {
        type: "rating",
        title: "How would you rate your overall experience?",
        required: true,
        config: {
          minValue: 1,
          maxValue: 5,
          minLabel: "Poor",
          maxLabel: "Excellent",
        },
      },
      {
        type: "multiple_choice",
        title: "What features do you use most? (Select all that apply)",
        required: true,
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
      },
      {
        type: "boolean",
        title: "Would you recommend our product to others?",
        required: true,
      },
      {
        type: "text",
        title: "Any additional comments or suggestions?",
        required: false,
        config: { placeholder: "Share your thoughts...", maxLength: 1000 },
      },
    ],
  },
  {
    id: "feature_request",
    name: "Feature Request",
    description: "Prioritize features based on user demand",
    icon: "🚀",
    questions: [
      {
        type: "single_choice",
        title: "Which area needs the most improvement?",
        required: true,
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
      },
      {
        type: "text",
        title: "Describe the feature or improvement you'd like to see",
        required: true,
        config: {
          placeholder: "Be as specific as possible...",
          maxLength: 2000,
        },
      },
      {
        type: "rating",
        title: "How important is this to your workflow?",
        description: "1 = Nice to have, 5 = Critical",
        required: true,
        config: {
          minValue: 1,
          maxValue: 5,
          minLabel: "Nice to have",
          maxLabel: "Critical",
        },
      },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding Experience",
    description: "Evaluate new user experience and setup flow",
    icon: "👋",
    questions: [
      {
        type: "rating",
        title: "How easy was it to get started?",
        required: true,
        config: {
          minValue: 1,
          maxValue: 5,
          minLabel: "Very difficult",
          maxLabel: "Very easy",
        },
      },
      {
        type: "boolean",
        title: "Did you find the documentation helpful?",
        required: true,
      },
      {
        type: "single_choice",
        title: "How did you hear about us?",
        required: false,
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
      },
      {
        type: "text",
        title: "What almost stopped you from signing up?",
        required: false,
        config: { placeholder: "Any friction points...", maxLength: 500 },
      },
    ],
  },
  {
    id: "churn",
    name: "Churn Prevention",
    description: "Understand why users might leave",
    icon: "🔄",
    questions: [
      {
        type: "single_choice",
        title: "What is the main reason you're considering leaving?",
        required: true,
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
      },
      {
        type: "rating",
        title: "How likely are you to continue using our product?",
        required: true,
        config: {
          minValue: 1,
          maxValue: 5,
          minLabel: "Very unlikely",
          maxLabel: "Very likely",
        },
      },
      {
        type: "text",
        title: "What would make you stay?",
        required: false,
        config: { placeholder: "Tell us what we can do...", maxLength: 1000 },
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
