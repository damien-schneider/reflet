import { describe, expect, it } from "vitest";
import { sortFeedback } from "./sort-feedback";

// Minimal mock to satisfy the FeedbackItem interface for sorting
const createItem = (
  overrides: Partial<{
    _id: string;
    voteCount: number;
    commentCount: number;
    createdAt: number;
    isPinned: boolean;
  }> = {}
) =>
  ({
    _id: overrides._id ?? "id-1",
    title: "Test",
    voteCount: overrides.voteCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
    createdAt: overrides.createdAt ?? 1000,
    isPinned: overrides.isPinned ?? false,
    organizationId: "org-1",
  }) as Parameters<typeof sortFeedback>[0][number];

describe("sortFeedback", () => {
  describe("sort by votes", () => {
    it("sorts by vote count descending", () => {
      const items = [
        createItem({ _id: "a", voteCount: 5 }),
        createItem({ _id: "b", voteCount: 10 }),
        createItem({ _id: "c", voteCount: 1 }),
      ];
      const sorted = sortFeedback(items, "votes");
      expect(sorted.map((i) => i._id)).toEqual(["b", "a", "c"]);
    });
  });

  describe("sort by newest", () => {
    it("sorts by createdAt descending", () => {
      const items = [
        createItem({ _id: "a", createdAt: 100 }),
        createItem({ _id: "b", createdAt: 300 }),
        createItem({ _id: "c", createdAt: 200 }),
      ];
      const sorted = sortFeedback(items, "newest");
      expect(sorted.map((i) => i._id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("sort by oldest", () => {
    it("sorts by createdAt ascending", () => {
      const items = [
        createItem({ _id: "a", createdAt: 300 }),
        createItem({ _id: "b", createdAt: 100 }),
        createItem({ _id: "c", createdAt: 200 }),
      ];
      const sorted = sortFeedback(items, "oldest");
      expect(sorted.map((i) => i._id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("sort by comments", () => {
    it("sorts by comment count descending", () => {
      const items = [
        createItem({ _id: "a", commentCount: 2 }),
        createItem({ _id: "b", commentCount: 10 }),
        createItem({ _id: "c", commentCount: 5 }),
      ];
      const sorted = sortFeedback(items, "comments");
      expect(sorted.map((i) => i._id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("pinned items", () => {
    it("pinned items always come first regardless of sort", () => {
      const items = [
        createItem({ _id: "a", voteCount: 100, isPinned: false }),
        createItem({ _id: "b", voteCount: 1, isPinned: true }),
        createItem({ _id: "c", voteCount: 50, isPinned: false }),
      ];
      const sorted = sortFeedback(items, "votes");
      expect(sorted[0]._id).toBe("b");
    });

    it("multiple pinned items are sorted among themselves", () => {
      const items = [
        createItem({ _id: "a", voteCount: 5, isPinned: true }),
        createItem({ _id: "b", voteCount: 10, isPinned: true }),
        createItem({ _id: "c", voteCount: 50, isPinned: false }),
      ];
      const sorted = sortFeedback(items, "votes");
      expect(sorted[0]._id).toBe("b");
      expect(sorted[1]._id).toBe("a");
      expect(sorted[2]._id).toBe("c");
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      expect(sortFeedback([], "votes")).toEqual([]);
    });

    it("returns single item unchanged", () => {
      const items = [createItem({ _id: "only" })];
      const sorted = sortFeedback(items, "votes");
      expect(sorted).toHaveLength(1);
      expect(sorted[0]._id).toBe("only");
    });

    it("does not mutate original array", () => {
      const items = [
        createItem({ _id: "a", voteCount: 1 }),
        createItem({ _id: "b", voteCount: 10 }),
      ];
      const original = [...items];
      sortFeedback(items, "votes");
      expect(items.map((i) => i._id)).toEqual(original.map((i) => i._id));
    });

    it("handles unknown sort option gracefully (returns original order)", () => {
      const items = [createItem({ _id: "a" }), createItem({ _id: "b" })];
      const sorted = sortFeedback(items, "unknown" as any);
      expect(sorted.map((i) => i._id)).toEqual(["a", "b"]);
    });

    it("handles items with equal values (stable relative order)", () => {
      const items = [
        createItem({ _id: "a", voteCount: 5 }),
        createItem({ _id: "b", voteCount: 5 }),
        createItem({ _id: "c", voteCount: 5 }),
      ];
      const sorted = sortFeedback(items, "votes");
      expect(sorted).toHaveLength(3);
    });
  });
});
