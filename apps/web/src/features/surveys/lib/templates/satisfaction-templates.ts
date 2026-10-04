import {
  optionalText,
  type SurveyTemplate,
  toEnding,
  toQuestion,
} from "@/features/surveys/lib/templates/template-draft";

export const SATISFACTION_TEMPLATES: SurveyTemplate[] = [
  {
    description:
      "Ask how likely people are to recommend you, then follow up differently with detractors, passives and promoters.",
    endings: [
      {
        description:
          "We read every answer and use it to decide what to fix next.",
        id: "thanks",
        title: "Thanks for the honest feedback",
      },
      {
        description:
          "We’re glad it’s working for you. Telling a friend helps us a lot.",
        id: "promoters",
        title: "Thank you!",
      },
    ],
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
        logic: [
          {
            id: "detractors",
            operator: "less_than",
            target: toQuestion(1),
            value: 7,
          },
          {
            id: "promoters",
            operator: "greater_than",
            target: toQuestion(3),
            value: 8,
          },
        ],
        next: toQuestion(2),
        required: true,
        title: "How likely are you to recommend us to a friend or colleague?",
        type: "nps",
      },
      {
        ...optionalText("What disappointed you or fell short?"),
        next: toEnding("thanks"),
      },
      {
        ...optionalText("What would make it a 10 for you?"),
        next: toEnding("thanks"),
      },
      {
        ...optionalText("What do you love most about us?"),
        next: toEnding("promoters"),
      },
    ],
    triggerConfig: { delayMs: 30_000 },
    triggerType: "time_delay",
  },
  {
    description:
      "Measure satisfaction and ask unhappy customers what to improve.",
    id: "csat",
    name: "Customer satisfaction",
    questions: [
      {
        config: {
          maxLabel: "Very satisfied",
          maxValue: 5,
          minLabel: "Very dissatisfied",
          minValue: 1,
          ratingStyle: "emoji",
        },
        logic: [
          {
            id: "unhappy",
            operator: "less_than",
            target: toQuestion(1),
            value: 4,
          },
        ],
        next: toQuestion(2),
        required: true,
        title: "How satisfied are you with our product?",
        type: "rating",
      },
      {
        config: {
          allowOther: true,
          choices: [
            "Ease of use",
            "Missing features",
            "Performance",
            "Support",
            "Pricing",
          ],
        },
        next: toQuestion(3),
        required: true,
        title: "What should we improve first?",
        type: "single_choice",
      },
      optionalText("What do you like most?"),
      optionalText("Anything else you’d like to share?"),
    ],
    triggerType: "manual",
  },
  {
    description:
      "Find out how easy a task was, and what got in the way when it wasn’t.",
    id: "ces",
    name: "Customer effort",
    questions: [
      {
        config: {
          maxLabel: "Very easy",
          maxValue: 7,
          minLabel: "Very difficult",
          minValue: 1,
        },
        logic: [
          {
            id: "hard",
            operator: "less_than",
            target: toQuestion(1),
            value: 5,
          },
        ],
        next: toEnding("default"),
        required: true,
        title: "How easy was it to get what you needed today?",
        type: "rating",
      },
      {
        config: {
          allowOther: true,
          choices: [
            "Couldn’t find what I needed",
            "Too many steps",
            "Something didn’t work",
            "Instructions were unclear",
          ],
        },
        required: true,
        title: "What made it harder than it should be?",
        type: "single_choice",
      },
      optionalText("How could we make it easier?"),
    ],
    triggerType: "manual",
  },
  {
    description:
      "Sean Ellis’s test: if 40% would be “very disappointed” without you, you have product-market fit.",
    id: "pmf",
    name: "Product-market fit",
    questions: [
      {
        config: {
          choices: [
            "Very disappointed",
            "Somewhat disappointed",
            "Not disappointed",
          ],
        },
        logic: [
          {
            id: "not-disappointed",
            operator: "equals",
            target: toQuestion(3),
            value: "Not disappointed",
          },
        ],
        required: true,
        title: "How would you feel if you could no longer use our product?",
        type: "single_choice",
      },
      optionalText("What’s the main benefit you get from it?"),
      optionalText("What kind of people would benefit most from it?"),
      optionalText("How can we improve it for you?"),
    ],
    triggerType: "manual",
  },
];
