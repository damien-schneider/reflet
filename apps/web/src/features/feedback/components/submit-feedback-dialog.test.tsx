import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    members: { list: "members.list" },
  },
}));

vi.mock("@/lib/convex-helpers", () => ({
  toId: (_table: string, id: string) => id,
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagSwatchClass: (color: string) => `swatch-${color}`,
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
      data-testid="md-editor"
      placeholder={placeholder}
      readOnly
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: ({
    value,
    placeholder,
    onChange,
  }: {
    value: string;
    placeholder?: string;
    onChange?: (v: string) => void;
  }) => (
    <input
      data-testid="title-editor"
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("./attachment-upload", () => ({
  AttachmentUpload: () => <div data-testid="attachment-upload" />,
}));

import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

const baseFeedback = {
  title: "",
  description: "",
  email: "",
  attachments: [] as string[],
};

const baseProps = {
  isOpen: true,
  onOpenChange: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  feedback: baseFeedback,
  onFeedbackChange: vi.fn(),
  isSubmitting: false,
  isMember: true,
};

describe("SubmitFeedbackDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("renders when open", () => {
    render(<SubmitFeedbackDialog {...baseProps} />);
    expect(screen.getByText("Submit Feedback")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<SubmitFeedbackDialog {...baseProps} isOpen={false} />);
    expect(screen.queryByText("Submit Feedback")).not.toBeInTheDocument();
  });

  it("disables submit when title is empty", () => {
    render(<SubmitFeedbackDialog {...baseProps} />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("enables submit when title has content", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, title: "Valid" }}
      />
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("shows title counter when near limit", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, title: "a".repeat(91) }}
      />
    );
    expect(screen.getByText("Title: 91/100")).toBeInTheDocument();
  });

  it("shows error when title exceeds limit", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, title: "a".repeat(101) }}
      />
    );
    expect(screen.getByText("Title is too long")).toBeInTheDocument();
  });

  it("shows email input for non-members", () => {
    render(<SubmitFeedbackDialog {...baseProps} isMember={false} />);
    expect(
      screen.getByPlaceholderText("Email for updates (optional)")
    ).toBeInTheDocument();
  });

  it("does not show email input for members", () => {
    render(<SubmitFeedbackDialog {...baseProps} isMember />);
    expect(
      screen.queryByPlaceholderText("Email for updates (optional)")
    ).not.toBeInTheDocument();
  });

  it("shows Submitting text when submitting", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, title: "Test" }}
        isSubmitting
      />
    );
    expect(screen.getByText("Submitting...")).toBeInTheDocument();
  });

  it("shows Cancel button", () => {
    render(<SubmitFeedbackDialog {...baseProps} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onSubmit when submit button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, title: "Valid" }}
      />
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(baseProps.onSubmit).toHaveBeenCalledOnce();
  });

  it("shows title required when description present but title empty", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, description: "Some desc" }}
      />
    );
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("renders attachment upload", () => {
    render(<SubmitFeedbackDialog {...baseProps} />);
    expect(screen.getByTestId("attachment-upload")).toBeInTheDocument();
  });
});
