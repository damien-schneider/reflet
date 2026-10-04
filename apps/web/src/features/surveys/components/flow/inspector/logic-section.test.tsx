import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuestionId, SurveyQuestion } from "@/store/surveys";
import { LogicSection } from "./logic-section";

const updateQuestion = vi.hoisted(() => vi.fn(async () => null));

vi.mock("convex/react", () => ({
  useMutation: () =>
    Object.assign(updateQuestion, {
      withOptimisticUpdate: () => updateQuestion,
    }),
}));

const asQuestionId = (id: string) => id as QuestionId;
const surveyId = "survey" as Id<"surveys">;

const score: SurveyQuestion = {
  _id: asQuestionId("score"),
  logic: [
    {
      id: "rule-1",
      operator: "equals",
      target: { kind: "question", questionId: asQuestionId("why") },
      value: 0,
    },
  ],
  order: 0,
  required: true,
  title: "How likely are you to recommend us?",
  type: "nps",
};
const why: SurveyQuestion = {
  _id: asQuestionId("why"),
  order: 1,
  required: false,
  title: "What fell short?",
  type: "text",
};
const endings = [{ id: "thanks", title: "Thanks for the feedback" }];

const renderLogic = () =>
  render(
    <LogicSection
      endings={endings}
      question={score}
      questions={[score, why]}
      surveyId={surveyId}
    />
  );

const lastLogic = () => updateQuestion.mock.lastCall?.at(0);

describe("LogicSection", () => {
  afterEach(() => updateQuestion.mockClear());

  it("saves the condition, value and destination picked for a jump", async () => {
    const user = userEvent.setup();
    renderLogic();

    await user.selectOptions(
      screen.getByLabelText("Condition for jump 1"),
      "less_than"
    );
    expect(lastLogic()).toEqual({
      logic: [{ ...score.logic?.[0], operator: "less_than" }],
      questionId: "score",
    });

    await user.selectOptions(screen.getByLabelText("Value for jump 1"), "7");
    expect(lastLogic()).toEqual({
      logic: [{ ...score.logic?.[0], value: 7 }],
      questionId: "score",
    });

    await user.selectOptions(
      screen.getByLabelText("Go to"),
      "Thanks for the feedback"
    );
    expect(lastLogic()).toEqual({
      logic: [
        { ...score.logic?.[0], target: { endingId: "thanks", kind: "ending" } },
      ],
      questionId: "score",
    });
  });

  it("drops the value when the condition only checks whether it was answered", async () => {
    const user = userEvent.setup();
    renderLogic();

    await user.selectOptions(
      screen.getByLabelText("Condition for jump 1"),
      "skipped"
    );

    expect(lastLogic()).toEqual({
      logic: [
        {
          id: "rule-1",
          operator: "skipped",
          target: { kind: "question", questionId: "why" },
        },
      ],
      questionId: "score",
    });
  });

  it("adds a jump to the next later step with a value the scale can produce", async () => {
    const user = userEvent.setup();
    renderLogic();

    await user.click(screen.getByRole("button", { name: "Add jump" }));

    expect(lastLogic()).toEqual({
      logic: [
        score.logic?.[0],
        {
          id: expect.any(String),
          operator: "equals",
          target: { kind: "question", questionId: "why" },
          value: 0,
        },
      ],
      questionId: "score",
    });
  });

  it("routes the default path through “Otherwise go to”", async () => {
    const user = userEvent.setup();
    renderLogic();

    await user.selectOptions(
      screen.getByLabelText("Otherwise go to"),
      "Thanks for the feedback"
    );

    expect(lastLogic()).toEqual({
      next: { endingId: "thanks", kind: "ending" },
      questionId: "score",
    });
  });
});
