import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommentData } from "./comment-item";
import { CommentItem } from "./comment-item";

vi.mock("@phosphor-icons/react", () => ({
  DotsThreeVertical: () => <svg data-testid="dots-icon" />,
  Pencil: () => <svg data-testid="pencil-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="avatar">
      {children}
    </div>
  ),
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid="avatar-fallback">
      {children}
    </span>
  ),
  AvatarImage: ({ src }: { src?: string }) =>
    src ? <img alt="" data-testid="avatar-image" src={src} /> : null,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
      className={className}
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown">{children}</div>
  ),
  DropdownListContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownListItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      className={className}
      data-testid="dropdown-item"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
  DropdownListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
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

const makeComment = (overrides?: Partial<CommentData>): CommentData => ({
  _id: "comment1" as Id<"comments">,
  body: "Test comment body",
  createdAt: Date.now() - 60_000,
  authorName: "John Doe",
  authorImage: "https://example.com/avatar.png",
  isAuthor: false,
  isOfficial: false,
  ...overrides,
});

const defaultProps = {
  comment: makeComment(),
  replies: [] as CommentData[],
  isAdmin: false,
  replyingTo: null as Id<"comments"> | null,
  replyContent: "",
  editingCommentId: null as Id<"comments"> | null,
  editCommentContent: "",
  isSubmittingComment: false,
  onReply: vi.fn(),
  onReplyCancel: vi.fn(),
  onReplyContentChange: vi.fn(),
  onSubmitReply: vi.fn(),
  onEdit: vi.fn(),
  onEditCancel: vi.fn(),
  onEditContentChange: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
};

