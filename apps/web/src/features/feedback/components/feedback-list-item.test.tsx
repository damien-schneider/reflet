import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackListItem } from "./feedback-list-item";

// Mock icons
vi.mock("@phosphor-icons/react", () => ({
  Chat: () => <svg />,
  PushPin: () => <svg />,
  Trash: () => <svg />,
}));

// Mock convex
const mockRemove = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockRemove,
}));

// Mock VoteButton
vi.mock("@/features/feedback/components/vote-button", () => ({
  VoteButton: () => <button type="button" data-testid="vote-button">Vote</button>,
}));

// Mock UI components
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} data-testid="confirm-delete">{children}</button>
  ),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextListTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextListContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextListItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} data-testid="delete-item">{children}</button>
  ),
}));

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("FeedbackListItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockFeedback = {
    _id: "feedback1" as Id<"feedback">,
    _creationTime: Date.now(),
    title: "Test Feedback",
    description: "Description",
    createdAt: Date.now(),
    authorId: "user1" as Id<"users">,
    organizationId: "org1" as Id<"organizations">,
    voteCount: 5,
    commentCount: 2,
    isPinned: false,
    status: "open",
    tags: [],
    author: { name: "John Doe", email: "john@example.com", image: null },
  } as unknown as Doc<"feedback"> & { hasVoted?: boolean };

  it("should render feedback title", () => {
    render(<FeedbackListItem feedback={mockFeedback} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("should open alert dialog when delete is clicked", () => {
    render(<FeedbackListItem feedback={mockFeedback} isAuthor={true} />);

    // Click delete item in context menu
    fireEvent.click(screen.getByTestId("delete-item"));

    // Alert dialog should appear
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });

  it("should call delete mutation when confirmed", () => {
    render(<FeedbackListItem feedback={mockFeedback} isAuthor={true} />);

    fireEvent.click(screen.getByTestId("delete-item"));
    fireEvent.click(screen.getByTestId("confirm-delete"));

    expect(mockRemove).toHaveBeenCalledWith({ id: mockFeedback._id });
  });

  it("should have correct accessibility attributes on the container", () => {
    render(<FeedbackListItem feedback={mockFeedback} />);

    // Find the container div which has role="button" and contains the title
    const buttons = screen.getAllByRole("button");
    const container = buttons.find(b => b.textContent?.includes("Test Feedback"));

    expect(container).toBeDefined();
    expect(container).toHaveAttribute("tabIndex", "0");
  });

  it("should not trigger container click when pressing Enter on nested button", () => {
    const handleClick = vi.fn();
    render(<FeedbackListItem feedback={mockFeedback} onClick={handleClick} />);

    // Find vote button
    const voteButton = screen.getByTestId("vote-button");
    voteButton.focus();

    // Press Enter
    fireEvent.keyDown(voteButton, { key: "Enter", code: "Enter" });

    expect(handleClick).not.toHaveBeenCalled();
  });
});
