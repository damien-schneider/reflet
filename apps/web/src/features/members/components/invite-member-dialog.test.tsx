import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InviteMemberDialog } from "./invite-member-dialog";

// Regex patterns used in tests
const PAPER_PLANE_PATTERN = /PaperPlane/i;
const INVITATION_SENT_PATTERN = /Invitation sent/i;
const COPIED_PATTERN = /Copied/i;

// Mock the Convex hooks
const mockInviteMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockInviteMutation,
}));

vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    invitations: {
      create: "invitations.create",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Shield: () => <span data-testid="shield-icon" />,
  User: () => <span data-testid="user-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-testid={
        size === "icon" ? "copy-button" : `button-${variant ?? "default"}`
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

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
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    type,
    value,
    onChange,
    placeholder,
    readOnly,
    className,
  }: any) => (
    <input
      className={className}
      data-testid={`input-${id}`}
      id={id}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

describe("InviteMemberDialog", () => {
  const mockOnOpenChange = vi.fn();
  const defaultProps = {
    organizationId: "org123" as any,
    open: true,
    onOpenChange: mockOnOpenChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInviteMutation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the dialog when open", () => {
    render(<InviteMemberDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Invite member")).toBeInTheDocument();
  });

  it("shows correct button text (not icon names)", () => {
    render(<InviteMemberDialog {...defaultProps} />);

    // Should show "Send invitation" not "PaperPlaneRight invitation"
    expect(screen.getByText("Send invitation")).toBeInTheDocument();
    expect(screen.queryByText(PAPER_PLANE_PATTERN)).not.toBeInTheDocument();
  });

  it("shows success state with copy link after invitation is sent", async () => {
    const user = userEvent.setup();
    mockInviteMutation.mockResolvedValue({
      invitationId: "inv123",
      token: "abc-token-123",
    });

    render(<InviteMemberDialog {...defaultProps} />);

    // Fill in email
    const emailInput = screen.getByTestId("input-email");
    await user.type(emailInput, "test@example.com");

    // Submit the form
    const submitButton = screen.getByText("Send invitation");
    await user.click(submitButton);

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText(INVITATION_SENT_PATTERN)).toBeInTheDocument();
    });

    // Should show the copy button (icon button)
    expect(screen.getByTestId("copy-button")).toBeInTheDocument();
  });

  it("shows copied confirmation after copying link", async () => {
    const user = userEvent.setup();
    mockInviteMutation.mockResolvedValue({
      invitationId: "inv123",
      token: "abc-token-123",
    });

    // Setup clipboard mock using vi.stubGlobal
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: writeTextMock },
    });

    render(<InviteMemberDialog {...defaultProps} />);

    // Fill in and submit
    const emailInput = screen.getByTestId("input-email");
    await user.type(emailInput, "test@example.com");
    const submitButton = screen.getByText("Send invitation");
    await user.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(INVITATION_SENT_PATTERN)).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByTestId("copy-button");
    await user.click(copyButton);

    // Should show copied confirmation text
    await waitFor(() => {
      expect(screen.getByText(COPIED_PATTERN)).toBeInTheDocument();
    });

    // Verify clipboard was called
    expect(writeTextMock).toHaveBeenCalled();

    // Clean up
    vi.unstubAllGlobals();
  });

  it("resets state when dialog is closed and reopened", async () => {
    const user = userEvent.setup();
    mockInviteMutation.mockResolvedValue({
      invitationId: "inv123",
      token: "abc-token-123",
    });

    const { rerender } = render(<InviteMemberDialog {...defaultProps} />);

    // Fill in and submit
    const emailInput = screen.getByTestId("input-email");
    await user.type(emailInput, "test@example.com");
    const submitButton = screen.getByText("Send invitation");
    await user.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(INVITATION_SENT_PATTERN)).toBeInTheDocument();
    });

    // Close dialog
    rerender(<InviteMemberDialog {...defaultProps} open={false} />);

    // Reopen dialog
    rerender(<InviteMemberDialog {...defaultProps} open={true} />);

    // Should be back to initial state
    expect(screen.getByText("Send invitation")).toBeInTheDocument();
  });
});
