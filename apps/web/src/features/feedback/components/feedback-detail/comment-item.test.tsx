/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
    comments: {
      update: "comments.update",
      remove: "comments.remove",
      create: "comments.create",
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
  id: "c1" as Id<"comments">,
  content: "Test comment content",
  createdAt: Date.now() - 3_600_000,
  author: { name: "Alice", email: "alice@test.com", image: "/alice.png" },
  replies: [],
  ...overrides,
});

describe("CommentItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders comment content", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("Test comment content")).toBeInTheDocument();
  });

  it("renders author name", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders Anonymous when no author", () => {
    render(<CommentItem comment={makeComment({ author: undefined })} />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("renders relative time", () => {
    render(<CommentItem comment={makeComment()} />);
    // "about 1 hour ago" or similar
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it("renders Reply button", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("Reply")).toBeInTheDocument();
  });

  it("renders nested replies", () => {
    const comment = makeComment({
      replies: [
        makeComment({
          id: "c2" as Id<"comments">,
          content: "Nested reply",
          author: { name: "Bob", email: "bob@test.com" },
        }),
      ],
    });
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("Nested reply")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("does not render replies section when empty", () => {
    render(<CommentItem comment={makeComment()} />);
    // No nested reply content
    expect(screen.queryByText("Nested reply")).not.toBeInTheDocument();
  });

  it("shows edit form when Edit is clicked from dropdown", async () => {
    render(<CommentItem comment={makeComment()} />);
    // Open dropdown menu
    const dotsButton = screen.getByRole("button", { name: "" });
    fireEvent.click(dotsButton);
    // Click Edit
    fireEvent.click(screen.getByText("Edit"));
    // Should show editor and Save/Cancel buttons
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("cancels edit and restores original content", async () => {
    render(<CommentItem comment={makeComment({ content: "Original" })} />);
    const dotsButton = screen.getByRole("button", { name: "" });
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
    const dotsButton = screen.getByRole("button", { name: "" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Edit"));
    // Type new content
    const editor = screen.getByTestId("markdown-editor");
    fireEvent.change(editor, { target: { value: "New content" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockUpdateComment).toHaveBeenCalledWith({
        id: "c1",
        body: "New content",
      });
    });
  });

  it("does not save when edit content is empty", async () => {
    render(<CommentItem comment={makeComment()} />);
    const dotsButton = screen.getByRole("button", { name: "" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Edit"));
    const editor = screen.getByTestId("markdown-editor");
    fireEvent.change(editor, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it("calls deleteComment when Delete is clicked", async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    render(<CommentItem comment={makeComment()} />);
    const dotsButton = screen.getByRole("button", { name: "" });
    fireEvent.click(dotsButton);
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith({ id: "c1" });
    });
  });

  it("shows reply input when Reply is clicked", () => {
    render(<CommentItem comment={makeComment()} />);
    fireEvent.click(screen.getByText("Reply"));
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
  });

  it("cancels reply input", () => {
    render(<CommentItem comment={makeComment()} />);
    fireEvent.click(screen.getByText("Reply"));
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
    // Click the Cancel button in reply section
    fireEvent.click(screen.getAllByText("Cancel")[0]);
    expect(
      screen.queryByPlaceholderText("Write a reply...")
    ).not.toBeInTheDocument();
  });

  it("submits reply with addReply mutation", async () => {
    mockAddReply.mockResolvedValue(undefined);
    render(<CommentItem comment={makeComment()} />);
    // Open reply
    fireEvent.click(screen.getByText("Reply"));
    // Type into mock editor
    const replyEditor = screen.getByPlaceholderText("Write a reply...");
    fireEvent.change(replyEditor, { target: { value: "My reply" } });
    // Trigger onSubmit via Enter key on the mock editor
    fireEvent.keyDown(replyEditor, { key: "Enter" });
    await waitFor(() => {
      expect(mockAddReply).toHaveBeenCalled();
    });
  });

  it("disables reply submit button when content is empty", () => {
    render(<CommentItem comment={makeComment()} />);
    fireEvent.click(screen.getByText("Reply"));
    // After opening reply, the reply submit button should be disabled because content is empty
    const buttons = screen.getAllByRole("button");
    // The reply submit button is the one that is disabled (empty content)
    const disabledBtns = buttons.filter((btn) => btn.hasAttribute("disabled"));
    expect(disabledBtns.length).toBeGreaterThan(0);
  });

  it("renders with isReply styling (smaller avatar)", () => {
    const { container } = render(
      <CommentItem comment={makeComment()} isReply />
    );
    // The avatar should have h-6 w-6 class for replies
    const avatar = container.querySelector(".h-6.w-6");
    expect(avatar).toBeInTheDocument();
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
