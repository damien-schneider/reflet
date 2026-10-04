import { describe, expect, it } from "vitest";
import { answerIssue } from "../answers";
import { flowIssues, hasBlockingIssues } from "../flow-issues";
import { npsFlow, question } from "./fixtures";

const ENDINGS = [
  { id: "thanks", title: "Thanks" },
  { id: "sorry", title: "Sorry" },
];

describe("answerIssue", () => {
  it("accepts only whole ratings inside the configured scale", () => {
    const rating = {
      config: { maxValue: 10, minValue: 1 },
      type: "rating" as const,
    };
    expect(answerIssue(rating, 10)).toBeNull();
    expect(answerIssue(rating, 0)).not.toBeNull();
    expect(answerIssue(rating, 4.5)).not.toBeNull();
    expect(answerIssue({ type: "nps" }, 11)).not.toBeNull();
    expect(answerIssue({ type: "nps" }, "9")).not.toBeNull();
  });

  it("accepts an unlisted choice only as a bounded Other answer", () => {
    const closed = {
      config: { choices: ["A", "B"] },
      type: "single_choice" as const,
    };
    const open = {
      config: { allowOther: true, choices: ["A", "B"] },
      type: "single_choice" as const,
    };
    expect(answerIssue(closed, "A")).toBeNull();
    expect(answerIssue(closed, "C")).not.toBeNull();
    expect(answerIssue(open, "C")).toBeNull();
    expect(answerIssue(open, "x".repeat(201))).not.toBeNull();
  });

  it("rejects duplicate picks and more than one Other in a multiple choice", () => {
    const multi = {
      config: { allowOther: true, choices: ["A", "B"] },
      type: "multiple_choice" as const,
    };
    expect(answerIssue(multi, ["A", "Mine"])).toBeNull();
    expect(answerIssue(multi, ["A", "A"])).not.toBeNull();
    expect(answerIssue(multi, ["X", "Y"])).not.toBeNull();
  });

  it("caps text at the configured length and refuses answers to statements", () => {
    expect(
      answerIssue({ config: { maxLength: 3 }, type: "text" }, "abcd")
    ).not.toBeNull();
    expect(answerIssue({ type: "statement" }, "hi")).not.toBeNull();
  });
});

describe("flowIssues", () => {
  it("finds nothing wrong in a valid branching flow", () => {
    expect(flowIssues(npsFlow(), ENDINGS)).toEqual([]);
  });

  it("blocks a backward jump and a jump to a deleted ending", () => {
    const flow = [
      question("a", 0),
      question("b", 1, {
        logic: [
          {
            id: "back",
            operator: "answered",
            target: { kind: "question", questionId: "a" },
          },
        ],
        next: { endingId: "gone", kind: "ending" },
      }),
    ];
    const issues = flowIssues(flow, ENDINGS);
    expect(issues).toEqual([
      expect.objectContaining({
        questionId: "b",
        ruleId: "back",
        severity: "error",
      }),
      expect.objectContaining({ questionId: "b", severity: "error" }),
    ]);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("rejects a choice rule whose value isn't an option, and operators the type can't use", () => {
    const flow = [
      question("pick", 0, {
        config: { choices: ["Docs", "Pricing"] },
        logic: [
          {
            id: "typo",
            operator: "equals",
            target: { endingId: "thanks", kind: "ending" },
            value: "Pricng",
          },
          {
            id: "bad-op",
            operator: "greater_than",
            target: { endingId: "thanks", kind: "ending" },
            value: 3,
          },
        ],
        type: "single_choice",
      }),
    ];
    expect(flowIssues(flow, ENDINGS).map((issue) => issue.ruleId)).toEqual([
      "typo",
      "bad-op",
    ]);
  });

  it("warns, without blocking, about questions no path reaches", () => {
    const flow = [
      question("a", 0, { next: { endingId: "thanks", kind: "ending" } }),
      question("orphan", 1),
    ];
    const issues = flowIssues(flow, ENDINGS);
    expect(issues).toEqual([
      expect.objectContaining({ questionId: "orphan", severity: "warning" }),
    ]);
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("requires an answerable question and at least two distinct options", () => {
    expect(hasBlockingIssues(flowIssues([], ENDINGS))).toBe(true);
    expect(
      hasBlockingIssues(
        flowIssues(
          [
            question("q", 0, {
              config: { choices: ["A", "A"] },
              type: "multiple_choice",
            }),
          ],
          ENDINGS
        )
      )
    ).toBe(true);
  });
});
