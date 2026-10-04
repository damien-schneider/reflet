import type { PublicSurvey, SurveyQuestion } from "../types";

export const question = (
  id: string,
  order: number,
  overrides: Partial<SurveyQuestion> = {}
): SurveyQuestion => ({
  _id: id,
  order,
  required: false,
  title: `Question ${id}`,
  type: "text",
  ...overrides,
});

/**
 * nps → (score ≤ 6) detractor follow-up → end "sorry"
 *     → (score ≥ 9) promoter follow-up → end "thanks"
 *     → otherwise general follow-up
 */
export const npsFlow = (): SurveyQuestion[] => [
  question("nps", 0, {
    logic: [
      {
        id: "r-detractor",
        operator: "less_than",
        target: { kind: "question", questionId: "detractor" },
        value: 7,
      },
      {
        id: "r-promoter",
        operator: "greater_than",
        target: { kind: "question", questionId: "promoter" },
        value: 8,
      },
    ],
    required: true,
    type: "nps",
  }),
  question("general", 1, { next: { endingId: "thanks", kind: "ending" } }),
  question("detractor", 2, {
    next: { endingId: "sorry", kind: "ending" },
    required: true,
  }),
  question("promoter", 3, { next: { endingId: "thanks", kind: "ending" } }),
];

export const npsSurvey = (): PublicSurvey => ({
  _id: "survey-1",
  display: { frequency: "once" },
  endings: [
    { id: "thanks", title: "Thanks!" },
    { id: "sorry", title: "Sorry to hear that" },
  ],
  questions: npsFlow(),
  title: "NPS",
  triggerType: "page_visit",
});
