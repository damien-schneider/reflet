import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";
import { buildSuggestedFeedback } from "./build-suggested-feedback";

const feedbackId = (id: string) => id as Id<"feedback">;

const makeMatch = (
  fId: string,
  confidence: "high" | "medium" | "low" = "high",
  reason = "test reason"
) => ({
  feedbackId: fId,
  confidence,
  reason,
});

const makeFeedback = (
  id: string,
  status = "open",
  title = `Feedback ${id}`
) => ({
  _id: feedbackId(id),
  title,
  status,
});

describe("buildSuggestedFeedback", () => {
  it("returns empty array when no matches", () => {
    const result = buildSuggestedFeedback([], new Set(), [makeFeedback("f1")]);
    expect(result).toEqual([]);
  });

  it("returns empty array when available feedback is undefined", () => {
    const result = buildSuggestedFeedback(
      [makeMatch("f1")],
      new Set(),
      undefined
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when available feedback is empty", () => {
    const result = buildSuggestedFeedback([makeMatch("f1")], new Set(), []);
    expect(result).toEqual([]);
  });

  it("maps matches to feedback items with match metadata", () => {
    const result = buildSuggestedFeedback(
      [makeMatch("f1", "high", "addressed in release")],
      new Set(),
      [makeFeedback("f1", "open", "Bug in login")]
    );
    expect(result).toEqual([
      {
        _id: feedbackId("f1"),
        title: "Bug in login",
        status: "open",
        match: {
          feedbackId: "f1",
          confidence: "high",
          reason: "addressed in release",
        },
      },
    ]);
  });

  it("filters out feedback already linked to current release", () => {
    const linkedIds = new Set([feedbackId("f1")]);
    const result = buildSuggestedFeedback(
      [makeMatch("f1"), makeMatch("f2")],
      linkedIds,
      [makeFeedback("f1"), makeFeedback("f2")]
    );
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe(feedbackId("f2"));
  });

  it("includes feedback of any status", () => {
    const statuses = [
      "open",
      "under_review",
      "planned",
      "in_progress",
      "completed",
      "closed",
    ];
    const feedback = statuses.map((s, i) => makeFeedback(`f${i}`, s));
    const matches = statuses.map((_, i) => makeMatch(`f${i}`));

    const result = buildSuggestedFeedback(matches, new Set(), feedback);

    expect(result).toHaveLength(statuses.length);
    const resultStatuses = result.map((r) => r.status);
    for (const status of statuses) {
      expect(resultStatuses).toContain(status);
    }
  });

  it("skips matches whose feedback ID is not in available list", () => {
    const result = buildSuggestedFeedback(
      [makeMatch("f1"), makeMatch("f999")],
      new Set(),
      [makeFeedback("f1")]
    );
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe(feedbackId("f1"));
  });

  it("preserves match ordering from AI response", () => {
    const result = buildSuggestedFeedback(
      [
        makeMatch("f3", "low"),
        makeMatch("f1", "high"),
        makeMatch("f2", "medium"),
      ],
      new Set(),
      [makeFeedback("f1"), makeFeedback("f2"), makeFeedback("f3")]
    );
    expect(result.map((r) => r._id)).toEqual([
      feedbackId("f3"),
      feedbackId("f1"),
      feedbackId("f2"),
    ]);
  });
});
