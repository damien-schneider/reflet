import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: { members: { list: "members.list" } },
  },
}));

vi.mock("@/lib/convex-helpers", () => ({
  toId: (_table: string, id: string) => id,
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagSwatchClass: (color: string) => `swatch-${color}`,
  resolveTagColor: (color: string) => color,
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
  attachments: [] as string[],
  description: "",
  email: "",
  title: "",
};

const baseProps = {
  feedback: baseFeedback,
  isMember: true,
  isOpen: true,
  isSubmitting: false,
  onFeedbackChange: vi.fn(),
  onOpenChange: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
};

describe("SubmitFeedbackDialog", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
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
    expect(
      screen.getByText("Shorten the title to 100 characters")
    ).toBeInTheDocument();
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
    expect(screen.getByText("Submitting…")).toBeInTheDocument();
  });

  it("shows title required when description present but title empty", () => {
    render(
      <SubmitFeedbackDialog
        {...baseProps}
        feedback={{ ...baseFeedback, description: "Some desc" }}
      />
    );
    expect(screen.getByText("Add a title to submit")).toBeInTheDocument();
  });
});
