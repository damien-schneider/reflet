import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-check" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-spinner" />
  ),
  Warning: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-warning" />
  ),
  WebhooksLogo: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-webhooks" />
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
    <div>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <h4>{children}</h4>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Text: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("./github-permission-error-alert", () => ({
  GitHubPermissionErrorAlert: ({
    title,
    message,
    onResync,
    onDismiss,
  }: {
    title: string;
    message: string;
    onResync: () => void;
    onDismiss?: () => void;
  }) => (
    <div data-testid="permission-error-alert">
      <span>{title}</span>
      <button onClick={onResync} type="button">
        Resync
      </button>
      {onDismiss ? (
        <button onClick={onDismiss} type="button">
          DismissPermission
        </button>
      ) : null}
    </div>
  ),
}));

import { WebhookSetupCard } from "./webhook-setup-card";

afterEach(cleanup);

const defaultProps = {
  hasWebhook: false,
  isSettingUp: false,
  isAdmin: true,
  onSetup: vi.fn(),
};

describe("WebhookSetupCard", () => {
  it("renders title", () => {
    render(<WebhookSetupCard {...defaultProps} />);
    expect(screen.getByText("Webhook Setup")).toBeInTheDocument();
  });

  it("shows setup button for admin when no webhook", () => {
    render(<WebhookSetupCard {...defaultProps} />);
    expect(screen.getByText("Setup Webhook")).toBeInTheDocument();
  });

  it("calls onSetup when setup button clicked", async () => {
    const onSetup = vi.fn();
    const user = userEvent.setup();
    render(<WebhookSetupCard {...defaultProps} onSetup={onSetup} />);
    await user.click(screen.getByText("Setup Webhook"));
    expect(onSetup).toHaveBeenCalled();
  });

  it("disables setup button when setting up", () => {
    render(<WebhookSetupCard {...defaultProps} isSettingUp />);
    expect(screen.getByText("Setup Webhook").closest("button")).toBeDisabled();
  });

  it("shows spinner when setting up", () => {
    render(<WebhookSetupCard {...defaultProps} isSettingUp />);
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("shows active badge when webhook exists", () => {
    render(<WebhookSetupCard {...defaultProps} hasWebhook />);
    expect(screen.getByText("Webhook Active")).toBeInTheDocument();
    expect(screen.queryByText("Setup Webhook")).toBeNull();
  });

  it("shows contact admin message for non-admin without webhook", () => {
    render(<WebhookSetupCard {...defaultProps} isAdmin={false} />);
    expect(
      screen.getByText("Contact an admin to setup the webhook.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Setup Webhook")).toBeNull();
  });

  it("shows description for active webhook", () => {
    render(<WebhookSetupCard {...defaultProps} hasWebhook />);
    expect(screen.getByText(/Webhook is active/)).toBeInTheDocument();
  });

  it("shows description for inactive webhook", () => {
    render(<WebhookSetupCard {...defaultProps} />);
    expect(screen.getByText(/Enable automatic syncing/)).toBeInTheDocument();
  });

  it("shows permission error alert", () => {
    const onResync = vi.fn();
    render(
      <WebhookSetupCard
        {...defaultProps}
        error={{ code: "GITHUB_PERMISSION_DENIED", message: "Denied" }}
        onResync={onResync}
      />
    );
    expect(screen.getByTestId("permission-error-alert")).toBeInTheDocument();
    expect(screen.getByText("Webhook setup failed")).toBeInTheDocument();
  });

  it("shows generic error with dismiss", () => {
    const onClearError = vi.fn();
    render(
      <WebhookSetupCard
        {...defaultProps}
        error={{ code: "UNKNOWN", message: "Network error" }}
        onClearError={onClearError}
      />
    );
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("does not render error when no error prop", () => {
    render(<WebhookSetupCard {...defaultProps} />);
    expect(screen.queryByTestId("alert")).toBeNull();
    expect(screen.queryByTestId("permission-error-alert")).toBeNull();
  });
});
