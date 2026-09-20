import { Experimental_EvaluationMockModelV4 as MockEvaluationModel } from "ai/test";
import { describe, expect, it } from "vitest";
import type { Id } from "../../_generated/dataModel";
import { evaluateFeedbackTriage, type TriageTag } from "../triage_evaluation";

const tagId = (suffix: string) => suffix as Id<"tags">;

const BUG = tagId("tag_bug");
const BILLING = tagId("tag_billing");
const MOBILE = tagId("tag_mobile");
const DOCS = tagId("tag_docs");

const tags: TriageTag[] = [
  { _id: BUG, name: "Bug" },
  { _id: BILLING, description: "Charges, invoices, refunds", name: "Billing" },
  { _id: MOBILE, name: "Mobile" },
  { _id: DOCS, name: "Docs" },
];

const mockJev = (probabilities: Record<string, number>) =>
  new MockEvaluationModel({
    doEvaluate: async ({ questions }) => ({
      answers: Object.fromEntries(
        Object.keys(questions).map((id) => [
          id,
          { probability: probabilities[id] ?? 0, type: "boolean" as const },
        ])
      ),
      warnings: [],
    }),
  });

const triage = (probabilities: Record<string, number>) =>
  evaluateFeedbackTriage(
    { description: "Checkout fails on iOS", tags, title: "Broken checkout" },
    mockJev(probabilities)
  );

describe("evaluateFeedbackTriage", () => {
  it("keeps genuine but unactionable feedback public, recording its scores", async () => {
    const result = await triage({
      junk: 0.06,
      needsReview: 0.82,
      usefulness: 0.05,
    });

    expect(result.withhold).toBe(false);
    expect(result.usefulness).toBe(0.05);
    expect(result.needsReview).toBe(0.82);
  });

  it("withholds junk for review while still tagging it", async () => {
    const result = await triage({
      [`tag:${BUG}`]: 0.99,
      junk: 0.94,
      usefulness: 0.03,
    });

    expect(result.withhold).toBe(true);
    expect(result.tagIds).toEqual([BUG]);
  });

  it("keeps only tags at or above the confidence floor, ranked by probability", async () => {
    const result = await triage({
      [`tag:${BILLING}`]: 0.71,
      [`tag:${BUG}`]: 0.93,
      [`tag:${DOCS}`]: 0.64,
      [`tag:${MOBILE}`]: 0.02,
      usefulness: 0.97,
    });

    expect(result.withhold).toBe(false);
    expect(result.tagIds).toEqual([BUG, BILLING]);
  });

  it("caps tag selection at three even when every tag is confident", async () => {
    const result = await triage({
      [`tag:${BILLING}`]: 0.97,
      [`tag:${BUG}`]: 0.99,
      [`tag:${DOCS}`]: 0.95,
      [`tag:${MOBILE}`]: 0.98,
      usefulness: 0.99,
    });

    expect(result.tagIds).toEqual([BUG, MOBILE, BILLING]);
  });

  it("rejects rather than resolving to junk when the verdict is incomplete", async () => {
    const dropVerdict = new MockEvaluationModel({
      doEvaluate: async () => ({
        answers: {
          junk: { probability: 0.1, type: "boolean" },
          usefulness: { probability: 0.9, type: "boolean" },
        },
        warnings: [],
      }),
    });

    await expect(
      evaluateFeedbackTriage(
        { description: "Checkout fails", tags, title: "Broken checkout" },
        dropVerdict
      )
    ).rejects.toThrow();
  });

  it("asks one question per tag plus the three verdict gates in a single call", async () => {
    let asked: Record<string, unknown> = {};

    await evaluateFeedbackTriage(
      { description: "Checkout fails", tags, title: "Broken checkout" },
      new MockEvaluationModel({
        doEvaluate: async ({ questions }) => {
          asked = questions;
          return {
            answers: Object.fromEntries(
              Object.keys(questions).map((id) => [
                id,
                { probability: 0, type: "boolean" as const },
              ])
            ),
            warnings: [],
          };
        },
      })
    );

    expect(Object.keys(asked)).toEqual([
      "usefulness",
      "junk",
      "needsReview",
      `tag:${BUG}`,
      `tag:${BILLING}`,
      `tag:${MOBILE}`,
      `tag:${DOCS}`,
    ]);
  });

  it("sends both criteria branches, which the API rejects a question without", async () => {
    let asked: Record<string, { criteria?: Record<string, unknown> }> = {};

    await evaluateFeedbackTriage(
      { description: "Checkout fails", tags, title: "Broken checkout" },
      new MockEvaluationModel({
        doEvaluate: async ({ questions }) => {
          asked = questions as typeof asked;
          return {
            answers: Object.fromEntries(
              Object.keys(questions).map((id) => [
                id,
                { probability: 0, type: "boolean" as const },
              ])
            ),
            warnings: [],
          };
        },
      })
    );

    for (const [id, question] of Object.entries(asked)) {
      expect(question.criteria, `${id} criteria`).toEqual(
        expect.objectContaining({
          false: expect.any(String),
          true: expect.any(String),
        })
      );
    }
  });
});
