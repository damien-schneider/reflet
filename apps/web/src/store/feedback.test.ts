import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  feedbackDetailModalOpenAtom,
  feedbackFiltersAtom,
  feedbackSearchAtom,
  feedbackSortAtom,
  hideCompletedAtom,
  newFeedbackDialogOpenAtom,
  selectedFeedbackIdAtom,
  selectedStatusIdsAtom,
  selectedTagIdsAtom,
} from "./feedback";

describe("feedback store", () => {
  describe("initial values", () => {
    it("selectedFeedbackIdAtom defaults to null", () => {
      const store = createStore();
      expect(store.get(selectedFeedbackIdAtom)).toBeNull();
    });

    it("feedbackSearchAtom defaults to empty string", () => {
      const store = createStore();
      expect(store.get(feedbackSearchAtom)).toBe("");
    });

    it("feedbackSortAtom defaults to most_votes", () => {
      const store = createStore();
      expect(store.get(feedbackSortAtom)).toBe("most_votes");
    });

    it("selectedStatusIdsAtom defaults to empty array", () => {
      const store = createStore();
      expect(store.get(selectedStatusIdsAtom)).toEqual([]);
    });

    it("selectedTagIdsAtom defaults to empty array", () => {
      const store = createStore();
      expect(store.get(selectedTagIdsAtom)).toEqual([]);
    });

    it("feedbackFiltersAtom defaults correctly", () => {
      const store = createStore();
      expect(store.get(feedbackFiltersAtom)).toEqual({
        status: null,
        tagIds: [],
        search: "",
        sortBy: "votes",
      });
    });

    it("hideCompletedAtom defaults to true", () => {
      const store = createStore();
      expect(store.get(hideCompletedAtom)).toBe(true);
    });

    it("newFeedbackDialogOpenAtom defaults to false", () => {
      const store = createStore();
      expect(store.get(newFeedbackDialogOpenAtom)).toBe(false);
    });

    it("feedbackDetailModalOpenAtom defaults to false", () => {
      const store = createStore();
      expect(store.get(feedbackDetailModalOpenAtom)).toBe(false);
    });
  });

  describe("settable atoms", () => {
    it("can update feedbackFiltersAtom", () => {
      const store = createStore();
      store.set(feedbackFiltersAtom, {
        status: "open",
        tagIds: ["tag-1"],
        search: "hello",
        sortBy: "newest",
      });
      expect(store.get(feedbackFiltersAtom)).toEqual({
        status: "open",
        tagIds: ["tag-1"],
        search: "hello",
        sortBy: "newest",
      });
    });

    it("can update hideCompletedAtom", () => {
      const store = createStore();
      store.set(hideCompletedAtom, false);
      expect(store.get(hideCompletedAtom)).toBe(false);
    });
  });
});
