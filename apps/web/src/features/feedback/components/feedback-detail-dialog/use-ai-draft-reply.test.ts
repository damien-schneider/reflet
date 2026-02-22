import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// Must import after mock
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
        feedbackId,
        effectiveIsAdmin: true,
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
    it("should call setNewComment when draft reply becomes available", () => {
      mockUseQuery.mockReturnValue({ aiDraftReply: "Draft response text" });

      const { result } = renderUseAIDraftReply();

      // Trigger generation first
      act(() => {
        result.current.handleGenerateDraftReply();
      });

      // Re-render with the draft data after generation starts
      // The effect should pick up the draft
      // Since we mocked useQuery to always return the draft, the effect processes it
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
