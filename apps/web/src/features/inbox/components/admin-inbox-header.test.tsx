import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    render: Render,
  }: {
    children?: React.ReactNode;
    render?:
      | React.ReactNode
      | ((props: Record<string, unknown>) => React.ReactNode);
  }) => {
    if (typeof Render === "function") {
      return Render({});
    }
    return <div>{children}</div>;
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    checked?: boolean;
    onCheckedChange?: () => void;
  }) => (
    <button data-checked={checked} onClick={onCheckedChange} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H1: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <h1>{children}</h1>
  ),
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@phosphor-icons/react", () => ({
  Funnel: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="funnel-icon" />
  ),
}));

import { AdminInboxHeader } from "./admin-inbox-header";

afterEach(cleanup);

describe("AdminInboxHeader", () => {
  it("renders the title", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]} />
    );
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]} />
    );
    expect(
      screen.getByText("Manage support conversations from your users")
    ).toBeInTheDocument();
  });

  it("renders Filter button", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]} />
    );
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("shows filter count badge when filters are active", () => {
    render(
      <AdminInboxHeader
        onToggleStatusFilter={vi.fn()}
        statusFilter={["open", "closed"]}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show filter count when no filters", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]} />
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders all status filter options", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]} />
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Reply")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <AdminInboxHeader onToggleStatusFilter={vi.fn()} statusFilter={[]}>
        <span data-testid="child-element">Extra button</span>
      </AdminInboxHeader>
    );
    expect(screen.getByTestId("child-element")).toBeInTheDocument();
  });

  it("calls onToggleStatusFilter when a filter option is clicked", async () => {
    const onToggleStatusFilter = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminInboxHeader
        onToggleStatusFilter={onToggleStatusFilter}
        statusFilter={[]}
      />
    );
    await user.click(screen.getByText("Open"));
    expect(onToggleStatusFilter).toHaveBeenCalled();
  });
});
