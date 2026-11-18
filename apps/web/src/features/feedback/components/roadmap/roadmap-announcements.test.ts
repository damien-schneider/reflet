import { describe, expect, it } from "vitest";
import { createAnnouncements } from "./roadmap-announcements";

const mockFeedback = [
  { _id: "f1", title: "Fix login bug" },
  { _id: "f2", organizationStatusId: "s2", title: "Add dark mode" },
  { _id: "f3", title: "Improve performance" },
] as Array<{ _id: string; title: string; organizationStatusId?: string }>;

const mockStatuses = [
  { _id: "s1", color: "blue", name: "In Progress" },
  { _id: "s2", color: "green", name: "Done" },
  { _id: "s3", color: "gray", name: "Backlog" },
];

describe("createAnnouncements", () => {
  describe("onDragStart", () => {
    it("should return pick up message with item title", () => {
      const { onDragStart } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragStart({ active: { id: "f1" } });
      expect(result).toBe("Picked up Fix login bug. Dragging.");
    });

    it("never announces undefined when the dragged card is not in the list", () => {
      const { onDragStart } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragStart({ active: { id: "gone" } });
      expect(result).toBe("Picked up item. Dragging.");
    });
  });

  describe("onDragOver", () => {
    it("names the column of the card it is over", () => {
      const { onDragOver } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragOver({ active: { id: "f1" }, over: { id: "f2" } });
      expect(result).toBe("Over Done column");
    });

    it("should return column name when over a status", () => {
      const { onDragOver } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragOver({
        active: { id: "f1" },
        over: { id: "s1" },
      });
      expect(result).toBe("Over In Progress column");
    });

    it("should return undefined when over is null", () => {
      const { onDragOver } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragOver({ active: { id: "f1" }, over: null });
      expect(result).toBeUndefined();
    });
  });

  describe("onDragEnd", () => {
    it("names the column of the card it was dropped on", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({ active: { id: "f1" }, over: { id: "f2" } });
      expect(result).toBe("Dropped Fix login bug in Done");
    });

    it("should return drop message when dropped on a status", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({
        active: { id: "f1" },
        over: { id: "s2" },
      });
      expect(result).toBe("Dropped Fix login bug in Done");
    });

    it("never announces undefined when the dropped card is not in the list", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({
        active: { id: "gone" },
        over: { id: "s2" },
      });
      expect(result).toBe("Dropped item in Done");
    });

    it("should return drag cancelled when over is null", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({ active: { id: "f1" }, over: null });
      expect(result).toBe("Drag cancelled");
    });
  });
});
