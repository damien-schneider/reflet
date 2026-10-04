import type { FlowQuestion, SurveyEnding } from "@reflet/survey-core";
import { describe, expect, it } from "vitest";
import { flowConnections } from "@/features/surveys/lib/flow/layout";
import type { QuestionId } from "@/store/surveys";
import { reachableInsertAnchor } from "./flow-elements";

const endings: SurveyEnding[] = [
  { id: "thanks", title: "Thanks" },
  { id: "promoters", title: "Thank you!" },
];

// Convex ids only come from a deployment; tests need plain strings in their place.
const questionId = (id: string): QuestionId => id as QuestionId;

const question = (
  id: string,
  order: number,
  extra: Partial<FlowQuestion<QuestionId>> = {}
): FlowQuestion<QuestionId> => ({
  _id: questionId(id),
  order,
  required: true,
  type: "text",
  ...extra,
});

const toThanks = { endingId: "thanks", kind: "ending" } as const;

const branchingFlow = [
  question("score", 0, {
    logic: [
      {
        id: "low",
        operator: "less_than",
        target: { kind: "question", questionId: questionId("why-low") },
        value: 7,
      },
    ],
    next: { endingId: "promoters", kind: "ending" },
    type: "nps",
  }),
  question("why-low", 1, { next: toThanks }),
];

const linearFlow = [question("first", 0), question("second", 1)];

const modelOf = (questions: FlowQuestion<QuestionId>[]) => ({
  connections: flowConnections(questions, endings),
  questions,
});

describe("reachableInsertAnchor", () => {
  it("splits the last step's jump to an ending when nothing is selected", () => {
    expect(reachableInsertAnchor(modelOf(branchingFlow), null)).toEqual({
      after: "why-low",
      splits: { questionId: "why-low" },
    });
  });

  it("splits the selected step's explicit default path", () => {
    expect(
      reachableInsertAnchor(modelOf(branchingFlow), {
        kind: "question",
        questionId: questionId("score"),
      })
    ).toEqual({ after: "score", splits: { questionId: "score" } });
  });

  it("inserts right after a linear step without rewiring", () => {
    expect(
      reachableInsertAnchor(modelOf(linearFlow), {
        kind: "question",
        questionId: questionId("first"),
      })
    ).toEqual({ after: "first" });
  });

  it("inserts first when the start is selected", () => {
    expect(
      reachableInsertAnchor(modelOf(branchingFlow), { kind: "start" })
    ).toEqual({ after: null });
  });
});
