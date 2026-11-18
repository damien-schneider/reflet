/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateComment = vi.fn();
const mockDeleteComment = vi.fn();
const mockAddReply = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "comments.update") {
      return mockUpdateComment;
    }
    if (ref === "comments.remove") {
      return mockDeleteComment;
    }
    if (ref === "comments.create") {
      return mockAddReply;
    }
    return vi.fn();
  },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      comments: {
        create: "comments.create",
        remove: "comments.remove",
        update: "comments.update",
      },
    },
  },
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    onChange,
    onSubmit,
    placeholder,
  }: {
    value: string;
    onChange?: (v: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="markdown-editor"
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          onSubmit?.();
        }
      }}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("./comment-context", () => ({
  useFeedbackId: () => "f1" as Id<"feedback">,
}));

import { CommentItem } from "./comment-item";
import type { CommentData } from "./types";

const makeComment = (overrides: Partial<CommentData> = {}): CommentData => ({
  author: { email: "alice@test.com", image: "/alice.png", name: "Alice" },
  content: "Test comment content",
  createdAt: Date.now() - 3_600_000,
  id: "c1" as Id<"comments">,
  replies: [],
  ...overrides,
});

describe("CommentItem", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders author name", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders Anonymous when no author", () => {
    render(<CommentItem comment={makeComment({ author: undefined })} />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("renders nested replies", () => {
    const comment = makeComment({
      replies: [
        makeComment({
          author: { email: "bob@test.com", name: "Bob" },
          content: "Nested reply",
          id: "c2" as Id<"comments">,
        }),
      ],
    });
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("Nested reply")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("cancels edit and restores original content", async () => {
    render(<CommentItem comment={makeComment({ content: "Original" })} />);
    const dotsButton = screen.getByRole("button", { name: "Comment actions" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Edit"));
    // Click Cancel
    fireEvent.click(screen.getByText("Cancel"));
    // Original content should be visible again
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("calls updateComment on save", async () => {
    mockUpdateComment.mockResolvedValue(undefined);
    render(<CommentItem comment={makeComment({ content: "Old content" })} />);
    const dotsButton = screen.getByRole("button", { name: "Comment actions" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Edit"));
    // Type new content
    const editor = screen.getByTestId("markdown-editor");
    fireEvent.change(editor, { target: { value: "New content" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockUpdateComment).toHaveBeenCalledWith({
        body: "New content",
        id: "c1",
      });
    });
  });

  it("does not save when edit content is empty", async () => {
    render(<CommentItem comment={makeComment()} />);
    const dotsButton = screen.getByRole("button", { name: "Comment actions" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Edit"));
    const editor = screen.getByTestId("markdown-editor");
    fireEvent.change(editor, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it("deletes the comment only after confirmation", async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    render(<CommentItem comment={makeComment()} />);
    const dotsButton = screen.getByRole("button", { name: "Comment actions" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDeleteComment).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText("Delete comment"));
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith({ id: "c1" });
    });
  });

  it("cancels reply input", () => {
    render(<CommentItem comment={makeComment()} />);
    fireEvent.click(screen.getByText("Reply"));
    expect(screen.getByPlaceholderText("Write a reply…")).toBeInTheDocument();
    // Click the Cancel button in reply section
    fireEvent.click(screen.getAllByText("Cancel")[0]);
    expect(
      screen.queryByPlaceholderText("Write a reply…")
    ).not.toBeInTheDocument();
  });

  it("submits reply with addReply mutation", async () => {
    mockAddReply.mockResolvedValue(undefined);
    render(<CommentItem comment={makeComment()} />);
    // Open reply
    fireEvent.click(screen.getByText("Reply"));
    // Type into mock editor
    const replyEditor = screen.getByPlaceholderText("Write a reply…");
    fireEvent.change(replyEditor, { target: { value: "My reply" } });
    // Trigger onSubmit via Enter key on the mock editor
    fireEvent.keyDown(replyEditor, { key: "Enter" });
    await waitFor(() => {
      expect(mockAddReply).toHaveBeenCalledWith({
        body: "My reply",
        feedbackId: "f1",
        parentId: "c1",
      });
    });
  });

  it("enables sending a reply only once it has content", () => {
    render(<CommentItem comment={makeComment()} />);
    fireEvent.click(screen.getByText("Reply"));
    const sendReply = screen.getAllByRole("button", { name: "Reply" }).at(-1);
    expect(sendReply).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), {
      target: { value: "Thanks!" },
    });
    expect(sendReply).toBeEnabled();
  });

  it("shows ? fallback when author has no name", () => {
    render(
      <CommentItem
        comment={makeComment({ author: { email: "test@test.com" } })}
      />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
