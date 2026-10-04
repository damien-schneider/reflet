import { describe, expect, it } from "vitest";
import {
  evaluateRule,
  flowEdges,
  missingRequiredAnswers,
  resolveNextStep,
  walkPath,
} from "../flow";
import type { AnswerValue } from "../types";
import { npsFlow, question } from "./fixtures";

const answers = (entries: Record<string, AnswerValue>) =>
  new Map(Object.entries(entries));

const pathIds = (entries: Record<string, AnswerValue>) => {
  const path = walkPath(npsFlow(), answers(entries), [
    { id: "thanks", title: "Thanks" },
    { id: "sorry", title: "Sorry" },
  ]);
  return {
    ending: path.ending.id,
    questions: path.questions.map((q) => q._id),
  };
};

describe("walkPath", () => {
  it("branches on the first matching rule and ends where the branch says", () => {
    expect(pathIds({ nps: 3 })).toEqual({
      ending: "sorry",
      questions: ["nps", "detractor"],
    });
    expect(pathIds({ nps: 10 })).toEqual({
      ending: "thanks",
      questions: ["nps", "promoter"],
    });
    expect(pathIds({ nps: 7 })).toEqual({
      ending: "thanks",
      questions: ["nps", "general"],
    });
  });

  it("falls through question order and ends on the default ending without logic", () => {
    const path = walkPath(
      [question("b", 1), question("a", 0), question("c", 2)],
      answers({})
    );
    expect(path.questions.map((q) => q._id)).toEqual(["a", "b", "c"]);
    expect(path.ending.id).toBe("default");
  });

  it("ignores a jump that points backward, so the flow always ends", () => {
    const looping = [
      question("a", 0),
      question("b", 1, {
        logic: [
          {
            id: "loop",
            operator: "answered",
            target: { kind: "question", questionId: "a" },
          },
        ],
      }),
    ];
    const path = walkPath(looping, answers({ a: "x", b: "y" }));
    expect(path.questions.map((q) => q._id)).toEqual(["a", "b"]);
  });

  it("never lets a statement's logic run", () => {
    const flow = [
      question("intro", 0, {
        logic: [
          {
            id: "skip",
            operator: "skipped",
            target: { endingId: "default", kind: "ending" },
          },
        ],
        type: "statement",
      }),
      question("q", 1),
    ];
    expect(walkPath(flow, answers({})).questions.map((q) => q._id)).toEqual([
      "intro",
      "q",
    ]);
  });
});

describe("missingRequiredAnswers", () => {
  it("only counts required questions on the path the answers lead to", () => {
    const flow = npsFlow();
    expect(missingRequiredAnswers(flow, answers({ nps: 10 }))).toEqual([]);
    expect(
      missingRequiredAnswers(flow, answers({ nps: 2 })).map((q) => q._id)
    ).toEqual(["detractor"]);
    expect(missingRequiredAnswers(flow, answers({})).map((q) => q._id)).toEqual(
      ["nps"]
    );
  });
});

describe("evaluateRule", () => {
  it("matches choices exactly and text case-insensitively", () => {
    const includesPricing = { operator: "includes" as const, value: "Pricing" };
    expect(evaluateRule(includesPricing, ["Docs", "Pricing"])).toBe(true);
    expect(evaluateRule(includesPricing, ["pricing"])).toBe(false);
    expect(evaluateRule(includesPricing, "the PRICING page")).toBe(true);
  });

  it("treats blank text and empty selections as skipped", () => {
    expect(evaluateRule({ operator: "skipped" }, "  ")).toBe(true);
    expect(evaluateRule({ operator: "skipped" }, [])).toBe(true);
    expect(evaluateRule({ operator: "answered" }, 0)).toBe(true);
    expect(evaluateRule({ operator: "not_equals", value: 5 }, undefined)).toBe(
      false
    );
  });

  it("only compares numbers against numbers", () => {
    expect(evaluateRule({ operator: "greater_than", value: 8 }, 9)).toBe(true);
    expect(evaluateRule({ operator: "greater_than", value: "8" }, 9)).toBe(
      false
    );
  });
});

describe("resolveNextStep", () => {
  it("uses the question's own next target when no rule matches", () => {
    const flow = npsFlow();
    const general = flow[1];
    if (!general) {
      throw new Error("fixture");
    }
    const step = resolveNextStep(flow, general, "fine", [
      { id: "thanks", title: "Thanks" },
    ]);
    expect(step).toMatchObject({ ending: { id: "thanks" }, kind: "ending" });
  });

  it("lands on the first ending when a jump names a deleted ending", () => {
    const flow = [
      question("a", 0, { next: { endingId: "gone", kind: "ending" } }),
    ];
    const first = flow[0];
    if (!first) {
      throw new Error("fixture");
    }
    expect(resolveNextStep(flow, first, "x")).toMatchObject({
      ending: { id: "default" },
    });
  });
});

describe("flowEdges", () => {
  it("lists rule edges plus the resolved default edge for each question", () => {
    const edges = flowEdges(npsFlow(), [
      { id: "thanks", title: "Thanks" },
      { id: "sorry", title: "Sorry" },
    ]);
    const fromNps = edges.filter((edge) => edge.from === "nps");
    expect(fromNps.map((edge) => [edge.kind, edge.target])).toEqual([
      ["rule", { kind: "question", questionId: "detractor" }],
      ["rule", { kind: "question", questionId: "promoter" }],
      ["default", { kind: "question", questionId: "general" }],
    ]);
    expect(edges.find((edge) => edge.from === "promoter")?.target).toEqual({
      endingId: "thanks",
      kind: "ending",
    });
  });
});
