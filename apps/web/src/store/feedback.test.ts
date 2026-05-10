import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  feedbackSearchAtom,
  feedbackSortAtom,
  hideCompletedAtom,
  selectedStatusIdsAtom,
  selectedTagIdsAtom,
} from "./feedback";

describe("feedback store", () => {
  describe("initial values", () => {
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

    it("hideCompletedAtom defaults to true", () => {
      const store = createStore();
      expect(store.get(hideCompletedAtom)).toBe(true);
    });
  });

  describe("settable atoms", () => {
    it("can update hideCompletedAtom", () => {
      const store = createStore();
      store.set(hideCompletedAtom, false);
      expect(store.get(hideCompletedAtom)).toBe(false);
    });
  });
});
