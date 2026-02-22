import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFeedbackDrawer } from "./use-feedback-drawer";

// Mock next/navigation
const mockPush = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/test-org/board",
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/lib/convex-helpers", () => ({
  toId: (_table: string, value: string) => value,
}));

describe("useFeedbackDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
  });

  describe("default state", () => {
    it("selectedFeedbackId is null when no URL param", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.selectedFeedbackId).toBeNull();
    });

    it("isOpen is false when no URL param", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.isOpen).toBe(false);
    });

    it("feedbackIds defaults to empty array", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.feedbackIds).toEqual([]);
    });

    it("currentIndex is -1 when nothing selected", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.currentIndex).toBe(-1);
    });

    it("hasPrevious is false when nothing selected", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.hasPrevious).toBe(false);
    });

    it("hasNext is false when nothing selected", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.hasNext).toBe(false);
    });
  });

  describe("URL parsing", () => {
    it("parses feedback id from URL param", () => {
      currentSearchParams = new URLSearchParams("f=feedback-123");
      const { result } = renderHook(() => useFeedbackDrawer());
      expect(result.current.selectedFeedbackId).toBe("feedback-123");
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe("actions", () => {
    it("openFeedback pushes URL with feedback id", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      act(() => result.current.openFeedback("fb-1"));
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?f=fb-1", {
        scroll: false,
      });
    });

    it("closeFeedback removes feedback param", () => {
      currentSearchParams = new URLSearchParams("f=fb-1");
      const { result } = renderHook(() => useFeedbackDrawer());
      act(() => result.current.closeFeedback());
      expect(mockPush).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("navigateToFeedback updates URL", () => {
      const { result } = renderHook(() => useFeedbackDrawer());
      act(() =>
        result.current.navigateToFeedback(
          "fb-2" as Parameters<typeof result.current.navigateToFeedback>[0]
        )
      );
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?f=fb-2", {
        scroll: false,
      });
    });
  });

  describe("navigation", () => {
    const feedbackIds = ["fb-1", "fb-2", "fb-3"] as Parameters<
      typeof useFeedbackDrawer
    >[0] &
      string[];

    it("computes currentIndex from feedbackIds", () => {
      currentSearchParams = new URLSearchParams("f=fb-2");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.currentIndex).toBe(1);
    });

    it("hasPrevious is true when not at first item", () => {
      currentSearchParams = new URLSearchParams("f=fb-2");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.hasPrevious).toBe(true);
    });

    it("hasPrevious is false at first item", () => {
      currentSearchParams = new URLSearchParams("f=fb-1");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.hasPrevious).toBe(false);
    });

    it("hasNext is true when not at last item", () => {
      currentSearchParams = new URLSearchParams("f=fb-2");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.hasNext).toBe(true);
    });

    it("hasNext is false at last item", () => {
      currentSearchParams = new URLSearchParams("f=fb-3");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.hasNext).toBe(false);
    });

    it("goToPrevious navigates to previous item", () => {
      currentSearchParams = new URLSearchParams("f=fb-2");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      act(() => result.current.goToPrevious());
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?f=fb-1", {
        scroll: false,
      });
    });

    it("goToNext navigates to next item", () => {
      currentSearchParams = new URLSearchParams("f=fb-2");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      act(() => result.current.goToNext());
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?f=fb-3", {
        scroll: false,
      });
    });

    it("goToPrevious does nothing at first item", () => {
      currentSearchParams = new URLSearchParams("f=fb-1");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      act(() => result.current.goToPrevious());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("goToNext does nothing at last item", () => {
      currentSearchParams = new URLSearchParams("f=fb-3");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      act(() => result.current.goToNext());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("currentIndex is -1 when selected id is not in feedbackIds", () => {
      currentSearchParams = new URLSearchParams("f=fb-unknown");
      const { result } = renderHook(() => useFeedbackDrawer(feedbackIds));
      expect(result.current.currentIndex).toBe(-1);
    });
  });
});
