/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/convex-helpers", () => ({
  toId: (_table: string, id: string) => id,
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagSwatchClass: (color: string) => `swatch-${color}`,
}));

let capturedOnValueChange: ((value: string) => void) | undefined;

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
  }: {
    children?: React.ReactNode;
    render?: React.ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuRadioGroup: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => {
    capturedOnValueChange = onValueChange;
    return <div>{children}</div>;
  },
  DropdownMenuRadioItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button onClick={() => capturedOnValueChange?.(value)} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
    color?: string;
  }) => <span>{children}</span>,
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretDown: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { StatusDisplay } from "./status-display";

const statuses = [
  { _id: "s1" as Id<"organizationStatuses">, name: "Open", color: "blue" },
  {
    _id: "s2" as Id<"organizationStatuses">,
    name: "In Progress",
    color: "yellow",
  },
  { _id: "s3" as Id<"organizationStatuses">, name: "Done", color: "green" },
];

describe("StatusDisplay", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when not admin and no current status", () => {
    const { container } = render(
      <StatusDisplay
        currentStatus={undefined}
        isAdmin={false}
        onStatusChange={vi.fn()}
        organizationStatuses={undefined}
        statusId={null}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders badge for non-admin with current status", () => {
    render(
      <StatusDisplay
        currentStatus={statuses[0]}
        isAdmin={false}
        onStatusChange={vi.fn()}
        organizationStatuses={undefined}
        statusId="s1"
      />
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders dropdown for admin with statuses", () => {
    render(
      <StatusDisplay
        currentStatus={statuses[1]}
        isAdmin
        onStatusChange={vi.fn()}
        organizationStatuses={statuses}
        statusId="s2"
      />
    );
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Status placeholder for admin with no current status", () => {
    render(
      <StatusDisplay
        currentStatus={undefined}
        isAdmin
        onStatusChange={vi.fn()}
        organizationStatuses={statuses}
        statusId={null}
      />
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("calls onStatusChange when a status radio item is clicked", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StatusDisplay
        currentStatus={statuses[0]}
        isAdmin
        onStatusChange={onStatusChange}
        organizationStatuses={statuses}
        statusId="s1"
      />
    );
    await user.click(screen.getByText("Done"));
    expect(onStatusChange).toHaveBeenCalledWith("s3");
  });
});
