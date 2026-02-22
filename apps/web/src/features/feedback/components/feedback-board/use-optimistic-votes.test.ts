/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FeedbackItem } from "../feed-feedback-view";
import {
  applyOptimisticVote,
  getVoteValue,
  useOptimisticVotes,
} from "./use-optimistic-votes";

const makeFeedbackItem = (
  overrides: Partial<FeedbackItem> = {}
): FeedbackItem => ({
  _id: "f1" as Id<"feedback">,
  title: "Test",
  voteCount: 5,
  commentCount: 0,
  createdAt: Date.now(),
  organizationId: "org1" as Id<"organizations">,
  hasVoted: false,
  userVoteType: null,
  upvoteCount: 3,
  downvoteCount: 2,
  ...overrides,
});

describe("getVoteValue", () => {
  it("returns 1 for upvote", () => {
    expect(getVoteValue("upvote")).toBe(1);
  });

  it("returns -1 for downvote", () => {
    expect(getVoteValue("downvote")).toBe(-1);
  });

  it("returns 0 for null", () => {
    expect(getVoteValue(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(getVoteValue(undefined)).toBe(0);
  });
});

describe("applyOptimisticVote", () => {
  it("returns item unchanged when no optimistic state", () => {
    const item = makeFeedbackItem();
    expect(applyOptimisticVote(item, undefined)).toBe(item);
  });

  it("applies upvote optimistically from no vote", () => {
    const item = makeFeedbackItem({ userVoteType: null });
    const result = applyOptimisticVote(item, {
      voteType: "upvote",
      pending: true,
    });
    expect(result.userVoteType).toBe("upvote");
    expect(result.hasVoted).toBe(true);
    expect(result.upvoteCount).toBe(4);
    expect(result.voteCount).toBe(6);
  });

  it("applies downvote from upvote", () => {
    const item = makeFeedbackItem({
      userVoteType: "upvote",
      upvoteCount: 4,
      downvoteCount: 1,
      voteCount: 3,
    });
    const result = applyOptimisticVote(item, {
      voteType: "downvote",
      pending: true,
    });
    expect(result.userVoteType).toBe("downvote");
    expect(result.upvoteCount).toBe(3);
    expect(result.downvoteCount).toBe(2);
    expect(result.voteCount).toBe(1);
  });

  it("removes vote when toggling off", () => {
    const item = makeFeedbackItem({
      userVoteType: "upvote",
      upvoteCount: 4,
      voteCount: 6,
    });
    const result = applyOptimisticVote(item, { voteType: null, pending: true });
    expect(result.userVoteType).toBeNull();
    expect(result.hasVoted).toBe(false);
    expect(result.upvoteCount).toBe(3);
    expect(result.voteCount).toBe(5);
  });
});

describe("useOptimisticVotes", () => {
  const mockEvent = {
    stopPropagation: vi.fn(),
  } as unknown as React.MouseEvent;

  it("calls authGuard when not authenticated", async () => {
    const authGuard = vi.fn();
    const toggleVoteMutation = vi.fn();
    const { result } = renderHook(() =>
      useOptimisticVotes({
        feedback: [makeFeedbackItem()],
        toggleVoteMutation,
        isAuthenticated: false,
        authGuard,
      })
    );

    await act(async () => {
      await result.current.handleToggleVote(
        mockEvent,
        "f1" as Id<"feedback">,
        "upvote"
      );
    });

    expect(authGuard).toHaveBeenCalled();
    expect(toggleVoteMutation).not.toHaveBeenCalled();
  });

  it("calls mutation when authenticated", async () => {
    const toggleVoteMutation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOptimisticVotes({
        feedback: [makeFeedbackItem()],
        toggleVoteMutation,
        isAuthenticated: true,
        authGuard: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleToggleVote(
        mockEvent,
        "f1" as Id<"feedback">,
        "upvote"
      );
    });

    expect(toggleVoteMutation).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "upvote",
    });
  });

  it("reverts on mutation error", async () => {
    const toggleVoteMutation = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() =>
      useOptimisticVotes({
        feedback: [makeFeedbackItem()],
        toggleVoteMutation,
        isAuthenticated: true,
        authGuard: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleToggleVote(
        mockEvent,
        "f1" as Id<"feedback">,
        "upvote"
      );
    });

    expect(result.current.optimisticVotes.size).toBe(0);
  });
});
