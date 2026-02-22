import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarImage: ({ src }: { src?: string }) => <img alt="" src={src} />,
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    render: Render,
    disabled,
  }: {
    children?: React.ReactNode;
    render?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <div data-disabled={disabled}>
      {Render}
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick} type="button">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretDown: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-icon" />
  ),
  UserCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-circle-icon" />
  ),
}));

import { AssignMemberDropdown } from "./assign-member-dropdown";

afterEach(cleanup);

const members = [
  { id: "m1", name: "Alice Smith", email: "alice@test.com", image: undefined },
  { id: "m2", name: "Bob Jones", email: "bob@test.com", image: undefined },
  { id: "m3", email: "carol@test.com", image: undefined },
];

describe("AssignMemberDropdown", () => {
  it("shows Unassigned when no one is assigned", () => {
    render(<AssignMemberDropdown members={members} onAssign={vi.fn()} />);
    const matches = screen.getAllByText("Unassigned");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows assigned member name", () => {
    render(
      <AssignMemberDropdown
        assignedTo="m1"
        members={members}
        onAssign={vi.fn()}
      />
    );
    const matches = screen.getAllByText("Alice Smith");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows member email as fallback when no name", () => {
    render(
      <AssignMemberDropdown
        assignedTo="m3"
        members={members}
        onAssign={vi.fn()}
      />
    );
    const matches = screen.getAllByText("carol@test.com");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders initials for assigned member", () => {
    render(
      <AssignMemberDropdown
        assignedTo="m1"
        members={members}
        onAssign={vi.fn()}
      />
    );
    const matches = screen.getAllByText("AS");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Unassigned option", () => {
    render(<AssignMemberDropdown members={members} onAssign={vi.fn()} />);
    // The Unassigned option in the dropdown
    const unassignedButtons = screen.getAllByText("Unassigned");
    expect(unassignedButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all members in dropdown", () => {
    render(<AssignMemberDropdown members={members} onAssign={vi.fn()} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("carol@test.com")).toBeInTheDocument();
  });

  it("calls onAssign when a member is clicked", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    render(<AssignMemberDropdown members={members} onAssign={onAssign} />);

    await user.click(screen.getByText("Bob Jones"));
    expect(onAssign).toHaveBeenCalledWith("m2");
  });

  it("calls onAssign with undefined when Unassigned is clicked", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    render(
      <AssignMemberDropdown
        assignedTo="m1"
        members={members}
        onAssign={onAssign}
      />
    );

    // Get the Unassigned button in the dropdown (not the trigger)
    const unassignedButtons = screen.getAllByText("Unassigned");
    await user.click(unassignedButtons.at(-1));
    expect(onAssign).toHaveBeenCalledWith(undefined);
  });

  it("shows No team members when members array is empty", () => {
    render(<AssignMemberDropdown members={[]} onAssign={vi.fn()} />);
    expect(screen.getByText("No team members")).toBeInTheDocument();
  });

  it("shows email sub-text for members with names", () => {
    render(<AssignMemberDropdown members={members} onAssign={vi.fn()} />);
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });
});
