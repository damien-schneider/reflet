import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFeedbackEditing } from "./use-feedback-editing";

describe("useFeedbackEditing", () => {
  const feedbackId = "feedback123" as Id<"feedback">;
  const updateFeedback = vi.fn().mockResolvedValue(undefined);

  const baseFeedback = {
    title: "Original Title",
    description: "Original Description",
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderUseFeedbackEditing = (
    overrides?: Partial<Parameters<typeof useFeedbackEditing>[0]>
  ) =>
    renderHook(
      ({ feedback }) =>
        useFeedbackEditing({
          feedbackId,
          feedback,
          updateFeedback,
          ...overrides,
        }),
      { initialProps: { feedback: overrides?.feedback ?? baseFeedback } }
    );

  it("should initialize state from feedback", () => {
    const { result } = renderUseFeedbackEditing();
    expect(result.current.editedTitle).toBe("Original Title");
    expect(result.current.editedDescription).toBe("Original Description");
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("should handle feedback with null description", () => {
    const { result } = renderUseFeedbackEditing({
      feedback: { title: "Title", description: null },
    });
    expect(result.current.editedDescription).toBe("");
  });

  it("should handle null feedback", () => {
    const { result } = renderUseFeedbackEditing({ feedback: null });
    expect(result.current.editedTitle).toBe("");
    expect(result.current.editedDescription).toBe("");
  });

  it("should handle undefined feedback", () => {
    const { result } = renderUseFeedbackEditing({ feedback: undefined });
    expect(result.current.editedTitle).toBe("");
    expect(result.current.editedDescription).toBe("");
  });

  describe("handleTitleChange", () => {
    it("should update title and set hasUnsavedChanges", () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("New Title");
      });

      expect(result.current.editedTitle).toBe("New Title");
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it("should not flag unsaved when title matches original", () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("Original Title");
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe("handleDescriptionChange", () => {
    it("should update description and set hasUnsavedChanges", () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleDescriptionChange("New Description");
      });

      expect(result.current.editedDescription).toBe("New Description");
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it("should not flag unsaved when description matches original", () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleDescriptionChange("Original Description");
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe("handleSaveChanges", () => {
    it("should call updateFeedback with changed title", async () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("New Title");
      });

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      expect(updateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        title: "New Title",
      });
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it("should call updateFeedback with changed description", async () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleDescriptionChange("New Description");
      });

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      expect(updateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        description: "New Description",
      });
    });

    it("should call updateFeedback with both changes", async () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("New Title");
        result.current.handleDescriptionChange("New Description");
      });

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      expect(updateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        title: "New Title",
        description: "New Description",
      });
    });

    it("should not call updateFeedback when nothing changed", async () => {
      const { result } = renderUseFeedbackEditing();

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      expect(updateFeedback).not.toHaveBeenCalled();
    });

    it("should not call updateFeedback when feedbackId is null", async () => {
      const { result } = renderUseFeedbackEditing({ feedbackId: null });

      act(() => {
        result.current.handleTitleChange("New");
      });

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      expect(updateFeedback).not.toHaveBeenCalled();
    });

    it("should trim title before comparing", async () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("  Original Title  ");
      });

      await act(async () => {
        await result.current.handleSaveChanges();
      });

      // Trimmed title matches original, so no title update
      expect(updateFeedback).not.toHaveBeenCalled();
    });
  });

  describe("handleCancelChanges", () => {
    it("should reset to original values", () => {
      const { result } = renderUseFeedbackEditing();

      act(() => {
        result.current.handleTitleChange("Changed");
        result.current.handleDescriptionChange("Changed desc");
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.handleCancelChanges();
      });

      expect(result.current.editedTitle).toBe("Original Title");
      expect(result.current.editedDescription).toBe("Original Description");
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it("should do nothing when feedback is null", () => {
      const { result } = renderUseFeedbackEditing({ feedback: null });

      act(() => {
        result.current.handleCancelChanges();
      });

      expect(result.current.editedTitle).toBe("");
    });
  });

  describe("syncing with feedback changes", () => {
    it("should update state when feedback prop changes", () => {
      const { result, rerender } = renderHook(
        ({ feedback }) =>
          useFeedbackEditing({ feedbackId, feedback, updateFeedback }),
        {
          initialProps: {
            feedback: baseFeedback as typeof baseFeedback | null,
          },
        }
      );

      expect(result.current.editedTitle).toBe("Original Title");

      rerender({
        feedback: { title: "Updated Title", description: "Updated Desc" },
      });

      expect(result.current.editedTitle).toBe("Updated Title");
      expect(result.current.editedDescription).toBe("Updated Desc");
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });
});
