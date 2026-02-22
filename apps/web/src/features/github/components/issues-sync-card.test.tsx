import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-sync" />
  ),
  Bug: () => <span data-testid="icon-bug" />,
  Spinner: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-spinner" />
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
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
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { IssuesSyncCard } from "./issues-sync-card";

afterEach(cleanup);

const defaultProps = {
  isEnabled: false,
  autoSync: false,
  syncedIssuesCount: 0,
  importedCount: 0,
  mappingsCount: 0,
  isSyncing: false,
  isAdmin: true,
  onToggleSync: vi.fn(),
  onSyncNow: vi.fn(),
};

describe("IssuesSyncCard", () => {
  it("renders title", () => {
    render(<IssuesSyncCard {...defaultProps} />);
    expect(screen.getByText("Issue Sync")).toBeInTheDocument();
  });

  it("renders enable sync switch", () => {
    render(<IssuesSyncCard {...defaultProps} />);
    expect(screen.getByTestId("switch-issues-sync")).toBeInTheDocument();
  });

  it("calls onToggleSync when switch toggled", async () => {
    const onToggleSync = vi.fn();
    const user = userEvent.setup();
    render(<IssuesSyncCard {...defaultProps} onToggleSync={onToggleSync} />);
    await user.click(screen.getByTestId("switch-issues-sync"));
    expect(onToggleSync).toHaveBeenCalledWith(true, false);
  });

  it("shows stats when enabled", () => {
    render(
      <IssuesSyncCard
        {...defaultProps}
        importedCount={15}
        isEnabled
        mappingsCount={3}
        syncedIssuesCount={42}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides stats when disabled", () => {
    render(<IssuesSyncCard {...defaultProps} isEnabled={false} />);
    expect(screen.queryByText("Issues synced")).toBeNull();
  });

  it("shows auto-import switch when enabled", () => {
    render(<IssuesSyncCard {...defaultProps} isEnabled />);
    expect(screen.getByTestId("switch-auto-import-issues")).toBeInTheDocument();
  });

  it("calls onToggleSync when auto-import switch toggled", async () => {
    const onToggleSync = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncCard {...defaultProps} isEnabled onToggleSync={onToggleSync} />
    );
    await user.click(screen.getByTestId("switch-auto-import-issues"));
    expect(onToggleSync).toHaveBeenCalledWith(true, true);
  });

  it("shows Sync Issues Now button for admin when enabled", () => {
    render(<IssuesSyncCard {...defaultProps} isEnabled />);
    expect(screen.getByText("Sync Issues Now")).toBeInTheDocument();
  });

  it("hides Sync Issues Now button for non-admin", () => {
    render(<IssuesSyncCard {...defaultProps} isAdmin={false} isEnabled />);
    expect(screen.queryByText("Sync Issues Now")).toBeNull();
  });

  it("calls onSyncNow when sync button clicked", async () => {
    const onSyncNow = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncCard {...defaultProps} isEnabled onSyncNow={onSyncNow} />
    );
    await user.click(screen.getByText("Sync Issues Now"));
    expect(onSyncNow).toHaveBeenCalled();
  });

  it("disables sync button when syncing", () => {
    render(<IssuesSyncCard {...defaultProps} isEnabled isSyncing />);
    const btn = screen.getByText("Sync Issues Now").closest("button");
    expect(btn).toBeDisabled();
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("shows last synced time", () => {
    const lastSyncAt = Date.now();
    render(
      <IssuesSyncCard {...defaultProps} isEnabled lastSyncAt={lastSyncAt} />
    );
    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("shows error badge when lastSyncStatus is error", () => {
    render(
      <IssuesSyncCard {...defaultProps} isEnabled lastSyncStatus="error" />
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("disables switch for non-admin", () => {
    render(<IssuesSyncCard {...defaultProps} isAdmin={false} />);
    expect(screen.getByTestId("switch-issues-sync")).toBeDisabled();
  });
});
