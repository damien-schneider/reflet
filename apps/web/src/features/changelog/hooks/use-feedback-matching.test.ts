import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";

const { mockMatchReleaseFeedback } = vi.hoisted(() => ({
  mockMatchReleaseFeedback: vi.fn(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    changelog: {
      ai_actions: { matchReleaseFeedback: "matchReleaseFeedback" },
    },
  },
}));

vi.mock("convex/react", () => ({
  useAction: () => mockMatchReleaseFeedback,
}));

import { useFeedbackMatching } from "./use-feedback-matching";

const releaseId = toId("releases", "rel_1");
const match = {
  confidence: "high" as const,
  feedbackId: "feedback_1",
  reason: "Ships the requested search",
};

describe("useFeedbackMatching", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("matches the release description through the Convex action", async () => {
    mockMatchReleaseFeedback.mockResolvedValue({ matches: [match] });
    const { result } = renderHook(() => useFeedbackMatching(releaseId));

    await act(() => result.current.matchFeedback("Search is faster"));

    expect(mockMatchReleaseFeedback).toHaveBeenCalledWith({
      description: "Search is faster",
      releaseId,
    });
    expect(result.current.matches).toEqual([match]);
    expect(result.current.isMatching).toBe(false);
  });

  it("does nothing before the release exists", async () => {
    const { result } = renderHook(() => useFeedbackMatching(null));

    await act(() => result.current.matchFeedback("Search is faster"));

    expect(mockMatchReleaseFeedback).not.toHaveBeenCalled();
  });

  it("surfaces action failures as a match error", async () => {
    mockMatchReleaseFeedback.mockRejectedValue(new Error("AI unavailable"));
    const { result } = renderHook(() => useFeedbackMatching(releaseId));

    await act(() => result.current.matchFeedback("Search is faster"));

    expect(result.current.matchError).toBe("AI unavailable");
    expect(result.current.matches).toEqual([]);
  });

  it("clears matches and errors", async () => {
    mockMatchReleaseFeedback.mockResolvedValue({ matches: [match] });
    const { result } = renderHook(() => useFeedbackMatching(releaseId));
    await act(() => result.current.matchFeedback("Search is faster"));

    act(() => result.current.clearMatches());

    expect(result.current.matches).toEqual([]);
    expect(result.current.matchError).toBeNull();
  });
});
