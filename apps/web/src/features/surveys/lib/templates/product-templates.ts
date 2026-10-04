import {
  optionalText,
  type SurveyTemplate,
  toEnding,
  toQuestion,
} from "@/features/surveys/lib/templates/template-draft";

export const PRODUCT_TEMPLATES: SurveyTemplate[] = [
  {
    description:
      "Ask users of a new feature how useful it is, and why others haven’t tried it.",
    id: "feature_feedback",
    name: "Feature feedback",
    questions: [
      {
        logic: [
          {
            id: "not-tried",
            operator: "equals",
            target: toQuestion(3),
            value: false,
          },
        ],
        required: true,
        title: "Have you tried our new feature yet?",
        type: "boolean",
      },
      {
        config: {
          maxLabel: "Very useful",
          maxValue: 5,
          minLabel: "Not useful",
          minValue: 1,
          ratingStyle: "star",
        },
        logic: [
          {
            id: "useful",
            operator: "greater_than",
            target: toEnding("default"),
            value: 3,
          },
        ],
        required: true,
        title: "How useful is it?",
        type: "rating",
      },
      {
        ...optionalText("What would make it more useful?"),
        next: toEnding("default"),
      },
      {
        config: {
          allowOther: true,
          choices: [
            "Didn’t know it existed",
            "Not relevant to me",
            "Not sure how it works",
            "Haven’t had time",
          ],
        },
        required: true,
        title: "What’s kept you from trying it?",
        type: "single_choice",
      },
    ],
    triggerConfig: { eventName: "feature_used" },
    triggerType: "event",
  },
  {
    description:
      "Check in with new users a few days in, and catch the ones who are stuck.",
    endings: [
      {
        description: "We’ll use your answers to shape what we build next.",
        id: "thanks",
        title: "Thanks for checking in!",
      },
      {
        description:
          "We’ll look into what’s blocking you and make it smoother.",
        id: "stuck",
        title: "Sorry it’s been bumpy",
      },
    ],
    id: "onboarding",
    name: "Onboarding check-in",
    questions: [
      {
        config: {
          maxLabel: "Great",
          maxValue: 5,
          minLabel: "Rough",
          minValue: 1,
          ratingStyle: "emoji",
        },
        logic: [
          {
            id: "stuck",
            operator: "less_than",
            target: toQuestion(1),
            value: 3,
          },
        ],
        next: toQuestion(2),
        required: true,
        title: "How is getting started going so far?",
        type: "rating",
      },
      {
        ...optionalText("What’s getting in your way?"),
        next: toEnding("stuck"),
      },
      {
        config: {
          allowOther: true,
          choices: [
            "Invite my team",
            "Connect my tools",
            "Set up my first project",
            "Explore on my own",
          ],
        },
        required: false,
        title: "What would you like to do next?",
        type: "single_choice",
      },
    ],
    triggerConfig: { delayMs: 60_000 },
    triggerType: "time_delay",
  },
  {
    description:
      "Learn why customers cancel, with a follow-up tailored to each reason.",
    id: "churn",
    name: "Cancellation reasons",
    questions: [
      {
        config: {
          choices: [
            "Too expensive",
            "Missing features",
            "Switched to another tool",
            "Not using it enough",
            "Something else",
          ],
        },
        logic: [
          {
            id: "price",
            operator: "equals",
            target: toQuestion(1),
            value: "Too expensive",
          },
          {
            id: "features",
            operator: "equals",
            target: toQuestion(2),
            value: "Missing features",
          },
          {
            id: "competitor",
            operator: "equals",
            target: toQuestion(3),
            value: "Switched to another tool",
          },
        ],
        next: toQuestion(4),
        required: true,
        title: "What’s the main reason you’re leaving?",
        type: "single_choice",
      },
      {
        ...optionalText("What price would have felt fair?"),
        next: toQuestion(4),
      },
      {
        ...optionalText("Which features were you missing?"),
        next: toQuestion(4),
      },
      optionalText("Which tool did you switch to?"),
      {
        required: false,
        title: "Would you come back if we fixed this?",
        type: "boolean",
      },
    ],
    triggerType: "manual",
  },
  {
    description:
      "Right after someone sends feedback, learn how often the problem hits them.",
    id: "post_feedback",
    name: "Feedback follow-up",
    questions: [
      {
        config: {
          choices: [
            "Every day",
            "A few times a week",
            "Now and then",
            "Just once",
          ],
        },
        required: true,
        title: "How often does this affect you?",
        type: "single_choice",
      },
      {
        config: {
          maxLabel: "It blocks me",
          maxValue: 5,
          minLabel: "Barely",
          minValue: 1,
        },
        logic: [
          {
            id: "blocking",
            operator: "greater_than",
            target: toQuestion(2),
            value: 3,
          },
        ],
        next: toEnding("default"),
        required: true,
        title: "How much does it slow you down?",
        type: "rating",
      },
      optionalText("What are you doing to work around it today?"),
    ],
    triggerType: "feedback_submitted",
  },
];
