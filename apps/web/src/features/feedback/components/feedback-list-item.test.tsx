import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackListItem } from "./feedback-list-item";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

// Mock dependencies
vi.mock("@phosphor-icons/react", () => ({
  Chat: () => <div data-testid="chat-icon" />,
  PushPin: () => <div data-testid="push-pin-icon" />,
  Trash: () => <div data-testid="trash-icon" />,
}));

const mockRemoveFeedback = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockRemoveFeedback,
}));

vi.mock("@/features/feedback/components/vote-button", () => ({
  VoteButton: () => <button data-testid="vote-button" type="button">Vote</button>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

// Mock Context Menu to simplify interaction
vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: any) => <div>{children}</div>,
  ContextListTrigger: ({ children }: any) => <div data-testid="context-trigger">{children}</div>,
  ContextListContent: ({ children }: any) => <div data-testid="context-content">{children}</div>,
  ContextListItem: ({ children, onClick }: any) => (
    <button data-testid="context-item-delete" onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

// Mock AlertDialog
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h1>{children}</h1>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="confirm-delete" onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

describe("FeedbackListItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockFeedback = {
    _id: "feedback123" as Id<"feedback">,
    _creationTime: Date.now(),
    title: "Test Feedback",
    description: "Description",
    projectId: "project1" as Id<"projects">,
    organizationId: "org1" as Id<"organizations">,
    authorId: "user1",
    status: "open",
    voteCount: 5,
    commentCount: 2,
    isPinned: false,
    createdAt: Date.now(),
    viewCount: 10,
    slug: "test-feedback",
    author: {
      name: "John Doe",
      email: "john@example.com",
      image: null,
    },
  };

  it("should open alert dialog when delete is clicked", () => {
    render(<FeedbackListItem feedback={mockFeedback} isAuthor={true} />);

    const deleteButton = screen.getByTestId("context-item-delete");
    fireEvent.click(deleteButton);

    // Expect Alert Dialog to appear
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    expect(screen.getByText("Are you absolutely sure?")).toBeInTheDocument();
  });

  it("should call delete mutation when confirmed", () => {
    render(<FeedbackListItem feedback={mockFeedback} isAuthor={true} />);

    // Open dialog
    fireEvent.click(screen.getByTestId("context-item-delete"));

    // Click confirm
    fireEvent.click(screen.getByTestId("confirm-delete"));

    expect(mockRemoveFeedback).toHaveBeenCalledWith({ id: mockFeedback._id });
  });
});
