import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-arrows" />
  ),
  Warning: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-warning" />
  ),
  X: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-x" />
  ),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertAction: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-action">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <h4>{children}</h4>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    variant?: string;
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

import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";

afterEach(cleanup);

const defaultProps = {
  onResync: vi.fn(),
};

describe("GitHubPermissionErrorAlert", () => {
  it("renders default title", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.getByText("Missing GitHub permissions")).toBeInTheDocument();
  });

  it("renders default message", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(
      screen.getByText(
        "The GitHub App needs additional permissions to perform this action."
      )
    ).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(
      <GitHubPermissionErrorAlert
        {...defaultProps}
        message="Custom message"
        title="Custom Title"
      />
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });

  it("shows resync prompt text", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.getByText(/resync your connection/)).toBeInTheDocument();
  });

  it("renders resync button", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.getByText("Resync GitHub Connection")).toBeInTheDocument();
  });

  it("calls onResync when resync button clicked", async () => {
    const onResync = vi.fn();
    const user = userEvent.setup();
    render(<GitHubPermissionErrorAlert onResync={onResync} />);
    await user.click(screen.getByText("Resync GitHub Connection"));
    expect(onResync).toHaveBeenCalled();
  });

  it("shows dismiss button when onDismiss provided", () => {
    render(
      <GitHubPermissionErrorAlert {...defaultProps} onDismiss={vi.fn()} />
    );
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("does not show dismiss button when onDismiss not provided", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.queryByText("Dismiss")).toBeNull();
    expect(screen.queryByTestId("alert-action")).toBeNull();
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <GitHubPermissionErrorAlert {...defaultProps} onDismiss={onDismiss} />
    );
    await user.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders with destructive variant", () => {
    render(<GitHubPermissionErrorAlert {...defaultProps} />);
    expect(screen.getByTestId("alert")).toHaveAttribute(
      "data-variant",
      "destructive"
    );
  });
});
