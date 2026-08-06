/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockAddComment = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockAddComment,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      comments: {
        create: "comments.create",
        list: "comments.list",
        remove: "comments.remove",
        update: "comments.update",
      },
      draft_reply: {
        getDraftReplyStatus: "feedback.draft_reply.getDraftReplyStatus",
        initiateDraftReply: "feedback.draft_reply.initiateDraftReply",
      },
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
        author: { email: "a@test.com", name: "Alice" },
        body: "Hello",
        createdAt: Date.now(),
      },
      {
        _id: "c2",
        author: { email: "b@test.com", name: "Bob" },
        body: "World",
        createdAt: Date.now(),
      },
    ]);
    render(<CommentsSection feedbackId={feedbackId} />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("renders comments from data", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "c1",
        author: { email: "a@test.com", name: "Alice" },
        body: "First comment",
        createdAt: Date.now(),
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

  it("renders AI Draft for admins", () => {
    mockUseQuery.mockReturnValue([]);
    render(<CommentsSection feedbackId={feedbackId} isAdmin />);
    expect(screen.getByText("AI Draft")).toBeInTheDocument();
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
        author: { email: "a@test.com", name: "Alice" },
        body: "Parent",
        createdAt: Date.now(),
      },
      {
        _id: "c2",
        author: { email: "b@test.com", name: "Bob" },
        body: "Reply",
        createdAt: Date.now(),
        parentId: "c1",
      },
    ]);
    render(<CommentsSection feedbackId={feedbackId} />);
    const items = screen.getAllByTestId("comment-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Parent");
  });
});
