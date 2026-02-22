/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockAddComment = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockAddComment,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    comments: {
      list: "comments.list",
      create: "comments.create",
      update: "comments.update",
      remove: "comments.remove",
    },
  },
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    placeholder,
  }: {
    value: string;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="comment-editor"
      placeholder={placeholder}
      readOnly
      value={value}
    />
  ),
}));

vi.mock("./comment-context", () => ({
  CommentProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFeedbackId: () => "f1" as Id<"feedback">,
}));

vi.mock("./comment-item", () => ({
  CommentItem: ({ comment }: { comment: { content: string } }) => (
    <div data-testid="comment-item">{comment.content}</div>
  ),
}));

import { CommentsSection } from "./comments-section";

const feedbackId = "f1" as Id<"feedback">;

describe("CommentsSection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Discussion heading", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByText("Discussion")).toBeInTheDocument();
  });

  it("shows empty state when no comments", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(
      screen.getByText("No comments yet. Start the conversation!")
    ).toBeInTheDocument();
  });

  it("renders comment count", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "c1",
        body: "Hello",
        createdAt: Date.now(),
        author: { name: "Alice", email: "a@test.com" },
      },
      {
        _id: "c2",
        body: "World",
        createdAt: Date.now(),
        author: { name: "Bob", email: "b@test.com" },
      },
    ]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("renders comments from data", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "c1",
        body: "First comment",
        createdAt: Date.now(),
        author: { name: "Alice", email: "a@test.com" },
      },
    ]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByTestId("comment-item")).toHaveTextContent(
      "First comment"
    );
  });

  it("renders comment input with placeholder", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByPlaceholderText(/Write a comment/)).toBeInTheDocument();
  });

  it("renders Post button", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByText("Post")).toBeInTheDocument();
  });

  it("shows user avatar fallback when no user", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection currentUser={null} feedbackId={feedbackId} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("handles undefined commentsData gracefully", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(
      screen.getByText("No comments yet. Start the conversation!")
    ).toBeInTheDocument();
  });

  it("builds nested comment tree correctly", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "c1",
        body: "Parent",
        createdAt: Date.now(),
        author: { name: "Alice", email: "a@test.com" },
      },
      {
        _id: "c2",
        body: "Reply",
        createdAt: Date.now(),
        parentId: "c1",
        author: { name: "Bob", email: "b@test.com" },
      },
    ]);
    render(<CommentsSection feedbackId={feedbackId} />);
    // Only root comment rendered directly, reply is nested
    const items = screen.getAllByTestId("comment-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Parent");
  });
});
