import { describe, expect, it } from "vitest";
import { createAnnouncements } from "./roadmap-announcements";

const mockFeedback = [
  { _id: "f1", title: "Fix login bug" },
  { _id: "f2", title: "Add dark mode" },
  { _id: "f3", title: "Improve performance" },
] as Array<{ _id: string; title: string }>;

const mockStatuses = [
  { _id: "s1", name: "In Progress", color: "blue" },
  { _id: "s2", name: "Done", color: "green" },
  { _id: "s3", name: "Backlog", color: "gray" },
];

describe("createAnnouncements", () => {
  it("should return an object with all announcement handlers", () => {
    const announcements = createAnnouncements(
      mockFeedback as never,
      mockStatuses
    );
    expect(announcements.onDragStart).toBeTypeOf("function");
    expect(announcements.onDragOver).toBeTypeOf("function");
    expect(announcements.onDragEnd).toBeTypeOf("function");
    expect(announcements.onDragCancel).toBeTypeOf("function");
  });

  describe("onDragStart", () => {
    it("should return pick up message with item title", () => {
      const { onDragStart } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragStart({ active: { id: "f1" } });
      expect(result).toBe("Picked up Fix login bug. Dragging.");
    });

    it("should handle item not found gracefully", () => {
      const { onDragStart } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragStart({ active: { id: "nonexistent" } });
      expect(result).toBe("Picked up undefined. Dragging.");
    });
  });

  describe("onDragOver", () => {
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

    it("should return undefined when over unknown status", () => {
      const { onDragOver } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragOver({
        active: { id: "f1" },
        over: { id: "unknown" },
      });
      expect(result).toBeUndefined();
    });
  });

  describe("onDragEnd", () => {
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

    it("should return drag cancelled when over is null", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({ active: { id: "f1" }, over: null });
      expect(result).toBe("Drag cancelled");
    });

    it("should return drag cancelled when over unknown status", () => {
      const { onDragEnd } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragEnd({
        active: { id: "f1" },
        over: { id: "unknown" },
      });
      expect(result).toBe("Drag cancelled");
    });
  });

  describe("onDragCancel", () => {
    it("should return drag cancelled string", () => {
      const { onDragCancel } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      expect(onDragCancel()).toBe("Drag cancelled");
    });
  });

  describe("edge cases", () => {
    it("should handle empty feedback array", () => {
      const announcements = createAnnouncements([] as never, mockStatuses);
      const result = announcements.onDragStart({ active: { id: "f1" } });
      expect(result).toBe("Picked up undefined. Dragging.");
    });

    it("should handle empty statuses array", () => {
      const announcements = createAnnouncements(mockFeedback as never, []);
      const result = announcements.onDragOver({
        active: { id: "f1" },
        over: { id: "s1" },
      });
      expect(result).toBeUndefined();
    });

    it("should handle numeric ids", () => {
      const { onDragStart } = createAnnouncements(
        mockFeedback as never,
        mockStatuses
      );
      const result = onDragStart({ active: { id: 123 } });
      expect(result).toBe("Picked up undefined. Dragging.");
    });
  });
});
