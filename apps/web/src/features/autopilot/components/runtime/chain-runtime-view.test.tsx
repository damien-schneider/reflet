import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChainRuntimeView } from "@/features/autopilot/components/runtime/chain-runtime-view";
import { toOrgId } from "@/lib/convex-helpers";

const { mockUseMutation, mockUseQuery } = vi.hoisted(() => ({
  mockUseMutation: vi.fn(),
  mockUseQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: unknown) => mockUseMutation(mutation),
  useQuery: (query: unknown) => mockUseQuery(query),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      runtime: {
        mutations: {
          retryExecution: "autopilot.runtime.retryExecution",
        },
        queries: {
          getRuntimeState: "autopilot.runtime.getRuntimeState",
        },
      },
    },
  },
}));

const runtimeState = {
  actions: [
    {
      id: "execution_running",
      actionKind: "chain_producer",
      branch: "main",
      finishedAt: null,
      role: "cto",
      startedAt: 1000,
      status: "running",
      title: "Produce codebase understanding",
      triggerReason: "dependency_ready",
    },
    {
      id: "execution_failed",
      actionKind: "chain_producer",
      branch: "feature/checkout",
      errorMessage: "Provider returned malformed JSON",
      finishedAt: 900,
      nextRetryAt: 2000,
      retryCount: 1,
      role: "growth",
      startedAt: 800,
      status: "failed",
      title: "Refresh market analysis",
      triggerReason: "failed_execution_retry",
    },
  ],
  blockers: [
    {
      affectedBranch: "feature/checkout",
      count: 6,
      ctaHref: "/dashboard/acme/autopilot/inbox",
      ctaLabel: "Review items",
      kind: "review_gate",
      limit: 5,
      message: "feature/checkout has 6 pending review items; limit is 5.",
    },
  ],
  deliverables: [],
  limits: {
    cost: { capUsd: 25, usedUsd: 12 },
    dailyTasks: { max: 10, resetAt: 3000, used: 2 },
    review: { defaultLimit: 5, pendingTotal: 6 },
  },
  roles: [
    {
      blockers: [],
      currentAction: {
        id: "execution_running",
        actionKind: "chain_producer",
        branch: "main",
        finishedAt: null,
        role: "cto",
        startedAt: 1000,
        status: "running",
        title: "Produce codebase understanding",
        triggerReason: "dependency_ready",
      },
      lastFailure: null,
      nextAction: { kind: "chain_producer", node: "product_profile" },
      role: "cto",
      skills: ["Codebase reading", "Architecture synthesis"],
      state: "working",
    },
    {
      blockers: [
        {
          affectedBranch: "feature/checkout",
          count: 6,
          kind: "review_gate",
          limit: 5,
          message: "feature/checkout has 6 pending review items; limit is 5.",
        },
      ],
      currentAction: null,
      lastFailure: null,
      nextAction: null,
      role: "growth",
      skills: ["Market research", "Content refresh"],
      state: "blocked",
    },
  ],
};

describe("ChainRuntimeView", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseQuery.mockReturnValue(runtimeState);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders role skills, blockers, and failures requiring attention", () => {
    render(
      <ChainRuntimeView
        baseUrl="/dashboard/acme/autopilot"
        isAdmin
        organizationId={toOrgId("org_runtime")}
      />
    );

    expect(screen.getByText("CTO skill")).toBeVisible();
    expect(screen.getByText("Architecture synthesis")).toBeVisible();
    expect(screen.getByText("Growth skill")).toBeVisible();
    expect(
      screen.getByText(
        "feature/checkout has 6 pending review items; limit is 5."
      )
    ).toBeVisible();
    expect(screen.getByText("Refresh market analysis")).toBeVisible();
    expect(screen.getByText("Provider returned malformed JSON")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /retry refresh market analysis/i })
    ).toBeVisible();
    expect(
      screen.queryByText("Produce codebase understanding")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
  });
});
