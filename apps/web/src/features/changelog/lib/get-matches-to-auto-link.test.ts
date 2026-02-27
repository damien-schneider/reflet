import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";
import { getMatchesToAutoLink } from "./get-matches-to-auto-link";

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

describe("getMatchesToAutoLink", () => {
  it("returns all matches when none are already linked", () => {
    const matches = [
      makeMatch("f1", "high"),
      makeMatch("f2", "medium"),
      makeMatch("f3", "low"),
    ];
    const result = getMatchesToAutoLink(matches, new Set());
    expect(result).toEqual(["f1", "f2", "f3"]);
  });

  it("filters out matches already linked to the current release", () => {
    const matches = [makeMatch("f1"), makeMatch("f2"), makeMatch("f3")];
    const linkedIds = new Set([feedbackId("f2")]);
    const result = getMatchesToAutoLink(matches, linkedIds);
    expect(result).toEqual(["f1", "f3"]);
  });

  it("returns empty array when all matches are already linked", () => {
    const matches = [makeMatch("f1"), makeMatch("f2")];
    const linkedIds = new Set([feedbackId("f1"), feedbackId("f2")]);
    const result = getMatchesToAutoLink(matches, linkedIds);
    expect(result).toEqual([]);
  });

  it("returns empty array when no matches", () => {
    const result = getMatchesToAutoLink([], new Set());
    expect(result).toEqual([]);
  });

  it("preserves order from matches (high confidence first)", () => {
    const matches = [
      makeMatch("f1", "high"),
      makeMatch("f2", "medium"),
      makeMatch("f3", "low"),
    ];
    const result = getMatchesToAutoLink(matches, new Set());
    expect(result).toEqual(["f1", "f2", "f3"]);
  });
});
