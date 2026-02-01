import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

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
  DialogClose: ({ render }: { render: React.ReactNode }) => (
    <div data-testid="dialog-close">{render}</div>
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
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    "aria-label": ariaLabel,
    className,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    "aria-label"?: string;
    className?: string;
  }) => (
    <input
      aria-label={ariaLabel}
      className={className}
      data-testid="input"
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="title-editor"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (val: string) => void;
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

vi.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div className={className} data-testid="spinner">
      Spinner
    </div>
  ),
}));

describe("SubmitFeedbackDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    feedback: {
      title: "Test Title",
      description: "Test Description",
      email: "",
    },
    onFeedbackChange: vi.fn(),
    isSubmitting: false,
    isMember: false,
  };

  it("should render dialog content when open", () => {
    render(<SubmitFeedbackDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeTruthy();
    expect(screen.getByTestId("title-editor")).toHaveProperty(
      "value",
      "Test Title"
    );
    expect(screen.getByTestId("markdown-editor")).toHaveProperty(
      "value",
      "Test Description"
    );
  });

  it("should render email input for non-members", () => {
    render(<SubmitFeedbackDialog {...defaultProps} isMember={false} />);
    const emailInput = screen.getByPlaceholderText(
      "Email for updates (optional)"
    );
    expect(emailInput).toBeTruthy();
    expect(emailInput.getAttribute("aria-label")).toBe("Email for updates");
  });

  it("should not render email input for members", () => {
    render(<SubmitFeedbackDialog {...defaultProps} isMember={true} />);
    expect(
      screen.queryByPlaceholderText("Email for updates (optional)")
    ).toBeNull();
  });

  it("should show 'Submitting' and spinner when isSubmitting is true", () => {
    render(<SubmitFeedbackDialog {...defaultProps} isSubmitting={true} />);
    expect(screen.getByText("Submitting")).toBeTruthy();
    expect(screen.getByTestId("spinner")).toBeTruthy();
  });

  it("should show 'Submit' when isSubmitting is false", () => {
    render(<SubmitFeedbackDialog {...defaultProps} isSubmitting={false} />);
    expect(screen.getByText("Submit")).toBeTruthy();
  });
});
