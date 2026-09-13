import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-sync" />
  ),
  Bug: () => <span data-testid="icon-bug" />,
  Spinner: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-spinner" />
  ),
}));

vi.mock("@ctrl-ui/react/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/select", () => ({
  Select: ({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
      value={value}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
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

import { IssuesSyncSection } from "./issues-sync-card";

const defaultProps = {
  autoSync: false,
  importedCount: 0,
  isAdmin: true,
  isEnabled: false,
  isSyncing: false,
  mappingsCount: 0,
  onPromoteTriggerChange: vi.fn(),
  onSyncNow: vi.fn(),
  onToggleSync: vi.fn(),
  promoteTrigger: "manual" as const,
  syncedIssuesCount: 0,
};

describe("IssuesSyncSection", () => {
  it("renders enable sync switch", () => {
    render(<IssuesSyncSection {...defaultProps} />);
    expect(screen.getByTestId("switch-issues-sync")).toBeInTheDocument();
  });

  it("calls onToggleSync when switch toggled", async () => {
    const onToggleSync = vi.fn();
    const user = userEvent.setup();
    render(<IssuesSyncSection {...defaultProps} onToggleSync={onToggleSync} />);
    await user.click(screen.getByTestId("switch-issues-sync"));
    expect(onToggleSync).toHaveBeenCalledWith(true, false);
  });

  it("shows stats when enabled", () => {
    render(
      <IssuesSyncSection
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
    render(<IssuesSyncSection {...defaultProps} isEnabled={false} />);
    expect(screen.queryByText("Issues synced")).toBeNull();
  });

  it("shows auto-import switch when enabled", () => {
    render(<IssuesSyncSection {...defaultProps} isEnabled />);
    expect(screen.getByTestId("switch-auto-import-issues")).toBeInTheDocument();
  });

  it("calls onToggleSync when auto-import switch toggled", async () => {
    const onToggleSync = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncSection
        {...defaultProps}
        isEnabled
        onToggleSync={onToggleSync}
      />
    );
    await user.click(screen.getByTestId("switch-auto-import-issues"));
    expect(onToggleSync).toHaveBeenCalledWith(true, true);
  });

  it("shows Sync Issues Now button for admin when enabled", () => {
    render(<IssuesSyncSection {...defaultProps} isEnabled />);
    expect(screen.getByText("Sync Issues Now")).toBeInTheDocument();
  });

  it("hides Sync Issues Now button for non-admin", () => {
    render(<IssuesSyncSection {...defaultProps} isAdmin={false} isEnabled />);
    expect(screen.queryByText("Sync Issues Now")).toBeNull();
  });

  it("calls onSyncNow when sync button clicked", async () => {
    const onSyncNow = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncSection {...defaultProps} isEnabled onSyncNow={onSyncNow} />
    );
    await user.click(screen.getByText("Sync Issues Now"));
    expect(onSyncNow).toHaveBeenCalled();
  });

  it("disables sync button when syncing", () => {
    render(<IssuesSyncSection {...defaultProps} isEnabled isSyncing />);
    const btn = screen.getByText("Sync Issues Now").closest("button");
    expect(btn).toBeDisabled();
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  it("shows last synced time", () => {
    const lastSyncAt = Date.now();
    render(
      <IssuesSyncSection {...defaultProps} isEnabled lastSyncAt={lastSyncAt} />
    );
    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("shows error badge when lastSyncStatus is error", () => {
    render(
      <IssuesSyncSection {...defaultProps} isEnabled lastSyncStatus="error" />
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("disables switch for non-admin", () => {
    render(<IssuesSyncSection {...defaultProps} isAdmin={false} />);
    expect(screen.getByTestId("switch-issues-sync")).toBeDisabled();
  });
});

describe("IssuesSyncSection promote trigger", () => {
  it("switching to on_status sends the default status", async () => {
    const onPromoteTriggerChange = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncSection
        {...defaultProps}
        onPromoteTriggerChange={onPromoteTriggerChange}
      />
    );

    await user.selectOptions(screen.getByRole("combobox"), "on_status");

    expect(onPromoteTriggerChange).toHaveBeenCalledWith("on_status", "planned");
  });

  it("shows the status picker only for on_status and forwards its value", async () => {
    const onPromoteTriggerChange = vi.fn();
    const user = userEvent.setup();
    render(
      <IssuesSyncSection
        {...defaultProps}
        onPromoteTriggerChange={onPromoteTriggerChange}
        promoteStatus="planned"
        promoteTrigger="on_status"
      />
    );

    const [, statusSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(statusSelect, "in_progress");

    expect(onPromoteTriggerChange).toHaveBeenCalledWith(
      "on_status",
      "in_progress"
    );
  });

  it("hides the status picker for manual", () => {
    render(<IssuesSyncSection {...defaultProps} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });
});
