import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HealthBanner } from "@/features/autopilot/components/health-banner";
import { toOrgId } from "@/lib/convex-helpers";

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      health: {
        getSystemHealth: "autopilot.health.getSystemHealth",
      },
    },
  },
}));

vi.mock("@/features/autopilot/components/autopilot-context", () => ({
  useAutopilotContext: () => ({
    organizationId: toOrgId("org_test"),
    orgSlug: "acme",
  }),
}));

describe("HealthBanner — chain blocker surfacing", () => {
  it("renders critical chain blocker with absolute CTA URL", () => {
    mockUseQuery.mockReturnValue({
      status: "critical",
      issues: [
        {
          id: "chain_blocked_no_github",
          severity: "critical",
          message: "Autopilot is blocked: no GitHub repository connected.",
          resolution: "Connect a GitHub repository in Settings.",
          actionUrl: "/settings/github",
          actionLabel: "Connect Repository",
        },
      ],
      lastActivity: null,
      enabledAgentCount: 3,
      totalAgentCount: 6,
      pendingApprovalCount: 0,
    });

    render(<HealthBanner />);

    expect(screen.getByText(/Action required/)).toBeInTheDocument();
    expect(
      screen.getByText(/no GitHub repository connected/)
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Connect Repository/ });
    expect(cta).toHaveAttribute("href", "/dashboard/acme/settings/github");
  });

  it("resolves relative actionUrl to autopilot baseUrl", () => {
    mockUseQuery.mockReturnValue({
      status: "critical",
      issues: [
        {
          id: "chain_blocked_no_repo_analysis",
          severity: "critical",
          message: "CTO is blocked: no repository analysis available.",
          resolution: "Run repo analysis to unblock the chain.",
          actionUrl: "knowledge",
          actionLabel: "Run Repo Analysis",
        },
      ],
      lastActivity: null,
      enabledAgentCount: 3,
      totalAgentCount: 6,
      pendingApprovalCount: 0,
    });

    render(<HealthBanner />);

    const cta = screen.getByRole("link", { name: /Run Repo Analysis/ });
    expect(cta).toHaveAttribute("href", "/dashboard/acme/autopilot/knowledge");
  });

  it("returns nothing when health status is healthy and no approvals", () => {
    mockUseQuery.mockReturnValue({
      status: "healthy",
      issues: [],
      lastActivity: Date.now(),
      enabledAgentCount: 6,
      totalAgentCount: 6,
      pendingApprovalCount: 0,
    });

    const { container } = render(<HealthBanner />);

    expect(container.firstChild).toBeNull();
  });
});
