import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateRole = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateRole,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: { members: { updateRole: "members:updateRole" } },
}));

vi.mock("@phosphor-icons/react", () => ({
  Crown: () => <span data-testid="icon-crown" />,
  Shield: () => <span data-testid="icon-shield" />,
  User: () => <span data-testid="icon-user" />,
  DotsThreeVertical: () => <span data-testid="icon-dots" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src }: { src?: string }) => (
    <img alt="" data-testid="avatar-image" src={src} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
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
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({
    render,
  }: {
    render: (props: Record<string, unknown>) => React.ReactNode;
  }) => <div data-testid="dropdown-trigger">{render({})}</div>,
}));

import { MemberList } from "./member-list";

afterEach(cleanup);

const makeMember = (
  overrides: Partial<{
    _id: string;
    role: "owner" | "admin" | "member";
    user: { name: string | null; email: string | null; image: string | null };
  }> = {}
) => ({
  _id: overrides._id ?? ("m1" as never),
  role: overrides.role ?? "member",
  user: overrides.user ?? {
    name: "John Doe",
    email: "john@example.com",
    image: "https://example.com/avatar.jpg",
  },
});

describe("MemberList", () => {
  it("renders without crash with undefined members", () => {
    render(
      <MemberList
        isOwner={false}
        members={undefined}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.queryByText("John Doe")).toBeNull();
  });

  it("renders empty list", () => {
    render(
      <MemberList isOwner={false} members={[]} onRemoveMember={vi.fn()} />
    );
    expect(screen.queryByText("John Doe")).toBeNull();
  });

  it("renders member name and email", () => {
    render(
      <MemberList
        isOwner={false}
        members={[makeMember()]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("renders initials from name", () => {
    render(
      <MemberList
        isOwner={false}
        members={[makeMember()]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("falls back to email when name is null", () => {
    const member = makeMember({
      user: { name: null, email: "jane@test.com", image: null },
    });
    render(
      <MemberList isOwner={false} members={[member]} onRemoveMember={vi.fn()} />
    );
    const elements = screen.getAllByText("jane@test.com");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to Unknown when name and email are null", () => {
    const member = makeMember({
      user: { name: null, email: null, image: null },
    });
    render(
      <MemberList isOwner={false} members={[member]} onRemoveMember={vi.fn()} />
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders role badge", () => {
    render(
      <MemberList
        isOwner={false}
        members={[makeMember({ role: "admin" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not show dropdown menu for non-owners", () => {
    render(
      <MemberList
        isOwner={false}
        members={[makeMember({ role: "member" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.queryByTestId("dropdown-menu")).toBeNull();
  });

  it("shows dropdown menu for owner viewing non-owner member", () => {
    render(
      <MemberList
        isOwner
        members={[makeMember({ role: "member" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
  });

  it("does not show dropdown for owner role members", () => {
    render(
      <MemberList
        isOwner
        members={[makeMember({ role: "owner" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.queryByTestId("dropdown-menu")).toBeNull();
  });

  it("shows Promote to admin for members", () => {
    render(
      <MemberList
        isOwner
        members={[makeMember({ role: "member" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByText("Promote to admin")).toBeInTheDocument();
  });

  it("shows Demote to member for admins", () => {
    render(
      <MemberList
        isOwner
        members={[makeMember({ role: "admin" })]}
        onRemoveMember={vi.fn()}
      />
    );
    expect(screen.getByText("Demote to member")).toBeInTheDocument();
  });

  it("calls onRemoveMember with correct params when Remove clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <MemberList
        isOwner
        members={[makeMember({ _id: "m1", role: "member" })]}
        onRemoveMember={onRemove}
      />
    );
    await user.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledWith("m1", "John Doe");
  });

  it("calls updateRole when promote/demote clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemberList
        isOwner
        members={[makeMember({ _id: "m1", role: "member" })]}
        onRemoveMember={vi.fn()}
      />
    );
    await user.click(screen.getByText("Promote to admin"));
    expect(mockUpdateRole).toHaveBeenCalledWith({
      memberId: "m1",
      role: "admin",
    });
  });

  it("renders multiple members", () => {
    const members = [
      makeMember({ _id: "m1" as never, role: "owner" }),
      makeMember({
        _id: "m2" as never,
        role: "member",
        user: { name: "Jane", email: "jane@test.com", image: null },
      }),
    ];
    render(<MemberList isOwner members={members} onRemoveMember={vi.fn()} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });
});
