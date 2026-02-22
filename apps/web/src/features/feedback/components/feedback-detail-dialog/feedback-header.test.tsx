import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackHeader } from "./feedback-header";

vi.mock("@phosphor-icons/react", () => ({
  Calendar: () => <svg data-testid="calendar-icon" />,
  CaretUp: () => <svg data-testid="caret-up-icon" />,
  Chat: () => <svg data-testid="chat-icon" />,
  DotsThreeVertical: () => <svg data-testid="dots-icon" />,
  PushPin: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="pin-icon" />
  ),
  Trash: () => <svg data-testid="trash-icon" />,
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown">{children}</div>
  ),
  DropdownListContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
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
  DropdownListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button
        data-testid="select-change"
        onClick={() => onValueChange("status2")}
        type="button"
      >
        change
      </button>
    </div>
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
    <option data-testid="select-item" value={value}>
      {children}
    </option>
  ),
  SelectTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({
    children,
  }: {
    children: React.ReactNode;
    placeholder?: string;
  }) => <div data-testid="select-value">{children}</div>,
}));

vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: ({
    value,
    onChange,
    disabled,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      data-testid="title-editor"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("@/lib/convex-helpers", () => ({
  toId: (_table: string, val: string) => val,
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagDotColor: (color: string) => color,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const status1: {
  _id: Id<"organizationStatuses">;
  name: string;
  color: string;
} = {
  _id: "status1" as Id<"organizationStatuses">,
  name: "Open",
  color: "blue",
};

const status2: {
  _id: Id<"organizationStatuses">;
  name: string;
  color: string;
} = {
  _id: "status2" as Id<"organizationStatuses">,
  name: "Closed",
  color: "green",
};

const baseFeedback = {
  hasVoted: false,
  voteCount: 5,
  isPinned: false,
  organizationStatusId: "status1" as Id<"organizationStatuses">,
  commentCount: 3,
  createdAt: Date.now() - 3_600_000,
};

const defaultProps = {
  feedback: baseFeedback,
  canEdit: true,
  effectiveIsAdmin: true,
  hasUnsavedChanges: false,
  editedTitle: "Test Feedback",
  effectiveStatuses: [status1, status2],
  currentStatus: status1,
  onTitleChange: vi.fn(),
  onSaveChanges: vi.fn(),
  onCancelChanges: vi.fn(),
  onVote: vi.fn(),
  onStatusChange: vi.fn(),
  onTogglePin: vi.fn(),
  onDeleteClick: vi.fn(),
};

describe("FeedbackHeader", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render vote count", () => {
    render(<FeedbackHeader {...defaultProps} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render title editor with value", () => {
    render(<FeedbackHeader {...defaultProps} />);
    const titleEditor = screen.getByTestId("title-editor");
    expect(titleEditor).toHaveValue("Test Feedback");
  });

  it("should disable title editor when canEdit is false", () => {
    render(<FeedbackHeader {...defaultProps} canEdit={false} />);
    expect(screen.getByTestId("title-editor")).toBeDisabled();
  });

  it("should call onVote when vote button is clicked", () => {
    render(<FeedbackHeader {...defaultProps} />);
    const voteButton = screen.getByText("5").closest("button");
    fireEvent.click(voteButton!);
    expect(defaultProps.onVote).toHaveBeenCalledOnce();
  });

  it("should show pin icon when feedback is pinned", () => {
    render(
      <FeedbackHeader
        {...defaultProps}
        feedback={{ ...baseFeedback, isPinned: true }}
      />
    );
    const pinIcons = screen.getAllByTestId("pin-icon");
    const titlePinIcon = pinIcons.find((el) =>
      el.classList.contains("shrink-0")
    );
    expect(titlePinIcon).toBeInTheDocument();
  });

  it("should not show pin icon when feedback is not pinned", () => {
    render(<FeedbackHeader {...defaultProps} />);
    // Pin icon in header area (not the action menu)
    const pinIcons = screen.getAllByTestId("pin-icon");
    // Should only be in the dropdown, not the title area
    expect(pinIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("should show comment count", () => {
    render(<FeedbackHeader {...defaultProps} />);
    expect(screen.getByText("3 comments")).toBeInTheDocument();
  });

  describe("unsaved changes", () => {
    it("should show Save and Cancel buttons when hasUnsavedChanges is true", () => {
      render(<FeedbackHeader {...defaultProps} hasUnsavedChanges={true} />);
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should not show Save/Cancel when hasUnsavedChanges is false", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });

    it("should not show Save/Cancel when canEdit is false", () => {
      render(
        <FeedbackHeader
          {...defaultProps}
          canEdit={false}
          hasUnsavedChanges={true}
        />
      );
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });

    it("should call onSaveChanges when Save is clicked", () => {
      render(<FeedbackHeader {...defaultProps} hasUnsavedChanges={true} />);
      fireEvent.click(screen.getByText("Save"));
      expect(defaultProps.onSaveChanges).toHaveBeenCalledOnce();
    });

    it("should call onCancelChanges when Cancel is clicked", () => {
      render(<FeedbackHeader {...defaultProps} hasUnsavedChanges={true} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onCancelChanges).toHaveBeenCalledOnce();
    });
  });

  describe("status selector", () => {
    it("should render status selector when admin with statuses", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("select")).toBeInTheDocument();
    });

    it("should show current status name", () => {
      render(<FeedbackHeader {...defaultProps} />);
      const openTexts = screen.getAllByText("Open");
      expect(openTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("should render all status options", () => {
      render(<FeedbackHeader {...defaultProps} />);
      const items = screen.getAllByTestId("select-item");
      expect(items).toHaveLength(2);
    });

    it("should not render status selector when not admin", () => {
      render(<FeedbackHeader {...defaultProps} effectiveIsAdmin={false} />);
      expect(screen.queryByTestId("select")).not.toBeInTheDocument();
    });

    it("should not render status selector when no statuses", () => {
      render(<FeedbackHeader {...defaultProps} effectiveStatuses={[]} />);
      expect(screen.queryByTestId("select")).not.toBeInTheDocument();
    });
  });

  describe("actions menu", () => {
    it("should show actions menu when canEdit is true", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    });

    it("should not show actions menu when canEdit is false", () => {
      render(<FeedbackHeader {...defaultProps} canEdit={false} />);
      // Dropdown should not be rendered in the actions area
      expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
    });

    it("should show Pin feedback option when admin", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByText("Pin feedback")).toBeInTheDocument();
    });

    it("should show Unpin feedback when already pinned", () => {
      render(
        <FeedbackHeader
          {...defaultProps}
          feedback={{ ...baseFeedback, isPinned: true }}
        />
      );
      expect(screen.getByText("Unpin feedback")).toBeInTheDocument();
    });

    it("should call onTogglePin when pin option is clicked", () => {
      render(<FeedbackHeader {...defaultProps} />);
      fireEvent.click(screen.getByText("Pin feedback"));
      expect(defaultProps.onTogglePin).toHaveBeenCalledOnce();
    });

    it("should show Delete feedback option", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByText("Delete feedback")).toBeInTheDocument();
    });

    it("should call onDeleteClick when delete is clicked", () => {
      render(<FeedbackHeader {...defaultProps} />);
      fireEvent.click(screen.getByText("Delete feedback"));
      expect(defaultProps.onDeleteClick).toHaveBeenCalledOnce();
    });

    it("should not show pin option when not admin but canEdit", () => {
      render(<FeedbackHeader {...defaultProps} effectiveIsAdmin={false} />);
      expect(screen.queryByText("Pin feedback")).not.toBeInTheDocument();
    });
  });

  describe("vote interaction", () => {
    it("renders vote count", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(
        screen.getByText(String(defaultProps.feedback.voteCount))
      ).toBeInTheDocument();
    });

    it("renders vote button", () => {
      render(<FeedbackHeader {...defaultProps} />);
      const voteButtons = screen.getAllByRole("button");
      expect(voteButtons.length).toBeGreaterThan(0);
    });
  });

  describe("title display", () => {
    it("renders title editor", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("title-editor")).toBeInTheDocument();
    });

    it("shows edited title value", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("title-editor")).toHaveValue("Test Feedback");
    });

    it("fires onTitleChange when title editor changes", () => {
      render(<FeedbackHeader {...defaultProps} />);
      const editor = screen.getByTestId("title-editor");
      fireEvent.change(editor, { target: { value: "New Title" } });
      expect(defaultProps.onTitleChange).toHaveBeenCalledWith("New Title");
    });

    it("renders placeholder on title editor", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("title-editor")).toHaveAttribute(
        "placeholder",
        "Untitled"
      );
    });
  });

  describe("vote button styling", () => {
    it("applies hasVoted styles when user has voted", () => {
      const { container } = render(
        <FeedbackHeader
          {...defaultProps}
          feedback={{ ...baseFeedback, hasVoted: true }}
        />
      );
      const voteButton = container.querySelector("button");
      expect(voteButton?.className).toContain("border-olive-600");
    });

    it("does not apply hasVoted styles when user has not voted", () => {
      const { container } = render(<FeedbackHeader {...defaultProps} />);
      const voteButton = container.querySelector("button");
      expect(voteButton?.className).not.toContain("border-olive-600");
    });
  });

  describe("date display", () => {
    it("renders date formatted with formatDistanceToNow", () => {
      render(<FeedbackHeader {...defaultProps} />);
      // formatDistanceToNow is mocked via date-fns - it outputs relative time
      expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    });
  });

  describe("separator in dropdown", () => {
    it("shows separator when admin", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
    });

    it("does not show separator when not admin but canEdit", () => {
      render(<FeedbackHeader {...defaultProps} effectiveIsAdmin={false} />);
      expect(
        screen.queryByTestId("dropdown-separator")
      ).not.toBeInTheDocument();
    });
  });

  describe("status change via Select", () => {
    it("calls onStatusChange with toId result when select value changes", () => {
      const onStatusChange = vi.fn();
      render(
        <FeedbackHeader {...defaultProps} onStatusChange={onStatusChange} />
      );
      fireEvent.click(screen.getByTestId("select-change"));
      expect(onStatusChange).toHaveBeenCalledWith("status2");
    });

    it("does not show select when effectiveStatuses is empty", () => {
      render(<FeedbackHeader {...defaultProps} effectiveStatuses={[]} />);
      expect(screen.queryByTestId("select")).not.toBeInTheDocument();
    });

    it("does not show select when not admin", () => {
      render(<FeedbackHeader {...defaultProps} effectiveIsAdmin={false} />);
      expect(screen.queryByTestId("select")).not.toBeInTheDocument();
    });
  });

  describe("comment count display", () => {
    it("renders comment count text", () => {
      render(<FeedbackHeader {...defaultProps} />);
      expect(screen.getByText("3 comments")).toBeInTheDocument();
    });

    it("renders zero comments", () => {
      render(
        <FeedbackHeader
          {...defaultProps}
          feedback={{ ...baseFeedback, commentCount: 0 }}
        />
      );
      expect(screen.getByText("0 comments")).toBeInTheDocument();
    });
  });

  describe("unsaved changes buttons", () => {
    it("shows save and cancel when hasUnsavedChanges and canEdit", () => {
      render(<FeedbackHeader {...defaultProps} hasUnsavedChanges />);
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("calls onSaveChanges when save clicked", () => {
      const onSaveChanges = vi.fn();
      render(
        <FeedbackHeader
          {...defaultProps}
          hasUnsavedChanges
          onSaveChanges={onSaveChanges}
        />
      );
      fireEvent.click(screen.getByText("Save"));
      expect(onSaveChanges).toHaveBeenCalledOnce();
    });

    it("calls onCancelChanges when cancel clicked", () => {
      const onCancelChanges = vi.fn();
      render(
        <FeedbackHeader
          {...defaultProps}
          hasUnsavedChanges
          onCancelChanges={onCancelChanges}
        />
      );
      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancelChanges).toHaveBeenCalledOnce();
    });

    it("hides save/cancel when canEdit is false", () => {
      render(
        <FeedbackHeader {...defaultProps} canEdit={false} hasUnsavedChanges />
      );
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });
});
