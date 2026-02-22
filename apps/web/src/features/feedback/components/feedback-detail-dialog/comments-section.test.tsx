import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommentData } from "./comment-item";
import { CommentsSection } from "./comments-section";

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="spinner-icon" />
  ),
  PaperPlaneRight: () => <svg data-testid="send-icon" />,
  Sparkle: () => <svg data-testid="sparkle-icon" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="markdown-editor"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("./comment-item", () => ({
  CommentItem: ({ comment }: { comment: CommentData }) => (
    <div data-testid="comment-item">{comment.body}</div>
  ),
}));

const makeComment = (id: string, body: string): CommentData => ({
  _id: id as Id<"comments">,
  body,
  createdAt: Date.now(),
  authorName: "User",
});

const defaultProps = {
  comments: [] as CommentData[],
  topLevelComments: [] as CommentData[],
  commentReplies: vi.fn(() => []),
  effectiveIsAdmin: false,
  isGeneratingDraft: false,
  onGenerateDraftReply: vi.fn(),
  newComment: "",
  onNewCommentChange: vi.fn(),
  isSubmittingComment: false,
  onSubmitComment: vi.fn(),
  editCommentContent: "",
  editingCommentId: null as Id<"comments"> | null,
  replyingTo: null as Id<"comments"> | null,
  replyContent: "",
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onEditCancel: vi.fn(),
  onEditContentChange: vi.fn(),
  onReply: vi.fn(),
  onReplyCancel: vi.fn(),
  onReplyContentChange: vi.fn(),
  onSubmitReply: vi.fn(),
  onUpdateComment: vi.fn(),
};

describe("CommentsSection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render comments count heading", () => {
    render(<CommentsSection {...defaultProps} />);
    expect(screen.getByText("Comments (0)")).toBeInTheDocument();
  });

  it("should render comments count with items", () => {
    const comments = [makeComment("c1", "First"), makeComment("c2", "Second")];
    render(<CommentsSection {...defaultProps} comments={comments} />);
    expect(screen.getByText("Comments (2)")).toBeInTheDocument();
  });

  it("should render comment input area", () => {
    render(<CommentsSection {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Write a comment...")
    ).toBeInTheDocument();
  });

  describe("loading state", () => {
    it("should show skeletons when comments is undefined", () => {
      render(<CommentsSection {...defaultProps} comments={undefined} />);
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should show empty message when no comments", () => {
      render(
        <CommentsSection
          {...defaultProps}
          comments={[]}
          topLevelComments={[]}
        />
      );
      expect(
        screen.getByText("No comments yet. Be the first to comment!")
      ).toBeInTheDocument();
    });
  });

  describe("comments list", () => {
    it("should render CommentItem for each top level comment", () => {
      const topLevel = [
        makeComment("c1", "Comment 1"),
        makeComment("c2", "Comment 2"),
      ];
      render(
        <CommentsSection
          {...defaultProps}
          comments={topLevel}
          topLevelComments={topLevel}
        />
      );
      const items = screen.getAllByTestId("comment-item");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("Comment 1");
      expect(items[1]).toHaveTextContent("Comment 2");
    });
  });

  describe("submit button", () => {
    it("should disable submit when comment is empty", () => {
      render(<CommentsSection {...defaultProps} newComment="" />);
      const sendButton = screen.getByTestId("send-icon").closest("button");
      expect(sendButton).toBeDisabled();
    });

    it("should disable submit when only whitespace", () => {
      render(<CommentsSection {...defaultProps} newComment="   " />);
      const sendButton = screen.getByTestId("send-icon").closest("button");
      expect(sendButton).toBeDisabled();
    });

    it("should disable submit when submitting", () => {
      render(
        <CommentsSection
          {...defaultProps}
          isSubmittingComment={true}
          newComment="Hello"
        />
      );
      const sendButton = screen.getByTestId("send-icon").closest("button");
      expect(sendButton).toBeDisabled();
    });

    it("should enable submit when valid comment exists", () => {
      render(<CommentsSection {...defaultProps} newComment="Hello" />);
      const sendButton = screen.getByTestId("send-icon").closest("button");
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe("AI draft reply button", () => {
    it("should show Draft Reply button when admin", () => {
      render(<CommentsSection {...defaultProps} effectiveIsAdmin={true} />);
      expect(screen.getByText("Draft Reply with AI")).toBeInTheDocument();
    });

    it("should not show Draft Reply button when not admin", () => {
      render(<CommentsSection {...defaultProps} effectiveIsAdmin={false} />);
      expect(screen.queryByText("Draft Reply with AI")).not.toBeInTheDocument();
    });

    it("should show generating state", () => {
      render(
        <CommentsSection
          {...defaultProps}
          effectiveIsAdmin={true}
          isGeneratingDraft={true}
        />
      );
      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(screen.getByTestId("spinner-icon")).toBeInTheDocument();
    });

    it("should disable button when generating", () => {
      render(
        <CommentsSection
          {...defaultProps}
          effectiveIsAdmin={true}
          isGeneratingDraft={true}
        />
      );
      const button = screen.getByText("Generating...").closest("button");
      expect(button).toBeDisabled();
    });

    it("should call onGenerateDraftReply when clicked", () => {
      const onGenerateDraftReply = vi.fn();
      render(
        <CommentsSection
          {...defaultProps}
          effectiveIsAdmin={true}
          onGenerateDraftReply={onGenerateDraftReply}
        />
      );
      const { fireEvent } = require("@testing-library/react");
      fireEvent.click(screen.getByText("Draft Reply with AI"));
      expect(onGenerateDraftReply).toHaveBeenCalledOnce();
    });
  });

  describe("submit comment", () => {
    it("should call onSubmitComment when send button is clicked", () => {
      const onSubmitComment = vi.fn();
      const { fireEvent: fe } = require("@testing-library/react");
      render(
        <CommentsSection
          {...defaultProps}
          newComment="Hello world"
          onSubmitComment={onSubmitComment}
        />
      );
      const sendButton = screen.getByTestId("send-icon").closest("button");
      fe.click(sendButton!);
      expect(onSubmitComment).toHaveBeenCalledOnce();
    });
  });

  describe("comment count", () => {
    it("should show 0 when comments is empty array", () => {
      render(<CommentsSection {...defaultProps} comments={[]} />);
      expect(screen.getByText("Comments (0)")).toBeInTheDocument();
    });

    it("should show count of undefined as 0", () => {
      render(<CommentsSection {...defaultProps} comments={undefined} />);
      expect(screen.getByText("Comments (0)")).toBeInTheDocument();
    });
  });
});
