import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcceptInvitationContent } from "./accept-invitation-page";

const MEMBER_ROLE_PATTERN = /as a member/;
const EXPIRED_PATTERN = /^Invitation expired$/;
const ALREADY_MEMBER_PATTERN = /Already a member/i;
const ALREADY_ACCEPTED_PATTERN = /^Invitation already accepted$/;
const LOGIN_PROMPT_PATTERN = /Sign in.*to accept/i;
const ACCEPT_INVITATION_PATTERN = /Accept invitation/i;
const AUTH_FORM_TESTID = "auth-form";

const mockAcceptMutation = vi.fn();
const mockInvitationQuery = vi.fn();
const mockRememberOrganization = vi.fn();

vi.mock("@/features/organizations/hooks/use-active-organization", () => ({
  useRememberOrganization: () => mockRememberOrganization,
}));

vi.mock("convex/react", () => ({
  useMutation: () => mockAcceptMutation,
  useQuery: () => mockInvitationQuery(),
}));

const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

vi.mock("@/features/auth/components/unified-auth/unified-auth-form", () => ({
  default: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid={AUTH_FORM_TESTID}>
      <button data-testid="mock-auth-submit" onClick={onSuccess} type="button">
        Mock Sign In
      </button>
    </div>
  ),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: {
      invitation_actions: {
        accept: "invitation_actions.accept",
      },
      invitations: {
        getByToken: "invitations.getByToken",
      },
    },
  },
}));

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@ctrl-ui/react/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button
      data-testid={`button-${variant ?? "quiet"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

const createAuthenticatedSession = () => ({
  data: { user: { email: "test@example.com", id: "user-123" } },
  isPending: false,
});

const createUnauthenticatedSession = () => ({
  data: null,
  isPending: false,
});

describe("AcceptInvitationContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcceptMutation.mockReset();
    mockInvitationQuery.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue(createAuthenticatedSession());
  });

  it("renders loading state while fetching invitation", () => {
    mockInvitationQuery.mockReturnValue(undefined);

    render(<AcceptInvitationContent token="test-token" />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders error state for invalid token", () => {
    mockInvitationQuery.mockReturnValue(null);

    render(<AcceptInvitationContent token="invalid-token" />);

    expect(screen.getByText("Invalid invitation")).toBeInTheDocument();
  });

  it("renders invitation details when valid", () => {
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() + 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
    });

    render(<AcceptInvitationContent token="valid-token" />);

    expect(screen.getByRole("heading")).toHaveTextContent("Acme Corp");
    expect(screen.getByText(MEMBER_ROLE_PATTERN)).toBeInTheDocument();
  });

  it("renders expired state for expired invitation", () => {
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() - 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
    });

    render(<AcceptInvitationContent token="expired-token" />);

    expect(screen.getByText(EXPIRED_PATTERN)).toBeInTheDocument();
  });

  it("calls accept mutation when accept button is clicked", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() + 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
    });
    mockAcceptMutation.mockResolvedValue("org-id-123");

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-solid");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockAcceptMutation).toHaveBeenCalledWith({ token: "valid-token" });
    });
  });

  it("redirects to organization dashboard on successful accept", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() + 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
    });
    mockAcceptMutation.mockResolvedValue("org-id-123");

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-solid");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRememberOrganization).toHaveBeenCalledWith("org-id-123");
  });

  it("shows error message when accept fails", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() + 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
    });
    mockAcceptMutation.mockRejectedValue(new Error("Already a member"));

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-solid");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(ALREADY_MEMBER_PATTERN)).toBeInTheDocument();
    });
  });

  it("renders already accepted state", () => {
    mockInvitationQuery.mockReturnValue({
      expiresAt: Date.now() + 86_400_000,
      organizationName: "Acme Corp",
      role: "member",
      status: "accepted",
    });

    render(<AcceptInvitationContent token="accepted-token" />);

    expect(screen.getByText(ALREADY_ACCEPTED_PATTERN)).toBeInTheDocument();
  });

  describe("authentication awareness", () => {
    it("shows auth form when user is not authenticated", () => {
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        expiresAt: Date.now() + 86_400_000,
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
      });

      render(<AcceptInvitationContent token="valid-token" />);

      expect(screen.getByTestId(AUTH_FORM_TESTID)).toBeInTheDocument();
      expect(screen.getByText(LOGIN_PROMPT_PATTERN)).toBeInTheDocument();
      expect(
        screen.queryByText(ACCEPT_INVITATION_PATTERN)
      ).not.toBeInTheDocument();
    });

    it("shows accept button when user is authenticated", () => {
      mockUseSession.mockReturnValue(createAuthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        expiresAt: Date.now() + 86_400_000,
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
      });

      render(<AcceptInvitationContent token="valid-token" />);

      expect(screen.getByText(ACCEPT_INVITATION_PATTERN)).toBeInTheDocument();
      expect(screen.queryByTestId(AUTH_FORM_TESTID)).not.toBeInTheDocument();
    });

    it("does NOT auto-accept invitation after authentication - user must click accept", () => {
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        expiresAt: Date.now() + 86_400_000,
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
      });
      mockAcceptMutation.mockResolvedValue("org-id-123");

      const { rerender } = render(
        <AcceptInvitationContent token="valid-token" />
      );

      expect(screen.getByTestId(AUTH_FORM_TESTID)).toBeInTheDocument();

      mockUseSession.mockReturnValue(createAuthenticatedSession());

      rerender(<AcceptInvitationContent token="valid-token" />);

      expect(mockAcceptMutation).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();

      expect(screen.getByText(ACCEPT_INVITATION_PATTERN)).toBeInTheDocument();
    });

    it("shows invitation details even when not authenticated", () => {
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        expiresAt: Date.now() + 86_400_000,
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
      });

      render(<AcceptInvitationContent token="valid-token" />);

      expect(screen.getByRole("heading")).toHaveTextContent("Acme Corp");
      expect(screen.getByText(MEMBER_ROLE_PATTERN)).toBeInTheDocument();
    });
  });
});
