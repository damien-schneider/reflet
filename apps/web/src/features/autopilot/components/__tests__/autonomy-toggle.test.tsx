import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AutonomyToggle } from "@/features/autopilot/components/autonomy-toggle";
import { toOrgId } from "@/lib/convex-helpers";

const { mockSetMode, mockUseQuery } = vi.hoisted(() => ({
  mockSetMode: vi.fn(),
  mockUseQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mockSetMode,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        config: {
          setAutonomyMode: "autopilot.config.setAutonomyMode",
        },
      },
      queries: {
        config: {
          getConfig: "autopilot.config.getConfig",
        },
      },
    },
  },
}));

vi.mock("@/features/autopilot/components/autopilot-context", () => ({
  useAutopilotContext: () => ({
    isAdmin: true,
    organizationId: toOrgId("org_123"),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AutonomyToggle", () => {
  it("marks the current autonomy mode as pressed", () => {
    mockUseQuery.mockReturnValue({ autonomyMode: "full_auto" });

    render(<AutonomyToggle />);

    expect(screen.getByRole("button", { name: /Full Auto/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /Supervised/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
