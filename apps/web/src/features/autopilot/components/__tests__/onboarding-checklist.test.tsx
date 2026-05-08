import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingChecklist } from "@/features/autopilot/components/onboarding-checklist";
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
      queries: {
        config: {
          getConfig: "autopilot.config.getConfig",
        },
        dashboard: {
          getAgentReadiness: "autopilot.dashboard.getAgentReadiness",
          getDashboardStats: "autopilot.dashboard.getDashboardStats",
        },
      },
    },
  },
}));

describe("OnboardingChecklist", () => {
  it("treats missing dev readiness as healthy credentials", () => {
    mockUseQuery.mockImplementation((queryName: unknown) => {
      if (queryName === "autopilot.config.getConfig") {
        return {
          enabled: true,
          pmEnabled: true,
          ctoEnabled: true,
          devEnabled: true,
          growthEnabled: false,
        };
      }
      if (queryName === "autopilot.dashboard.getAgentReadiness") {
        return {};
      }
      if (queryName === "autopilot.dashboard.getDashboardStats") {
        return { doneCount: 1 };
      }
      return undefined;
    });

    render(
      <OnboardingChecklist
        baseUrl="/dashboard/acme/autopilot"
        organizationId={toOrgId("org_123")}
      />
    );

    expect(
      screen.queryByText("Configure coding adapter credentials")
    ).toBeNull();
  });
});
