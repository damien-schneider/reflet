import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCancelInvitation = vi.fn();
const mockResendInvitation = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "invitations:cancel") {
      return mockCancelInvitation;
    }
    if (ref === "invitations:resend") {
      return mockResendInvitation;
    }
    return vi.fn();
  },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    invitations: {
      cancel: "invitations:cancel",
      resend: "invitations:resend",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowClockwise: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-refresh" />
  ),
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-check" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

import { InvitationList } from "./invitation-list";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeInvitation = (
  overrides: Partial<{
    _id: string;
    _creationTime: number;
    email: string;
    role: "owner" | "admin" | "member";
    lastSentAt: number;
  }> = {}
) => ({
  _id: overrides._id ?? ("inv1" as never),
  _creationTime: overrides._creationTime ?? Date.now() - 120_000,
  email: overrides.email ?? "invite@example.com",
  role: overrides.role ?? ("member" as const),
  lastSentAt: overrides.lastSentAt,
});

describe("InvitationList", () => {
  it("returns null when invitations is undefined", () => {
    const { container } = render(<InvitationList invitations={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when invitations is empty", () => {
    const { container } = render(<InvitationList invitations={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders invitation email and role", () => {
    render(<InvitationList invitations={[makeInvitation()]} />);
    expect(screen.getByText("invite@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Invited as member/)).toBeInTheDocument();
  });

  it("renders Cancel button", () => {
    render(<InvitationList invitations={[makeInvitation()]} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls cancelInvitation when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<InvitationList invitations={[makeInvitation({ _id: "inv1" })]} />);
    await user.click(screen.getByText("Cancel"));
    expect(mockCancelInvitation).toHaveBeenCalledWith({
      invitationId: "inv1",
    });
  });

  it("shows Resend button when cooldown has passed", () => {
    const invitation = makeInvitation({
      _creationTime: Date.now() - 120_000,
    });
    render(<InvitationList invitations={[invitation]} />);
    expect(screen.getByText("Resend")).toBeInTheDocument();
  });

  it("shows cooldown text when within cooldown period", () => {
    const invitation = makeInvitation({
      _creationTime: Date.now() - 10_000,
      lastSentAt: Date.now() - 10_000,
    });
    render(<InvitationList invitations={[invitation]} />);
    expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
  });

  it("calls resendInvitation on Resend click", async () => {
    const user = userEvent.setup();
    const invitation = makeInvitation({
      _id: "inv1",
      _creationTime: Date.now() - 120_000,
    });
    render(<InvitationList invitations={[invitation]} />);
    await user.click(screen.getByText("Resend"));
    expect(mockResendInvitation).toHaveBeenCalledWith({
      invitationId: "inv1",
    });
  });

  it("renders multiple invitations", () => {
    const invitations = [
      makeInvitation({
        _id: "inv1" as never,
        email: "a@test.com",
        _creationTime: Date.now() - 120_000,
      }),
      makeInvitation({
        _id: "inv2" as never,
        email: "b@test.com",
        _creationTime: Date.now() - 120_000,
      }),
    ];
    render(<InvitationList invitations={invitations} />);
    expect(screen.getByText("a@test.com")).toBeInTheDocument();
    expect(screen.getByText("b@test.com")).toBeInTheDocument();
  });
});
