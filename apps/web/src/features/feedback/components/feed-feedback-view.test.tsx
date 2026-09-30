import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  FeedFeedbackView,
  type FeedFeedbackViewProps,
} from "@/features/feedback/components/feed-feedback-view";

const { openFeedback, vote } = vi.hoisted(() => ({
  openFeedback: vi.fn(),
  vote: vi.fn(),
}));

vi.mock("./feedback-board/feedback-board-context", () => ({
  useFeedbackBoard: () => ({ onFeedbackClick: openFeedback, onVote: vote }),
}));
vi.mock("./feedback-card-admin-wrapper", () => ({
  FeedbackCardAdminWrapper: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./filters-bar", () => ({ FiltersBar: () => null }));
vi.mock("./inline-feedback-input", () => ({ InlineFeedbackInput: () => null }));

const feedbackId = z
  .custom<Id<"feedback">>((value) => typeof value === "string")
  .parse("feedback1");
const organizationId = z
  .custom<Id<"organizations">>((value) => typeof value === "string")
  .parse("org1");
const props = {
  feedback: [
    {
      _id: feedbackId,
      commentCount: 2,
      createdAt: Date.now(),
      organizationId,
      title: "Allow keyboard shortcuts",
      voteCount: 5,
    },
  ],
  hasActiveFilters: false,
  hideCompleted: false,
  isAdmin: false,
  isMember: false,
  onClearFilters: vi.fn(),
  onHideCompletedToggle: vi.fn(),
  onInlineSubmit: vi.fn().mockResolvedValue(undefined),
  onSortChange: vi.fn(),
  onStatusChange: vi.fn(),
  onTagChange: vi.fn(),
  selectedStatusIds: [],
  selectedTagIds: [],
  sortBy: "votes",
  statuses: [],
  tags: [],
} satisfies FeedFeedbackViewProps;

describe("FeedFeedbackView", () => {
  it("uses Sweep Corner voting and opens feedback from the keyboard", async () => {
    const user = userEvent.setup();
    render(<FeedFeedbackView {...props} />);
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Allow keyboard shortcuts" })
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(openFeedback).toHaveBeenCalledWith(feedbackId);
    await user.click(screen.getByRole("button", { name: "Upvote" }));
    expect(vote).toHaveBeenCalledWith(feedbackId, "upvote");
    expect(openFeedback).toHaveBeenCalledTimes(1);
  });

  it("offers to clear filters when filtering leaves nothing", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <FeedFeedbackView
        {...props}
        feedback={[]}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("tells the user completed feedback is hidden instead of claiming the board is empty", () => {
    render(<FeedFeedbackView {...props} feedback={[]} hideCompleted />);
    expect(screen.getByText("No open feedback")).toBeInTheDocument();
    expect(screen.queryByText("No feedback yet")).not.toBeInTheDocument();
  });
});
