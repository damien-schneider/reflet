/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FeedbackBoardProvider,
  useFeedbackBoard,
} from "./feedback-board-context";

const mockContextValue = {
  isAdmin: true,
  primaryColor: "#ff0000",
  statuses: [
    {
      _id: "status1" as Id<"organizationStatuses">,
      name: "Open",
      color: "#3b82f6",
    },
  ],
  onVote: vi.fn(),
  onFeedbackClick: vi.fn(),
};

describe("feedback-board-context", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("useFeedbackBoard", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useFeedbackBoard());
      }).toThrow(
        "useFeedbackBoard must be used within a FeedbackBoardProvider"
      );
    });

    it("returns context value when inside provider", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <FeedbackBoardProvider {...mockContextValue}>
          {children}
        </FeedbackBoardProvider>
      );

      const { result } = renderHook(() => useFeedbackBoard(), { wrapper });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.primaryColor).toBe("#ff0000");
      expect(result.current.statuses).toHaveLength(1);
    });
  });

  describe("FeedbackBoardProvider", () => {
    it("renders children", () => {
      render(
        <FeedbackBoardProvider {...mockContextValue}>
          <div data-testid="child">Content</div>
        </FeedbackBoardProvider>
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });
});
