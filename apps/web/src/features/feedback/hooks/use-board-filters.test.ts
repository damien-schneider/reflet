import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardFilters } from "./use-board-filters";

const mockReplace = vi.fn();
const mockPush = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-org/board",
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => currentSearchParams,
}));

describe("useBoardFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
  });

  describe("default state", () => {
    it("returns default view as feed", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.view).toBe("feed");
    });

    it("returns default sortBy as newest", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.sortBy).toBe("newest");
    });

    it("returns empty selectedStatusIds", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.selectedStatusIds).toEqual([]);
    });

    it("returns empty selectedTagIds", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.selectedTagIds).toEqual([]);
    });

    it("returns empty searchQuery", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.searchQuery).toBe("");
    });

    it("returns showSubmitDrawer as false", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.showSubmitDrawer).toBe(false);
    });

    it("hides completed by default", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hideCompleted).toBe(true);
    });

    it("hasActiveFilters is false by default", () => {
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("URL parsing", () => {
    it("parses view from URL", () => {
      currentSearchParams = new URLSearchParams("view=roadmap");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.view).toBe("roadmap");
    });

    it("parses milestones view from URL", () => {
      currentSearchParams = new URLSearchParams("view=milestones");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.view).toBe("milestones");
    });

    it("falls back to default for invalid view", () => {
      currentSearchParams = new URLSearchParams("view=invalid");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.view).toBe("feed");
    });

    it("parses sort from URL", () => {
      currentSearchParams = new URLSearchParams("sort=votes");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.sortBy).toBe("votes");
    });

    it("falls back to default for invalid sort", () => {
      currentSearchParams = new URLSearchParams("sort=invalid");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.sortBy).toBe("newest");
    });

    it("parses status ids from URL", () => {
      currentSearchParams = new URLSearchParams("status=s1,s2,s3");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.selectedStatusIds).toEqual(["s1", "s2", "s3"]);
    });

    it("parses tag ids from URL", () => {
      currentSearchParams = new URLSearchParams("tags=t1,t2");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.selectedTagIds).toEqual(["t1", "t2"]);
    });

    it("parses single tag from URL", () => {
      currentSearchParams = new URLSearchParams("tag=t1");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.selectedTagIds).toEqual(["t1"]);
    });

    it("parses search query from URL", () => {
      currentSearchParams = new URLSearchParams("q=hello");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.searchQuery).toBe("hello");
    });

    it("parses submit drawer state from URL", () => {
      currentSearchParams = new URLSearchParams("new=1");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.showSubmitDrawer).toBe(true);
    });

    it("parses hideCompleted=0 as show completed", () => {
      currentSearchParams = new URLSearchParams("hide_completed=0");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hideCompleted).toBe(false);
    });
  });

  describe("actions", () => {
    it("setView pushes to history", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setView("roadmap"));
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?view=roadmap", {
        scroll: false,
      });
    });

    it("setView removes param when setting default view", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setView("feed"));
      expect(mockPush).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("setSortBy uses replace for a non-default sort", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSortBy("votes"));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?sort=votes", {
        scroll: false,
      });
    });

    it("setSortBy removes param when setting default sort", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSortBy("newest"));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("setSearchQuery updates URL", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSearchQuery("bug report"));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?q=bug+report", {
        scroll: false,
      });
    });

    it("setSearchQuery removes param when empty", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSearchQuery(""));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("openSubmitDrawer pushes new=1", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.openSubmitDrawer());
      expect(mockPush).toHaveBeenCalledWith("/test-org/board?new=1", {
        scroll: false,
      });
    });

    it("closeSubmitDrawer removes new param", () => {
      currentSearchParams = new URLSearchParams("new=1");
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.closeSubmitDrawer());
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("setSelectedStatusIds updates URL", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSelectedStatusIds(["s1", "s2"]));
      expect(mockReplace).toHaveBeenCalledWith(
        "/test-org/board?status=s1%2Cs2",
        { scroll: false }
      );
    });

    it("setSelectedTagIds updates URL", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSelectedTagIds(["t1", "t2"]));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?tags=t1%2Ct2", {
        scroll: false,
      });
    });

    it("setSelectedTagId updates URL", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSelectedTagIds(["t1"]));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?tags=t1", {
        scroll: false,
      });
    });

    it("setSelectedTagId removes param when null", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setSelectedTagIds([]));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });

    it("setHideCompleted sets hide_completed=0 to show", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setHideCompleted(false));
      expect(mockReplace).toHaveBeenCalledWith(
        "/test-org/board?hide_completed=0",
        { scroll: false }
      );
    });

    it("setHideCompleted removes param to hide (default)", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.setHideCompleted(true));
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board", {
        scroll: false,
      });
    });
  });

  describe("handleStatusChange", () => {
    it("adds status when checked", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.handleStatusChange("s1", true));
      expect(mockReplace).toHaveBeenCalled();
    });

    it("removes status when unchecked", () => {
      currentSearchParams = new URLSearchParams("status=s1,s2");
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.handleStatusChange("s1", false));
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe("handleTagChange", () => {
    it("adds tag when checked", () => {
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.handleTagChange("t1", true));
      expect(mockReplace).toHaveBeenCalled();
    });

    it("removes tag when unchecked", () => {
      currentSearchParams = new URLSearchParams("tags=t1,t2");
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.handleTagChange("t1", false));
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe("clearFilters", () => {
    it("removes filter params but keeps a non-default sort", () => {
      currentSearchParams = new URLSearchParams(
        "sort=votes&q=test&status=s1&tags=t1&hide_completed=0"
      );
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.clearFilters());
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?sort=votes", {
        scroll: false,
      });
    });

    it("preserves non-default view param", () => {
      currentSearchParams = new URLSearchParams("view=roadmap&q=test");
      const { result } = renderHook(() => useBoardFilters());
      act(() => result.current.clearFilters());
      expect(mockReplace).toHaveBeenCalledWith("/test-org/board?view=roadmap", {
        scroll: false,
      });
    });
  });

  describe("hasActiveFilters", () => {
    it("is true when search query exists", () => {
      currentSearchParams = new URLSearchParams("q=hello");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("is true when status filter exists", () => {
      currentSearchParams = new URLSearchParams("status=s1");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("is true when tag filter exists", () => {
      currentSearchParams = new URLSearchParams("tags=t1");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("is true when single tag filter exists", () => {
      currentSearchParams = new URLSearchParams("tag=t1");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("is false when only a non-default sort is set", () => {
      currentSearchParams = new URLSearchParams("sort=votes");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it("is false when only view is set", () => {
      currentSearchParams = new URLSearchParams("view=roadmap");
      const { result } = renderHook(() => useBoardFilters());
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("custom default view", () => {
    it("uses custom default view", () => {
      const { result } = renderHook(() => useBoardFilters("roadmap"));
      expect(result.current.view).toBe("roadmap");
    });
  });
});

describe("one tag selection across controls and layouts", () => {
  it("normalizes both URL tag inputs into the same selection without precedence", () => {
    currentSearchParams = new URLSearchParams("tag=t1&tags=t2&view=roadmap");
    const { result } = renderHook(() => useBoardFilters());
    expect(result.current.selectedTagIds).toEqual(["t2", "t1"]);
    act(() => result.current.setSelectedTagIds(["t3"]));
    const url = mockReplace.mock.calls.at(-1)?.[0];
    expect(url).toContain("tags=t3");
    expect(url).not.toContain("tag=");
    expect(url).toContain("view=roadmap");
  });
});
