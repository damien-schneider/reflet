import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackItem } from "../feed-feedback-view";

let mockIsDragging = false;

vi.mock("@dnd-kit/core", () => ({
  useDraggable: ({ disabled }: { id: string; disabled: boolean }) => ({
    attributes: { "aria-roledescription": "draggable" },
    isDragging: mockIsDragging,
    listeners: disabled ? undefined : { onPointerDown: vi.fn() },
    setActivatorNodeRef: vi.fn(),
    setNodeRef: vi.fn(),
  }),
}));

vi.mock("motion/react", () => ({
  m: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  useReducedMotion: () => false,
}));

import { DraggableFeedbackCard } from "./draggable-feedback-card";

const item: FeedbackItem = {
  _id: "feedback-1" as Id<"feedback">,
  commentCount: 0,
  createdAt: Date.now(),
  description: "Test description",
  organizationId: "org-1" as Id<"organizations">,
  tags: [],
  title: "Test Feedback",
  voteCount: 5,
};

afterEach(() => {
  vi.clearAllMocks();
  mockIsDragging = false;
});

describe("DraggableFeedbackCard", () => {
  it("opens the feedback when its title is activated", async () => {
    const onFeedbackClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={item}
        onFeedbackClick={onFeedbackClick}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Test Feedback" })
    );

    expect(onFeedbackClick).toHaveBeenCalledWith("feedback-1");
  });

  it("opens from the keyboard via the title button", async () => {
    const onFeedbackClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={item}
        onFeedbackClick={onFeedbackClick}
      />
    );

    screen.getByRole("button", { name: "Test Feedback" }).focus();
    await userEvent.keyboard("{Enter}");

    expect(onFeedbackClick).toHaveBeenCalledWith("feedback-1");
  });

  it("does not open while the card is being dragged", async () => {
    mockIsDragging = true;
    const onFeedbackClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={item}
        onFeedbackClick={onFeedbackClick}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Test Feedback" })
    );

    expect(onFeedbackClick).not.toHaveBeenCalled();
  });

  it("gives admins a separate move handle that does not open the card", async () => {
    const onFeedbackClick = vi.fn();
    render(
      <DraggableFeedbackCard
        isAdmin={true}
        item={item}
        onFeedbackClick={onFeedbackClick}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Move Test Feedback" })
    );

    expect(onFeedbackClick).not.toHaveBeenCalled();
  });

  it("hides the move handle from non-admins", () => {
    render(
      <DraggableFeedbackCard
        isAdmin={false}
        item={item}
        onFeedbackClick={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Move Test Feedback" })
    ).not.toBeInTheDocument();
  });
});
