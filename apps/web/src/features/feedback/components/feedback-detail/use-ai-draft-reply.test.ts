import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { useAIDraftReply } from "./use-ai-draft-reply";

describe("useAIDraftReply", () => {
  const feedbackId = "feedback123" as Id<"feedback">;
  const setNewComment = vi.fn();
  const mockInitiateDraftReply = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockInitiateDraftReply);
    mockUseQuery.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderUseAIDraftReply = (
    overrides?: Partial<Parameters<typeof useAIDraftReply>[0]>
  ) =>
    renderHook(() =>
      useAIDraftReply({
        effectiveIsAdmin: true,
        feedbackId,
        setNewComment,
        ...overrides,
      })
    );

  it("should initialize with isGeneratingDraft false", () => {
    const { result } = renderUseAIDraftReply();
    expect(result.current.isGeneratingDraft).toBe(false);
  });

  it("should return handleGenerateDraftReply function", () => {
    const { result } = renderUseAIDraftReply();
    expect(result.current.handleGenerateDraftReply).toBeTypeOf("function");
  });

  describe("handleGenerateDraftReply", () => {
    it("should call initiateDraftReply with feedbackId", async () => {
      const { result } = renderUseAIDraftReply();

      await act(async () => {
        await result.current.handleGenerateDraftReply();
      });

      expect(mockInitiateDraftReply).toHaveBeenCalledWith({ feedbackId });
    });

    it("should set isGeneratingDraft to true during generation", async () => {
      let resolvePromise: () => void;
      mockInitiateDraftReply.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderUseAIDraftReply();

      let genPromise: Promise<void>;
      act(() => {
        genPromise = result.current.handleGenerateDraftReply();
      });

      expect(result.current.isGeneratingDraft).toBe(true);

      await act(async () => {
        resolvePromise?.();
        await genPromise;
      });
    });

    it("should reset isGeneratingDraft on error", async () => {
      mockInitiateDraftReply.mockRejectedValue(new Error("fail"));

      const { result } = renderUseAIDraftReply();

      await act(async () => {
        await result.current.handleGenerateDraftReply();
      });

      expect(result.current.isGeneratingDraft).toBe(false);
    });

    it("should not call initiateDraftReply when feedbackId is null", async () => {
      const { result } = renderUseAIDraftReply({ feedbackId: null });

      await act(async () => {
        await result.current.handleGenerateDraftReply();
      });

      expect(mockInitiateDraftReply).not.toHaveBeenCalled();
    });
  });

  describe("draft reply population", () => {
    it("inserts only the draft generated after the click, not the stale one", () => {
      mockUseQuery.mockReturnValue({
        aiDraftReply: "Stale draft",
        aiDraftReplyGeneratedAt: 1,
      });
      const { result, rerender } = renderUseAIDraftReply();

      act(() => {
        result.current.handleGenerateDraftReply();
      });
      expect(setNewComment).not.toHaveBeenCalled();
      expect(result.current.isGeneratingDraft).toBe(true);

      mockUseQuery.mockReturnValue({
        aiDraftReply: "Fresh draft",
        aiDraftReplyGeneratedAt: 2,
      });
      rerender();

      expect(setNewComment).toHaveBeenCalledWith("Fresh draft");
      expect(setNewComment).toHaveBeenCalledTimes(1);
      expect(result.current.isGeneratingDraft).toBe(false);
    });

    it("should skip query when feedbackId is null", () => {
      renderUseAIDraftReply({ feedbackId: null });
      // Verify useQuery was called with "skip"
      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip");
    });

    it("should skip query when not admin", () => {
      renderUseAIDraftReply({ effectiveIsAdmin: false });
      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip");
    });

    it("should pass feedbackId to query when admin with feedbackId", () => {
      renderUseAIDraftReply({ effectiveIsAdmin: true });
      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), {
        feedbackId,
      });
    });
  });
});
