import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  AvatarImage: ({ src }: { src?: string }) => <img alt="" src={src} />,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/dropdown-menu", () => {
  let changeRadioValue: (value: string) => void = () => undefined;
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    DropdownMenuRadioGroup: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (value: string) => void;
    }) => {
      changeRadioValue = onValueChange;
      return <div>{children}</div>;
    },
    DropdownMenuRadioItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => (
      <button onClick={() => changeRadioValue(value)} type="button">
        {children}
      </button>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({
      "aria-label": ariaLabel,
      children,
      render: Render,
      disabled,
    }: {
      "aria-label"?: string;
      children?: React.ReactNode;
      render?: React.ReactNode;
      disabled?: boolean;
    }) => (
      <fieldset aria-label={ariaLabel} data-disabled={disabled}>
        {Render}
        {children}
      </fieldset>
    ),
  };
});

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

const members = [
  { email: "alice@test.com", id: "m1", image: undefined, name: "Alice Smith" },
  { email: "bob@test.com", id: "m2", image: undefined, name: "Bob Jones" },
  { email: "carol@test.com", id: "m3", image: undefined },
];

describe("AssignMemberDropdown", () => {
  it("labels the trigger Unassigned when no one is assigned", () => {
    render(<AssignMemberDropdown members={members} onAssign={vi.fn()} />);
    expect(screen.getByLabelText("Assignee: Unassigned")).toBeInTheDocument();
  });

  it("labels the trigger with the assigned member's name", () => {
    render(
      <AssignMemberDropdown
        assignedTo="m1"
        members={members}
        onAssign={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Assignee: Alice Smith")).toBeInTheDocument();
  });

  it("falls back to the member's email when they have no name", () => {
    render(
      <AssignMemberDropdown
        assignedTo="m3"
        members={members}
        onAssign={vi.fn()}
      />
    );
    expect(
      screen.getByLabelText("Assignee: carol@test.com")
    ).toBeInTheDocument();
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
    const lastUnassigned = unassignedButtons.at(-1);
    await user.click(lastUnassigned);
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
