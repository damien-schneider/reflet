import type { PublicSurvey, SurveyQuestion } from "@reflet/survey-core";
import type { SurveyTransport } from "@reflet/survey-core/client";
import { vi } from "vitest";

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

export const survey = (
  overrides: Partial<PublicSurvey> = {}
): PublicSurvey => ({
  _id: "survey-1",
  display: { frequency: "once", position: "bottom_right" },
  endings: [{ id: "thanks", title: "Thanks!" }],
  questions: [],
  title: "Survey",
  triggerType: "manual",
  ...overrides,
});

/** Detractors (≤ 6) get a "what went wrong" follow-up and a sorry ending; promoters (≥ 9) a thanks ending. */
export const npsSurvey = (): PublicSurvey =>
  survey({
    endings: [
      { id: "thanks", title: "Thanks for the love!" },
      { id: "sorry", title: "Sorry to hear that" },
    ],
    questions: [
      question("nps", 0, {
        logic: [
          {
            id: "detractor",
            operator: "less_than",
            target: { kind: "question", questionId: "detractor" },
            value: 7,
          },
          {
            id: "promoter",
            operator: "greater_than",
            target: { kind: "question", questionId: "promoter" },
            value: 8,
          },
        ],
        required: true,
        title: "How likely are you to recommend us?",
        type: "nps",
      }),
      question("detractor", 1, {
        next: { endingId: "sorry", kind: "ending" },
        title: "What went wrong?",
      }),
      question("promoter", 2, {
        next: { endingId: "thanks", kind: "ending" },
        title: "What do you love most?",
      }),
    ],
    title: "NPS",
  });

export const recordingTransport = () => {
  const transport = {
    answer: vi.fn<SurveyTransport["answer"]>(() => Promise.resolve()),
    complete: vi.fn<SurveyTransport["complete"]>(() => Promise.resolve()),
    dismiss: vi.fn<SurveyTransport["dismiss"]>(() => Promise.resolve()),
    start: vi.fn<SurveyTransport["start"]>(() =>
      Promise.resolve({ responseId: "response-1" })
    ),
  } satisfies SurveyTransport;
  return transport;
};
