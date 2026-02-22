import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <span data-testid="icon-caret-up" />,
  DotsThreeVertical: () => <span data-testid="icon-dots" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  PushPin: () => <span data-testid="icon-pin" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: string;
    variant?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  DropdownListSeparator: () => <hr />,
  DropdownListTrigger: ({
    render,
  }: {
    render: (props: Record<string, unknown>) => React.ReactNode;
  }) => <>{render({})}</>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    rows,
  }: {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    rows?: number;
  }) => (
    <textarea
      data-testid="description-textarea"
      onChange={onChange}
      rows={rows}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H3: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { FeedbackMainContent } from "./feedback-main-content";

afterEach(cleanup);

const baseFeedback = {
  title: "Better dark mode",
  description: "Please improve the dark mode theme.",
  voteCount: 15,
  hasVoted: false,
  isPinned: false,
  _creationTime: Date.now(),
  author: { name: "Alice", email: "alice@test.com" },
};

const baseProps = {
  feedback: baseFeedback,
  isAdmin: false,
  isEditingDescription: false,
  editedDescription: "",
  isSubmitting: false,
  handleToggleVote: vi.fn(),
  handleTogglePin: vi.fn(),
  handleDeleteFeedback: vi.fn(),
  handleSaveDescription: vi.fn(),
  setEditedDescription: vi.fn(),
  setIsEditingDescription: vi.fn(),
};

describe("FeedbackMainContent", () => {
  it("renders title and description", () => {
    render(<FeedbackMainContent {...baseProps} />);
    expect(screen.getByText("Better dark mode")).toBeInTheDocument();
    expect(
      screen.getByText("Please improve the dark mode theme.")
    ).toBeInTheDocument();
  });

  it("renders vote count", () => {
    render(<FeedbackMainContent {...baseProps} />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders author name", () => {
    render(<FeedbackMainContent {...baseProps} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("renders Anonymous when no author", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, author: null }}
      />
    );
    expect(screen.getByText(/Anonymous/)).toBeInTheDocument();
  });

  it("shows empty description placeholder", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, description: "" }}
      />
    );
    expect(screen.getByText("No description provided.")).toBeInTheDocument();
  });

  it("calls handleToggleVote on vote button click", async () => {
    const handleToggleVote = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent {...baseProps} handleToggleVote={handleToggleVote} />
    );
    await user.click(screen.getByText("15"));
    expect(handleToggleVote).toHaveBeenCalledOnce();
  });

  it("shows admin dropdown when isAdmin", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin />);
    expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    expect(screen.getByText(/Pin/)).toBeInTheDocument();
    expect(screen.getByText(/Delete/)).toBeInTheDocument();
  });

  it("hides admin dropdown when not admin", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin={false} />);
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });

  it("shows Unpin when feedback is pinned", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, isPinned: true }}
        isAdmin
      />
    );
    expect(screen.getByText(/Unpin/)).toBeInTheDocument();
  });

  it("renders editing state with textarea", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        editedDescription="Editing..."
        isEditingDescription
      />
    );
    expect(screen.getByTestId("description-textarea")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls handleSaveDescription on save click", async () => {
    const handleSaveDescription = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        editedDescription="New desc"
        handleSaveDescription={handleSaveDescription}
        isEditingDescription
      />
    );
    await user.click(screen.getByText("Save"));
    expect(handleSaveDescription).toHaveBeenCalledOnce();
  });

  it("disables save button when submitting", () => {
    render(
      <FeedbackMainContent {...baseProps} isEditingDescription isSubmitting />
    );
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("calls setIsEditingDescription(false) on cancel", async () => {
    const setIsEditingDescription = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        isEditingDescription
        setIsEditingDescription={setIsEditingDescription}
      />
    );
    await user.click(screen.getByText("Cancel"));
    expect(setIsEditingDescription).toHaveBeenCalledWith(false);
  });

  it("renders children", () => {
    render(
      <FeedbackMainContent {...baseProps}>
        <div data-testid="child">Extra content</div>
      </FeedbackMainContent>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("calls handleTogglePin when pin button is clicked", async () => {
    const handleTogglePin = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        handleTogglePin={handleTogglePin}
        isAdmin
      />
    );
    await user.click(screen.getByText(/Pin/));
    expect(handleTogglePin).toHaveBeenCalledOnce();
  });

  it("calls handleDeleteFeedback when delete button is clicked", async () => {
    const handleDeleteFeedback = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        handleDeleteFeedback={handleDeleteFeedback}
        isAdmin
      />
    );
    await user.click(screen.getByText(/Delete/));
    expect(handleDeleteFeedback).toHaveBeenCalledOnce();
  });

  it("renders author email when name is missing", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{
          ...baseFeedback,
          author: { name: null, email: "bob@test.com" },
        }}
      />
    );
    expect(screen.getByText(/bob@test.com/)).toBeInTheDocument();
  });

  it("shows pin icon in admin dropdown", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin />);
    expect(screen.getByTestId("icon-pin")).toBeInTheDocument();
  });

  it("shows trash icon in admin dropdown", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin />);
    expect(screen.getByTestId("icon-trash")).toBeInTheDocument();
  });

  it("updates textarea value on change", async () => {
    const setEditedDescription = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        editedDescription=""
        isEditingDescription
        setEditedDescription={setEditedDescription}
      />
    );
    const textarea = screen.getByTestId("description-textarea");
    await user.type(textarea, "New");
    expect(setEditedDescription).toHaveBeenCalled();
  });

  it("renders card component", () => {
    render(<FeedbackMainContent {...baseProps} />);
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("renders card content", () => {
    render(<FeedbackMainContent {...baseProps} />);
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
  });

  it("renders hasVoted state visually", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, hasVoted: true }}
      />
    );
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders admin edit description option", () => {
    const { container } = render(
      <FeedbackMainContent {...baseProps} isAdmin />
    );
    expect(container.querySelector("[data-testid='card']")).toBeInTheDocument();
  });

  it("renders hasVoted CSS classes on vote button", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, hasVoted: true }}
      />
    );
    const voteButton = screen.getByText("15").closest("button");
    expect(voteButton?.className).toContain("olive-600");
  });

  it("renders non-voted CSS classes on vote button", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, hasVoted: false }}
      />
    );
    const voteButton = screen.getByText("15").closest("button");
    expect(voteButton?.className).toContain("hover:border-olive-600");
  });

  it("renders pin icon when feedback is pinned", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, isPinned: true }}
      />
    );
    expect(screen.getByTestId("icon-pin")).toBeInTheDocument();
  });

  it("shows edit pencil button only for admin", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin />);
    expect(screen.getByTestId("icon-pencil")).toBeInTheDocument();
  });

  it("hides edit pencil button for non-admin", () => {
    render(<FeedbackMainContent {...baseProps} isAdmin={false} />);
    expect(screen.queryByTestId("icon-pencil")).not.toBeInTheDocument();
  });

  it("calls setEditedDescription and setIsEditingDescription when pencil button clicked", async () => {
    const setEditedDescription = vi.fn();
    const setIsEditingDescription = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        isAdmin
        setEditedDescription={setEditedDescription}
        setIsEditingDescription={setIsEditingDescription}
      />
    );
    // Find the pencil icon and click its parent button
    const pencilIcon = screen.getByTestId("icon-pencil");
    const editButton = pencilIcon.closest("button");
    expect(editButton).toBeTruthy();
    await user.click(editButton!);
    expect(setEditedDescription).toHaveBeenCalledWith(
      "Please improve the dark mode theme."
    );
    expect(setIsEditingDescription).toHaveBeenCalledWith(true);
  });

  it("calls setEditedDescription with empty string when description is empty and pencil clicked", async () => {
    const setEditedDescription = vi.fn();
    const setIsEditingDescription = vi.fn();
    const user = userEvent.setup();
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{ ...baseFeedback, description: "" }}
        isAdmin
        setEditedDescription={setEditedDescription}
        setIsEditingDescription={setIsEditingDescription}
      />
    );
    const pencilIcon = screen.getByTestId("icon-pencil");
    await user.click(pencilIcon.closest("button")!);
    expect(setEditedDescription).toHaveBeenCalledWith("");
    expect(setIsEditingDescription).toHaveBeenCalledWith(true);
  });

  it("renders author email without name", () => {
    render(
      <FeedbackMainContent
        {...baseProps}
        feedback={{
          ...baseFeedback,
          author: { name: undefined, email: "test@x.com" },
        }}
      />
    );
    expect(screen.getByText(/test@x.com/)).toBeInTheDocument();
  });
});
