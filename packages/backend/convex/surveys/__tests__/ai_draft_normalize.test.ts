import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
  MAX_DRAFT_QUESTIONS,
  normalizeGeneratedDraft,
} from "../lib/ai_draft_normalize";
import type { GeneratedDraft } from "../lib/ai_draft_schema";

const END = { endingId: "default", kind: "ending" } as const;
const toQuestion = (questionIndex: number) =>
  ({ kind: "question", questionIndex }) as const;

describe("normalizeGeneratedDraft", () => {
  it("keeps a valid NPS survey with a promoter branch intact", () => {
    const draft = normalizeGeneratedDraft({
      description: "Two quick questions.",
      questions: [
        {
          config: { maxLabel: "Very likely", minLabel: "Not likely" },
          logic: [
            { operator: "greater_than", target: toQuestion(2), value: 8 },
          ],
          required: true,
          title: "How likely are you to recommend Reflet?",
          type: "nps",
        },
        {
          config: { placeholder: "Tell us more" },
          next: END,
          required: false,
          title: "What should we improve?",
          type: "text",
        },
        { required: false, title: "What do you value most?", type: "text" },
      ],
      title: "  Product NPS ",
    });

    expect(draft).toEqual({
      description: "Two quick questions.",
      questions: [
        {
          config: { maxLabel: "Very likely", minLabel: "Not likely" },
          logic: [
            {
              id: "q1-rule-1",
              operator: "greater_than",
              target: { kind: "question", questionIndex: 2 },
              value: 8,
            },
          ],
          required: true,
          title: "How likely are you to recommend Reflet?",
          type: "nps",
        },
        {
          config: { placeholder: "Tell us more" },
          next: END,
          required: false,
          title: "What should we improve?",
          type: "text",
        },
        { required: false, title: "What do you value most?", type: "text" },
      ],
      title: "Product NPS",
    });
  });

  it("drops jumps that go backward, to itself, or to targets that don't exist", () => {
    const draft = normalizeGeneratedDraft({
      questions: [
        {
          config: { choices: ["Free", "Pro"] },
          logic: [
            { operator: "equals", target: toQuestion(5), value: "Pro" },
            {
              operator: "equals",
              target: { endingId: "vip", kind: "ending" },
              value: "Free",
            },
            { operator: "equals", target: toQuestion(0), value: "Pro" },
          ],
          required: true,
          title: "Which plan are you on?",
          type: "single_choice",
        },
        {
          logic: [
            { operator: "equals", target: toQuestion(0), value: true },
            { operator: "equals", target: toQuestion(2), value: false },
          ],
          next: toQuestion(0),
          required: true,
          title: "Did you find what you needed?",
          type: "boolean",
        },
        { required: false, title: "Anything else?", type: "text" },
      ],
      title: "Plan check",
    });

    const [plan, found] = draft.questions;
    expect(plan?.logic).toBeUndefined();
    expect(found?.next).toBeUndefined();
    expect(found?.logic).toEqual([
      {
        id: "q2-rule-1",
        operator: "equals",
        target: { kind: "question", questionIndex: 2 },
        value: false,
      },
    ]);
  });

  it("drops conditions the question type can't evaluate and repairs values it can", () => {
    const draft = normalizeGeneratedDraft({
      questions: [
        {
          config: { maxValue: 5, minValue: 1 },
          logic: [
            { operator: "includes", target: END, value: "great" },
            { operator: "less_than", target: END, value: 9 },
            { operator: "less_than", target: toQuestion(2), value: "3" },
          ],
          required: true,
          title: "How easy was onboarding?",
          type: "rating",
        },
        {
          logic: [
            { operator: "includes", target: END, value: "   " },
            { operator: "equals", target: END, value: "pricing" },
            { operator: "includes", target: END, value: "price" },
          ],
          required: false,
          title: "What's missing?",
          type: "text",
        },
        {
          config: { choices: ["Price", "Speed"] },
          logic: [
            { operator: "equals", target: END, value: "Support" },
            { operator: "greater_than", target: END, value: 1 },
            { operator: "equals", target: END, value: "speed" },
          ],
          required: true,
          title: "Which matters most?",
          type: "single_choice",
        },
      ],
      title: "Onboarding",
    });

    expect(draft.questions.map((question) => question.logic)).toEqual([
      [
        {
          id: "q1-rule-1",
          operator: "less_than",
          target: { kind: "question", questionIndex: 2 },
          value: 3,
        },
      ],
      [{ id: "q2-rule-1", operator: "includes", target: END, value: "price" }],
      [{ id: "q3-rule-1", operator: "equals", target: END, value: "Speed" }],
    ]);
  });

  it("dedupes and caps choices, and removes questions without enough options", () => {
    const draft = normalizeGeneratedDraft({
      questions: [
        {
          config: {
            choices: [
              " Speed ",
              "speed",
              "Price",
              "",
              "Docs",
              "Support",
              "Design",
              "Integrations",
              "Mobile",
              "API",
              "Security",
              "Reports",
            ],
          },
          logic: [
            { operator: "includes", target: toQuestion(2), value: "docs" },
            { operator: "includes", target: toQuestion(1), value: "Price" },
          ],
          required: true,
          title: "What do you care about?",
          type: "multiple_choice",
        },
        {
          config: { choices: ["Yes", "yes", " "] },
          required: true,
          title: "Would you pay more?",
          type: "single_choice",
        },
        { required: false, title: "Why?", type: "text" },
      ],
      title: "Priorities",
    });

    expect(draft.questions.map((question) => question.title)).toEqual([
      "What do you care about?",
      "Why?",
    ]);
    expect(draft.questions[0]?.config?.choices).toEqual([
      "Speed",
      "Price",
      "Docs",
      "Support",
      "Design",
      "Integrations",
      "Mobile",
      "API",
    ]);
    expect(draft.questions[0]?.logic).toEqual([
      {
        id: "q1-rule-1",
        operator: "includes",
        target: { kind: "question", questionIndex: 1 },
        value: "Docs",
      },
    ]);
  });

  it(`keeps at most ${MAX_DRAFT_QUESTIONS} questions`, () => {
    const draft = normalizeGeneratedDraft({
      questions: Array.from({ length: 9 }, (_, index) => ({
        required: false,
        title: `Question ${index + 1}`,
        type: "text" as const,
      })),
      title: "Long survey",
    });

    expect(draft.questions).toHaveLength(MAX_DRAFT_QUESTIONS);
  });

  it.each<[string, GeneratedDraft]>([
    ["no questions", { questions: [], title: "Feedback" }],
    [
      "only statements",
      {
        questions: [{ required: false, title: "Thanks!", type: "statement" }],
        title: "Feedback",
      },
    ],
    [
      "a blank title",
      {
        questions: [{ required: true, title: "Why?", type: "text" }],
        title: "   ",
      },
    ],
    [
      "only unusable questions",
      {
        questions: [
          {
            config: { choices: ["Only one"] },
            required: true,
            title: "Pick one",
            type: "single_choice",
          },
          { required: true, title: "  ", type: "text" },
        ],
        title: "Feedback",
      },
    ],
  ])("rejects a draft with %s", (_, generated) => {
    expect(() => normalizeGeneratedDraft(generated)).toThrow(ConvexError);
  });
});
