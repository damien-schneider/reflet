import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HarnessDashboard } from "@/features/autopilot/components/harness/dashboard";
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
      harness: {
        mutations: {
          enqueueProductBrain: "autopilot.harness.enqueueProductBrain",
        },
        queries: {
          getHarnessOverview: "autopilot.harness.getHarnessOverview",
        },
      },
    },
  },
}));

const overview = {
  bridge: {
    claudeAvailable: true,
    id: "bridge_1",
    lastHeartbeatAt: 1000,
    name: "Damien MacBook",
    repoFullName: "acme/reflet-demo",
    status: "online",
  },
  recipes: [
    {
      dependsOn: [],
      id: "product-brain",
      outputs: [
        {
          artifactKind: "product_brain",
          path: ".reflet/strategy/product-brain.md",
        },
      ],
      productMapLifecycle: "strategy",
      productMapTopic: "product_strategy",
      subagents: ["product-strategist", "critic-validator"],
      title: "Product Brain",
      validations: ["evidence_required"],
      version: 1,
    },
  ],
  jobs: [
    {
      id: "job_1",
      prUrl: "https://github.com/acme/reflet-demo/pull/1",
      recipeId: "product-brain",
      status: "succeeded",
      title: "Build Product Brain",
      updatedAt: 2000,
      worktreeBranch: "reflet/product-brain/job-1",
    },
  ],
  artifacts: [
    {
      artifactKind: "product_brain",
      id: "artifact_1",
      path: ".reflet/strategy/product-brain.md",
      recipeId: "product-brain",
      title: "Product Brain",
      updatedAt: 2000,
      validationScore: 92,
      validationStatus: "passed",
    },
  ],
  events: [
    {
      createdAt: 2000,
      id: "event_1",
      level: "action",
      message: "Claude generated Product Brain",
    },
  ],
};

describe("HarnessDashboard", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseQuery.mockReturnValue(overview);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the bridge, ProductMap recipes, subagents, artifacts, and PR state", () => {
    render(<HarnessDashboard organizationId={toOrgId("org_harness")} />);

    expect(screen.getByText("Product Harness")).toBeVisible();
    expect(screen.getByText("Bridge online")).toBeVisible();
    expect(screen.getByText("Claude Code ready")).toBeVisible();
    expect(screen.getAllByText("Product Brain")).toHaveLength(2);
    expect(screen.getByText("product-strategist")).toBeVisible();
    expect(
      screen.getAllByText(".reflet/strategy/product-brain.md")
    ).toHaveLength(2);
    expect(screen.getByText("reflet/product-brain/job-1")).toBeVisible();
    expect(screen.getByText("Claude generated Product Brain")).toBeVisible();
    expect(screen.queryByText(".reflet/users")).not.toBeInTheDocument();
  });
});
