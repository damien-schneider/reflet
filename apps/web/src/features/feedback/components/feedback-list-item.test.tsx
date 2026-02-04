import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackListItem } from "./feedback-list-item";

// Mock icons
vi.mock("@phosphor-icons/react", () => ({
  Chat: ({ "aria-hidden": ariaHidden }: any) => (
    <svg aria-hidden={ariaHidden} data-testid="chat-icon" />
  ),
  PushPin: ({ "aria-hidden": ariaHidden }: any) => (
    <svg aria-hidden={ariaHidden} data-testid="push-pin-icon" />
  ),
  Trash: () => <svg data-testid="trash-icon" />,
  CaretUp: () => <svg data-testid="caret-up-icon" />,
}));

// Mock convex
const mockRemoveFeedback = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockRemoveFeedback,
}));

// Mock VoteButton
vi.mock("./vote-button", () => ({
  VoteButton: () => <button type="button">Vote</button>,
}));

// Mock ContextList components
vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: any) => <div>{children}</div>,
  ContextListTrigger: ({ children }: any) => <div>{children}</div>,
  ContextListContent: ({ children }: any) => <div>{children}</div>,
  ContextListItem: ({ children, onClick }: any) => (
    <button data-testid="delete-option" onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

// Mock AlertDialog components
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? (
      <div data-testid="alert-dialog" role="alertdialog">
        {children}
      </div>
    ) : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h1>{children}</h1>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button data-testid="cancel-delete" onClick={onClick} type="button">
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="confirm-delete" onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("FeedbackListItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    feedback: {
      _id: "feedback123" as Id<"feedback">,
      _creationTime: Date.now(),
      title: "Test Feedback",
      description: "Description",
      boardId: "board123" as Id<"boards">,
      authorId: "user123",
      voteCount: 5,
      commentCount: 3,
      isPinned: false,
      hasVoted: false,
      tags: [],
      createdAt: Date.now(),
    } as any,
    organizationId: "org123" as Id<"organizations">,
    isAuthor: true,
  };

  it("should render feedback title", () => {
    render(<FeedbackListItem {...defaultProps} />);
    expect(screen.getByText("Test Feedback")).toBeTruthy();
  });

  it("should show ARIA label for comments", () => {
    render(<FeedbackListItem {...defaultProps} />);
    // getByText("3") finds the text node, causing parent element to be the span
    const commentsContainer = screen.getByText("3");
    expect(commentsContainer.getAttribute("aria-label")).toBe("3 comments");
    expect(screen.getByTestId("chat-icon").getAttribute("aria-hidden")).toBe(
      "true"
    );
  });

  it("should show screen reader text for pinned items", () => {
    const pinnedProps = {
      ...defaultProps,
      feedback: { ...defaultProps.feedback, isPinned: true },
    };
    render(<FeedbackListItem {...pinnedProps} />);
    expect(screen.getByText("Pinned:")).toBeTruthy();
    expect(
      screen.getByTestId("push-pin-icon").getAttribute("aria-hidden")
    ).toBe("true");
  });

  it("should open alert dialog when delete is clicked", () => {
    render(<FeedbackListItem {...defaultProps} />);

    // Click delete option
    fireEvent.click(screen.getByTestId("delete-option"));

    // Check if alert dialog is open
    expect(screen.getByTestId("alert-dialog")).toBeTruthy();
    expect(
      screen.getByText('Are you sure you want to delete "Test Feedback"?')
    ).toBeTruthy();
  });

  it("should call delete mutation when confirmed", async () => {
    render(<FeedbackListItem {...defaultProps} />);

    fireEvent.click(screen.getByTestId("delete-option"));
    fireEvent.click(screen.getByTestId("confirm-delete"));

    await waitFor(() => {
      expect(mockRemoveFeedback).toHaveBeenCalledWith({ id: "feedback123" });
    });
  });

  it("should not show delete option if not author or admin", () => {
    render(
      <FeedbackListItem {...defaultProps} isAdmin={false} isAuthor={false} />
    );
    expect(screen.queryByTestId("delete-option")).toBeNull();
  });
});
