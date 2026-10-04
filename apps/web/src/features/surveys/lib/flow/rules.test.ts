import { describe, expect, it } from "vitest";
import { defaultRuleValue, describeRule, ruleValueOptions } from "./rules";

describe("describeRule", () => {
  it.each([
    [
      { type: "nps" as const },
      { operator: "less_than" as const, value: 7 },
      "Score < 7",
    ],
    [
      { type: "rating" as const },
      { operator: "greater_than" as const, value: 3 },
      "Rating > 3",
    ],
    [
      { type: "nps" as const },
      { operator: "not_equals" as const, value: 10 },
      "Score ≠ 10",
    ],
    [
      { type: "single_choice" as const },
      { operator: "equals" as const, value: "Pricing" },
      "Picked “Pricing”",
    ],
    [
      { type: "single_choice" as const },
      { operator: "not_equals" as const, value: "Pricing" },
      "Didn’t pick “Pricing”",
    ],
    [
      { type: "multiple_choice" as const },
      { operator: "includes" as const, value: "Docs" },
      "Picked “Docs”",
    ],
    [
      { type: "text" as const },
      { operator: "includes" as const, value: "bug" },
      "Mentions “bug”",
    ],
    [
      { type: "boolean" as const },
      { operator: "equals" as const, value: false },
      "Answered “No”",
    ],
    [{ type: "text" as const }, { operator: "skipped" as const }, "Skipped"],
    [
      { type: "rating" as const },
      { operator: "answered" as const },
      "Answered",
    ],
  ])("describes %o %o as “%s”", (question, rule, expected) => {
    expect(describeRule(rule, question)).toBe(expected);
  });

  it("shows a placeholder while the value is still missing", () => {
    expect(
      describeRule({ operator: "equals" }, { type: "single_choice" })
    ).toBe("Picked …");
    expect(describeRule({ operator: "less_than" }, { type: "nps" })).toBe(
      "Score < …"
    );
  });
});

describe("rule values", () => {
  it("offers every point of the scale, NPS always 0–10", () => {
    expect(
      ruleValueOptions({
        config: { maxValue: 3, minValue: 1 },
        type: "rating",
      })?.map((o) => o.value)
    ).toEqual([1, 2, 3]);
    expect(ruleValueOptions({ type: "nps" })).toHaveLength(11);
  });

  it("starts a new condition on a value the question can actually produce", () => {
    expect(
      defaultRuleValue(
        { config: { choices: ["A", "B"] }, type: "single_choice" },
        "equals"
      )
    ).toBe("A");
    expect(defaultRuleValue({ type: "boolean" }, "equals")).toBe(true);
    expect(defaultRuleValue({ type: "nps" }, "skipped")).toBeUndefined();
  });
});
