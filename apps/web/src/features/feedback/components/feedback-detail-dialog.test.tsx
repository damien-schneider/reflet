import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the Convex hooks
const mockFeedback = {
  _id: "test-feedback-id" as Id<"feedback">,
  title: "Test Feedback Title",
  description: "Test feedback description",
  voteCount: 5,
  commentCount: 2,
  hasVoted: false,
  isPinned: false,
  isAuthor: false,
  role: "member" as const,
  createdAt: Date.now() - 86_400_000, // 1 day ago
  statusId: "test-status-id" as Id<"boardStatuses">,
  boardId: "test-board-id" as Id<"boards">,
  tags: [
    { _id: "tag1", name: "Bug", color: "#ff0000" },
    { _id: "tag2", name: "Feature", color: "#00ff00" },
  ],
};

const mockComments = [
  {
    _id: "comment1",
    body: "This is a test comment",
    createdAt: Date.now() - 3_600_000,
    authorName: "John Doe",
    authorImage: undefined,
    isAuthor: false,
    isOfficial: false,
    parentId: undefined,
  },
];

const mockBoardStatuses = [
  { _id: "status1", name: "Open", color: "#3b82f6", order: 0 },
  { _id: "status2", name: "In Progress", color: "#f59e0b", order: 1 },
  { _id: "status3", name: "Done", color: "#10b981", order: 2 },
];

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}));

vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    feedback: { get: "feedback.get", update: "feedback.update" },
    comments: {
      list: "comments.list",
      create: "comments.create",
      update: "comments.update",
      remove: "comments.remove",
    },
    board_statuses: { list: "board_statuses.list" },
    feedback_actions: {
      updateStatus: "feedback_actions.updateStatus",
      remove: "feedback_actions.remove",
      togglePin: "feedback_actions.togglePin",
    },
    votes: { toggle: "votes.toggle" },
  },
}));

// Mock UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    type = "button",
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
    type?: "button" | "submit" | "reset";
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    style,
    variant,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} style={style}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    ...props
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  }) => (
    <input
      {...props}
      data-testid="input"
      onChange={onChange}
      onKeyDown={onKeyDown}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    rows,
    className,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
  }) => (
    <textarea
      className={className}
      data-testid="textarea"
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={rows}
      value={value}
    />
  ),
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
  AvatarImage: ({ src }: { src?: string }) => (
    <span data-src={src} data-testid="avatar-image" />
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
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (val: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <button className={className} data-testid="select-trigger" type="button">
      {children}
    </button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectValue: ({
    children,
    placeholder,
  }: {
    children?: React.ReactNode;
    placeholder?: string;
  }) => <span data-testid="select-value">{children || placeholder}</span>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
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
  DropdownListSeparator: () => <hr data-testid="dropdown-separator" />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: ({ className }: { className?: string }) => (
    <hr className={className} data-testid="separator" />
  ),
}));

vi.mock("lucide-react", () => ({
  Calendar: () => <svg data-testid="calendar-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  CaretUp: () => <svg data-testid="chevron-up-icon" />,
  Pencil: () => <svg data-testid="edit-icon" />,
  Chat: () => <svg data-testid="message-icon" />,
  MoreHorizontal: () => <svg data-testid="more-icon" />,
  Pin: () => <svg data-testid="pin-icon" />,
  Send: () => <svg data-testid="send-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((arg) => typeof arg === "string" || typeof arg === "boolean")
      .join(" "),
}));

// Import the component after mocks
import { FeedbackDetailDialog } from "./feedback-detail-dialog";

describe("FeedbackDetailDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should not render when feedbackId is null", () => {
    const onClose = vi.fn();

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={null}
        onClose={onClose}
      />
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("should show loading skeleton when feedback is loading", () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return undefined; // Loading state
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should display feedback title and description", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Feedback Title")).toBeInTheDocument();
    });
    expect(screen.getByText("Test feedback description")).toBeInTheDocument();
  });

  it("should display vote count", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("should display tags", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bug")).toBeInTheDocument();
    });
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("should display comments", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("This is a test comment")).toBeInTheDocument();
    });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should show comment input", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Write a comment...")
      ).toBeInTheDocument();
    });
  });

  it("should show 'Feedback not found' when feedback is null", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return null;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Feedback not found")).toBeInTheDocument();
    });
  });

  it("should display comment count", async () => {
    const onClose = vi.fn();
    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("2 comments")).toBeInTheDocument();
    });
  });
});

describe("FeedbackDetailDialog - Admin Features", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should show status dropdown for admin users", async () => {
    const onClose = vi.fn();
    const adminFeedback = { ...mockFeedback, role: "admin" as const };

    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return adminFeedback;
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("select")).toBeInTheDocument();
    });
  });

  it("should not show status dropdown for regular members", async () => {
    const onClose = vi.fn();

    mockUseQuery.mockImplementation((queryName) => {
      if (queryName === "feedback.get") {
        return mockFeedback; // role: "member"
      }
      if (queryName === "comments.list") {
        return mockComments;
      }
      if (queryName === "board_statuses.list") {
        return mockBoardStatuses;
      }
      return [];
    });

    render(
      <FeedbackDetailDialog
        boardId={"board-id" as Id<"boards">}
        feedbackId={"feedback-id" as Id<"feedback">}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Feedback Title")).toBeInTheDocument();
    });
    // Status select should not be present for non-admin
    expect(screen.queryByTestId("select")).not.toBeInTheDocument();
  });
});
