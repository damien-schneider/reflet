import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AcceptInvitationContent } from "./accept-invitation-page";

// Regex patterns used in tests
const MEMBRE_PATTERN = /membre/;
const EXPIRED_PATTERN = /expirée/i;
const ALREADY_MEMBER_PATTERN = /Already a member/i;
const ALREADY_ACCEPTED_PATTERN = /déjà acceptée/i;
const LOGIN_PROMPT_PATTERN = /Connectez-vous.*pour accepter/i;
const ACCEPT_INVITATION_PATTERN = /Accepter l'invitation/i;
const AUTH_FORM_TESTID = "auth-form";

// Mock the Convex hooks
const mockAcceptMutation = vi.fn();
const mockInvitationQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockAcceptMutation,
  useQuery: () => mockInvitationQuery(),
}));

// Mock auth client
const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

// Mock the UnifiedAuthForm component
vi.mock("@/features/auth/components/unified-auth-form", () => ({
  default: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid={AUTH_FORM_TESTID}>
      <button data-testid="mock-auth-submit" onClick={onSuccess} type="button">
        Mock Sign In
      </button>
    </div>
  ),
}));

vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    invitations: {
      getByToken: "invitations.getByToken",
      accept: "invitations.accept",
    },
  },
}));

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock("@/components/ui/button", () => ({
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
      data-testid={`button-${variant ?? "default"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H1: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Helper to create authenticated session
const createAuthenticatedSession = () => ({
  data: { user: { id: "user-123", email: "test@example.com" } },
  isPending: false,
});

// Helper to create unauthenticated session
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
    // Default to authenticated for backwards compatibility with existing tests
    mockUseSession.mockReturnValue(createAuthenticatedSession());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state while fetching invitation", () => {
    mockInvitationQuery.mockReturnValue(undefined);

    render(<AcceptInvitationContent token="test-token" />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders error state for invalid token", () => {
    mockInvitationQuery.mockReturnValue(null);

    render(<AcceptInvitationContent token="invalid-token" />);

    expect(screen.getByText("Invitation invalide")).toBeInTheDocument();
  });

  it("renders invitation details when valid", () => {
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
      expiresAt: Date.now() + 86_400_000, // 1 day from now
    });

    render(<AcceptInvitationContent token="valid-token" />);

    // Check that the heading contains the org name
    expect(screen.getByRole("heading")).toHaveTextContent("Acme Corp");
    // Check role text is present
    expect(screen.getByText(MEMBRE_PATTERN)).toBeInTheDocument();
  });

  it("renders expired state for expired invitation", () => {
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
      expiresAt: Date.now() - 86_400_000, // 1 day ago
    });

    render(<AcceptInvitationContent token="expired-token" />);

    expect(screen.getByText(EXPIRED_PATTERN)).toBeInTheDocument();
  });

  it("calls accept mutation when accept button is clicked", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
      expiresAt: Date.now() + 86_400_000,
    });
    mockAcceptMutation.mockResolvedValue("org-id-123");

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-default");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockAcceptMutation).toHaveBeenCalledWith({ token: "valid-token" });
    });
  });

  it("redirects to organization dashboard on successful accept", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
      expiresAt: Date.now() + 86_400_000,
    });
    mockAcceptMutation.mockResolvedValue("org-id-123");

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-default");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error message when accept fails", async () => {
    const user = userEvent.setup();
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "pending",
      expiresAt: Date.now() + 86_400_000,
    });
    mockAcceptMutation.mockRejectedValue(new Error("Already a member"));

    render(<AcceptInvitationContent token="valid-token" />);

    const acceptButton = screen.getByTestId("button-default");
    await user.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(ALREADY_MEMBER_PATTERN)).toBeInTheDocument();
    });
  });

  it("renders already accepted state", () => {
    mockInvitationQuery.mockReturnValue({
      organizationName: "Acme Corp",
      role: "member",
      status: "accepted",
      expiresAt: Date.now() + 86_400_000,
    });

    render(<AcceptInvitationContent token="accepted-token" />);

    expect(screen.getByText(ALREADY_ACCEPTED_PATTERN)).toBeInTheDocument();
  });

  describe("authentication awareness", () => {
    it("shows auth form when user is not authenticated", () => {
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
        expiresAt: Date.now() + 86_400_000,
      });

      render(<AcceptInvitationContent token="valid-token" />);

      // Should show auth form
      expect(screen.getByTestId(AUTH_FORM_TESTID)).toBeInTheDocument();
      // Should show login prompt message
      expect(screen.getByText(LOGIN_PROMPT_PATTERN)).toBeInTheDocument();
      // Should NOT show accept button
      expect(
        screen.queryByText(ACCEPT_INVITATION_PATTERN)
      ).not.toBeInTheDocument();
    });

    it("shows accept button when user is authenticated", () => {
      mockUseSession.mockReturnValue(createAuthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
        expiresAt: Date.now() + 86_400_000,
      });

      render(<AcceptInvitationContent token="valid-token" />);

      // Should show accept button
      expect(screen.getByText(ACCEPT_INVITATION_PATTERN)).toBeInTheDocument();
      // Should NOT show auth form
      expect(screen.queryByTestId(AUTH_FORM_TESTID)).not.toBeInTheDocument();
    });

    it("auto-accepts invitation after successful authentication", async () => {
      // Start unauthenticated
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
        expiresAt: Date.now() + 86_400_000,
      });
      mockAcceptMutation.mockResolvedValue("org-id-123");

      const { rerender } = render(
        <AcceptInvitationContent token="valid-token" />
      );

      // Verify auth form is shown
      expect(screen.getByTestId(AUTH_FORM_TESTID)).toBeInTheDocument();

      // Simulate successful authentication by updating the mock
      mockUseSession.mockReturnValue(createAuthenticatedSession());

      // Rerender to trigger the effect
      rerender(<AcceptInvitationContent token="valid-token" />);

      // Should auto-accept and redirect
      await waitFor(() => {
        expect(mockAcceptMutation).toHaveBeenCalledWith({
          token: "valid-token",
        });
      });

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("shows invitation details even when not authenticated", () => {
      mockUseSession.mockReturnValue(createUnauthenticatedSession());
      mockInvitationQuery.mockReturnValue({
        organizationName: "Acme Corp",
        role: "member",
        status: "pending",
        expiresAt: Date.now() + 86_400_000,
      });

      render(<AcceptInvitationContent token="valid-token" />);

      // Should still show organization name
      expect(screen.getByRole("heading")).toHaveTextContent("Acme Corp");
      // Should show role
      expect(screen.getByText(MEMBRE_PATTERN)).toBeInTheDocument();
    });
  });
});