describe("CommentItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render comment body", () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText("Test comment body")).toBeInTheDocument();
  });

  it("should render author name", () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should render 'Anonymous' when authorName is missing", () => {
    render(
      <CommentItem
        {...defaultProps}
        comment={makeComment({ authorName: undefined })}
      />
    );
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("should render avatar fallback with first character of name", () => {
    render(<CommentItem {...defaultProps} />);
    const fallbacks = screen.getAllByTestId("avatar-fallback");
    expect(fallbacks[0]).toHaveTextContent("J");
  });

  it("should render '?' for avatar fallback when no name", () => {
    render(
      <CommentItem
        {...defaultProps}
        comment={makeComment({ authorName: undefined })}
      />
    );
    const fallbacks = screen.getAllByTestId("avatar-fallback");
    expect(fallbacks[0]).toHaveTextContent("?");
  });

  it("should render Official badge when isOfficial is true", () => {
    render(
      <CommentItem
        {...defaultProps}
        comment={makeComment({ isOfficial: true })}
      />
    );
    expect(screen.getByText("Official")).toBeInTheDocument();
  });

  it("should not render Official badge when isOfficial is false", () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.queryByText("Official")).not.toBeInTheDocument();
  });

  it("should render Reply button", () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText("Reply")).toBeInTheDocument();
  });

  it("should call onReply when Reply button is clicked", () => {
    render(<CommentItem {...defaultProps} />);
    fireEvent.click(screen.getByText("Reply"));
    expect(defaultProps.onReply).toHaveBeenCalledWith("comment1");
  });

  describe("actions menu (canModify)", () => {
    it("should show actions when user is author", () => {
      render(
        <CommentItem
          {...defaultProps}
          comment={makeComment({ isAuthor: true })}
        />
      );
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should show actions when user is admin", () => {
      render(<CommentItem {...defaultProps} isAdmin={true} />);
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should not show actions when user is neither author nor admin", () => {
      render(<CommentItem {...defaultProps} />);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });

    it("should call onEdit when Edit is clicked", () => {
      render(
        <CommentItem
          {...defaultProps}
          comment={makeComment({ isAuthor: true })}
        />
      );
      fireEvent.click(screen.getByText("Edit"));
      expect(defaultProps.onEdit).toHaveBeenCalledWith(
        "comment1",
        "Test comment body"
      );
    });

    it("should call onDelete when Delete is clicked", () => {
      render(
        <CommentItem
          {...defaultProps}
          comment={makeComment({ isAuthor: true })}
        />
      );
      fireEvent.click(screen.getByText("Delete"));
      expect(defaultProps.onDelete).toHaveBeenCalledWith("comment1");
    });
  });

  describe("editing mode", () => {
    it("should show editor when editingCommentId matches", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent="Editing content"
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveValue("Editing content");
    });

    it("should show Save and Cancel buttons in edit mode", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent="text"
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should disable Save when edit content is empty", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent=""
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      expect(screen.getByText("Save")).toBeDisabled();
    });

    it("should call onUpdate when Save is clicked", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent="Updated"
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      fireEvent.click(screen.getByText("Save"));
      expect(defaultProps.onUpdate).toHaveBeenCalledWith("comment1");
    });

    it("should call onEditCancel when Cancel is clicked", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent="text"
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onEditCancel).toHaveBeenCalled();
    });

    it("should not show comment body in edit mode", () => {
      render(
        <CommentItem
          {...defaultProps}
          editCommentContent="text"
          editingCommentId={"comment1" as Id<"comments">}
        />
      );
      expect(screen.queryByText("Test comment body")).not.toBeInTheDocument();
    });
  });

  describe("reply mode", () => {
    it("should show reply editor when replyingTo matches", () => {
      render(
        <CommentItem
          {...defaultProps}
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      expect(
        screen.getByPlaceholderText("Write a reply...")
      ).toBeInTheDocument();
    });

    it("should not show reply editor when replyingTo does not match", () => {
      render(
        <CommentItem {...defaultProps} replyingTo={"other" as Id<"comments">} />
      );
      expect(
        screen.queryByPlaceholderText("Write a reply...")
      ).not.toBeInTheDocument();
    });

    it("should disable Reply button when content is empty", () => {
      render(
        <CommentItem
          {...defaultProps}
          replyContent=""
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      // Find the Reply button in the reply section (not the trigger button)
      const buttons = screen.getAllByText("Reply");
      const replySubmitButton = buttons.at(-1);
      expect(replySubmitButton).toBeDisabled();
    });

    it("should disable Reply button when submitting", () => {
      render(
        <CommentItem
          {...defaultProps}
          isSubmittingComment={true}
          replyContent="Some reply"
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      const buttons = screen.getAllByText("Reply");
      const replySubmitButton = buttons.at(-1);
      expect(replySubmitButton).toBeDisabled();
    });

    it("should call onReplyCancel when Cancel is clicked in reply", () => {
      render(
        <CommentItem
          {...defaultProps}
          replyContent="text"
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onReplyCancel).toHaveBeenCalled();
    });
  });

  describe("replies rendering", () => {
    const replies: CommentData[] = [
      makeComment({
        _id: "reply1" as Id<"comments">,
        body: "Reply body 1",
        authorName: "Jane",
        isAuthor: true,
      }),
      makeComment({
        _id: "reply2" as Id<"comments">,
        body: "Reply body 2",
        authorName: "Bob",
      }),
    ];

    it("should render replies", () => {
      render(<CommentItem {...defaultProps} replies={replies} />);
      expect(screen.getByText("Reply body 1")).toBeInTheDocument();
      expect(screen.getByText("Reply body 2")).toBeInTheDocument();
    });

    it("should render reply author names", () => {
      render(<CommentItem {...defaultProps} replies={replies} />);
      expect(screen.getByText("Jane")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should not render replies section when empty", () => {
      const { container } = render(
        <CommentItem {...defaultProps} replies={[]} />
      );
      expect(container.querySelector(".border-l-2")).not.toBeInTheDocument();
    });

    it("should render reply avatar fallback initials", () => {
      const replies = [
        makeComment({
          _id: "reply1" as Id<"comments">,
          body: "Reply",
          authorName: "Alice",
        }),
      ];
      render(<CommentItem {...defaultProps} replies={replies} />);
      // The reply should have "A" fallback
      const fallbacks = screen.getAllByTestId("avatar-fallback");
      const replyFallback = fallbacks.find((f) => f.textContent === "A");
      expect(replyFallback).toBeInTheDocument();
    });
  });

  describe("avatar image", () => {
    it("should render avatar image when provided", () => {
      render(<CommentItem {...defaultProps} />);
      expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
    });

    it("should not render avatar image when missing", () => {
      render(
        <CommentItem
          {...defaultProps}
          comment={makeComment({ authorImage: undefined })}
        />
      );
      expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
    });
  });

  describe("submit reply", () => {
    it("should call onSubmitReply when Reply button is clicked with content", () => {
      render(
        <CommentItem
          {...defaultProps}
          replyContent="My reply"
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      const buttons = screen.getAllByText("Reply");
      const replySubmitButton = buttons.at(-1);
      fireEvent.click(replySubmitButton);
      expect(defaultProps.onSubmitReply).toHaveBeenCalledWith("comment1");
    });
  });

  describe("reply content change", () => {
    it("should call onReplyContentChange when typing in reply editor", () => {
      render(
        <CommentItem
          {...defaultProps}
          replyingTo={"comment1" as Id<"comments">}
        />
      );
      const editor = screen.getByPlaceholderText("Write a reply...");
      fireEvent.change(editor, { target: { value: "New reply" } });
      expect(defaultProps.onReplyContentChange).toHaveBeenCalledWith(
        "New reply"
      );
    });
  });
});
