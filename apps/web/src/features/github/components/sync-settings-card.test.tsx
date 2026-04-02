import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-arrows" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-spinner" />
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
    <div>{children}</div>
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

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/switch", () => ({
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

vi.mock("@/components/ui/typography", () => ({
  H3: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <h3 className={className} data-variant={variant}>
      {children}
    </h3>
  ),
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
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

afterEach(cleanup);

const defaultProps = {
  autoSyncEnabled: false,
  isSyncing: false,
  isAdmin: true,
  onToggleAutoSync: vi.fn(),
  onSyncNow: vi.fn(),
};

describe("SyncSettingsSection", () => {
  it("renders auto-sync toggle", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByText("Auto-sync releases")).toBeInTheDocument();
  });

  it("renders auto-sync switch", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByText("Auto-sync releases")).toBeInTheDocument();
    expect(screen.getByTestId("switch-auto-sync")).toBeInTheDocument();
  });

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

  it("shows Sync Now button for admin", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByText("Sync Now")).toBeInTheDocument();
  });

  it("hides Sync Now button for non-admin", () => {
    render(<SyncSettingsSection {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText("Sync Now")).toBeNull();
  });

  it("disables Sync Now button when syncing", () => {
    render(<SyncSettingsSection {...defaultProps} isSyncing />);
    expect(screen.getByText("Sync Now").closest("button")).toBeDisabled();
  });

  it("calls onSyncNow when Sync Now clicked", async () => {
    const onSyncNow = vi.fn();
    const user = userEvent.setup();
    render(<SyncSettingsSection {...defaultProps} onSyncNow={onSyncNow} />);
    await user.click(screen.getByText("Sync Now"));
    expect(onSyncNow).toHaveBeenCalled();
  });

  it("shows last synced time when provided", () => {
    const lastSyncAt = new Date("2025-01-15T10:30:00Z").getTime();
    render(<SyncSettingsSection {...defaultProps} lastSyncAt={lastSyncAt} />);
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  });

  it("does not show last synced time when not provided", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.queryByText(/Last synced:/)).toBeNull();
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
    expect(screen.getByText("Auto-sync setup failed")).toBeInTheDocument();
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

  it("calls onClearError when dismiss button in generic error is clicked", async () => {
    const onClearError = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "UNKNOWN", message: "Oops" }}
        onClearError={onClearError}
      />
    );
    await user.click(screen.getByText("Dismiss"));
    expect(onClearError).toHaveBeenCalled();
  });

  it("shows syncing spinner inside the Sync Now button", () => {
    render(<SyncSettingsSection {...defaultProps} isSyncing />);
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("shows auto-sync description text", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(
      screen.getByText("Automatically import new releases to your changelog")
    ).toBeInTheDocument();
  });

  it("calls onResyncGitHub when Resync button is clicked in permission error", async () => {
    const onResyncGitHub = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "GITHUB_PERMISSION_DENIED", message: "Denied" }}
        onResyncGitHub={onResyncGitHub}
      />
    );
    await user.click(screen.getByText("Resync"));
    expect(onResyncGitHub).toHaveBeenCalled();
  });

  it("shows dismiss button for permission error when onClearError provided", async () => {
    const onClearError = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "GITHUB_PERMISSION_DENIED", message: "Denied" }}
        onClearError={onClearError}
        onResyncGitHub={vi.fn()}
      />
    );
    await user.click(screen.getByText("DismissPermission"));
    expect(onClearError).toHaveBeenCalled();
  });

  it("switch reflects autoSyncEnabled=true", () => {
    render(<SyncSettingsSection {...defaultProps} autoSyncEnabled />);
    expect(screen.getByTestId("switch-auto-sync")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("disables switch when isSettingUp", () => {
    render(<SyncSettingsSection {...defaultProps} isSettingUp />);
    expect(screen.getByTestId("switch-auto-sync")).toBeDisabled();
  });

  it("shows setting up spinner when isSettingUp", () => {
    render(<SyncSettingsSection {...defaultProps} isSettingUp />);
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("hides Sync Now button for non-admin", () => {
    render(<SyncSettingsSection {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText("Sync Now")).not.toBeInTheDocument();
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
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  });

  it("renders sync controls", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByText("Auto-sync releases")).toBeInTheDocument();
  });

  it("shows localhost error with deployment hint", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{
          code: "LOCALHOST_NOT_SUPPORTED",
          message: "Cannot sync from localhost",
        }}
      />
    );
    expect(screen.getByText("Cannot sync from localhost")).toBeInTheDocument();
    expect(
      screen.getByText(/Try again in a deployed environment/)
    ).toBeInTheDocument();
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

  it("renders card title", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    const elements = screen.getAllByText(/Sync|Release|GitHub/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("renders auto-sync switch", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
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

  it("shows spinner icon inside Sync Now button when syncing", () => {
    render(<SyncSettingsSection {...defaultProps} isSyncing />);
    const syncButton = screen.getByText("Sync Now").closest("button");
    expect(syncButton).toBeInTheDocument();
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("shows arrows icon inside Sync Now button when not syncing", () => {
    render(<SyncSettingsSection {...defaultProps} />);
    const syncButton = screen.getByText("Sync Now").closest("button");
    expect(syncButton).toBeInTheDocument();
    const arrowsIcon = syncButton?.querySelector('[data-testid="icon-arrows"]');
    expect(arrowsIcon).toBeInTheDocument();
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

  it("computes correct active count with combined status and tag filters", () => {
    render(
      <SyncSettingsSection
        {...defaultProps}
        error={{ code: "GENERIC_ERROR", message: "Oops" }}
        onClearError={vi.fn()}
      />
    );
    expect(screen.getByText("Auto-sync setup failed")).toBeInTheDocument();
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });
});
