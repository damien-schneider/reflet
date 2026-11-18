import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@ctrl-ui/react/ui/spinner", () => ({
  Spinner: () => <span data-testid="icon-spinner" />,
}));

vi.mock("@ctrl-ui/react/ui/alert", () => ({
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

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
  }) => (
    <button
      aria-checked={checked}
      data-testid={`switch-${id}`}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    />
  ),
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
      <span>{message}</span>
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

import { SyncSettingsSection } from "./sync-settings-card";

const defaultProps = {
  autoSyncEnabled: false,
  isAdmin: true,
  isSyncing: false,
  onSyncNow: vi.fn(),
  onToggleAutoSync: vi.fn(),
};

describe("SyncSettingsSection", () => {
  it("calls onToggleAutoSync when switch is toggled", async () => {
    const onToggleAutoSync = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncSettingsSection
        {...defaultProps}
        onToggleAutoSync={onToggleAutoSync}
      />
    );
    await user.click(screen.getByTestId("switch-auto-sync"));
    expect(onToggleAutoSync).toHaveBeenCalledWith(true);
  });

  it("shows Sync now button for admin", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByText("Sync now")).toBeInTheDocument();
  });

  it("hides Sync now button for non-admin", () => {
    render(<SyncSettingsSection {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText("Sync now")).toBeNull();
  });

  it("disables Sync now button when syncing", () => {
    render(<SyncSettingsSection {...defaultProps} isSyncing />);
    expect(screen.getByText("Sync now").closest("button")).toBeDisabled();
  });

  it("shows last synced time when provided", () => {
    const lastSyncAt = new Date("2025-01-15T10:30:00Z").getTime();
    render(<SyncSettingsSection {...defaultProps} lastSyncAt={lastSyncAt} />);
    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("does not show last synced time when not provided", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.queryByText(/Last synced/)).toBeNull();
  });

  it("shows spinner when setting up", () => {
    render(<SyncSettingsSection {...defaultProps} isSettingUp />);
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("disables switch when not admin", () => {
    render(<SyncSettingsSection {...defaultProps} isAdmin={false} />);
    expect(screen.getByTestId("switch-auto-sync")).toBeDisabled();
  });

  it("shows permission error alert for GITHUB_PERMISSION_DENIED", () => {
    const onResyncGitHub = vi.fn();
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "GITHUB_PERMISSION_DENIED", message: "Denied" }}
        onResyncGitHub={onResyncGitHub}
      />
    );
    expect(screen.getByTestId("permission-error-alert")).toBeInTheDocument();
    expect(screen.getByText("Unable to turn on auto-sync")).toBeInTheDocument();
  });

  it("shows localhost error with additional message", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{
          code: "LOCALHOST_NOT_SUPPORTED",
          message: "Cannot use localhost",
        }}
      />
    );
    expect(screen.getByText("Cannot use localhost")).toBeInTheDocument();
    expect(screen.getByText(/tunneling service/)).toBeInTheDocument();
  });

  it("shows generic error with dismiss button", async () => {
    const onClearError = vi.fn();
    const _user = userEvent.setup();
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "UNKNOWN", message: "Something went wrong" }}
        onClearError={onClearError}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("does not render error section when no error", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.queryByTestId("alert")).toBeNull();
    expect(screen.queryByTestId("permission-error-alert")).toBeNull();
  });

  it("shows syncing spinner inside the Sync now button", () => {
    render(<SyncSettingsSection {...defaultProps} isSyncing />);
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("disables switch when isSettingUp", () => {
    render(<SyncSettingsSection {...defaultProps} isSettingUp />);
    expect(screen.getByTestId("switch-auto-sync")).toBeDisabled();
  });

  it("shows last synced text for non-admin", () => {
    const syncDate = new Date("2024-01-15T10:30:00").getTime();
    render(
      <SyncSettingsSection
        {...defaultProps}
        isAdmin={false}
        lastSyncAt={syncDate}
      />
    );
    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("hides dismiss button when onClearError not provided for generic error", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "UNKNOWN", message: "Something went wrong" }}
        onClearError={undefined}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });

  it("switch reflects autoSyncEnabled prop", () => {
    render(<SyncSettingsSection {...defaultProps} autoSyncEnabled={true} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("switch reflects autoSyncEnabled=false", () => {
    render(<SyncSettingsSection {...defaultProps} autoSyncEnabled={false} />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("falls through to generic alert when permission error but no onResyncGitHub", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "GITHUB_PERMISSION_DENIED", message: "Denied" }}
      />
    );
    expect(
      screen.queryByTestId("permission-error-alert")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("alert")).toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  it("does not show spinner when not setting up", () => {
    render(<SyncSettingsSection {...defaultProps} isSettingUp={false} />);
    expect(screen.queryByTestId("icon-spinner")).not.toBeInTheDocument();
  });

  it("localhost error does not show tunneling hint for non-localhost codes", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "UNKNOWN", message: "Generic error" }}
      />
    );
    expect(screen.queryByText(/tunneling service/)).not.toBeInTheDocument();
  });
});
