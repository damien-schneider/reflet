import { PendingInvitationsList } from "@app/(app)/pending-invitations/pending-invitations-list";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invitation = vi.hoisted(() => ({
  _id: "invitation1",
  organizationLogo: null,
  organizationName: "Acme",
  role: "member",
  token: "token1",
}));
const queries = vi.hoisted(() => ({ invitations: [invitation] }));
const acceptInvitation = vi.hoisted(() => vi.fn());
const rememberOrganization = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("convex/react", () => ({
  useMutation: () => acceptInvitation,
  useQuery: () => queries.invitations,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/organizations/hooks/use-active-organization", () => ({
  useRememberOrganization: () => rememberOrganization,
}));
vi.mock("@/features/auth/components/auth-page-shell", () => ({
  AuthPageShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  queries.invitations = [invitation];
  acceptInvitation.mockResolvedValue("org1");
});

describe("Joining organizations", () => {
  it("selects the joined organization before opening the dashboard", async () => {
    render(<PendingInvitationsList />);
    await userEvent.click(
      screen.getByRole("button", { name: "Accept invitation" })
    );

    expect(rememberOrganization).toHaveBeenCalledWith("org1");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("allows the next invitation to be accepted after a successful join", async () => {
    queries.invitations = [
      invitation,
      {
        ...invitation,
        _id: "invitation2",
        organizationName: "Beta",
        token: "token2",
      },
    ];
    render(<PendingInvitationsList />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Accept invitation" })[0]
    );

    for (const button of screen.getAllByRole("button", {
      name: "Accept invitation",
    })) {
      expect(button).toBeEnabled();
    }
    expect(push).not.toHaveBeenCalled();
  });
});
