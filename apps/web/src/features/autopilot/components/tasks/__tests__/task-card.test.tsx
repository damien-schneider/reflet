import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toId } from "@/lib/convex-helpers";

const { mockUseQuery, mockUseMutation, mockPush } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(() => vi.fn()),
  mockPush: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mockUseMutation(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        work: {
          updateWorkItem: "autopilot.work.updateWorkItem",
          assignWorkItem: "autopilot.work.assignWorkItem",
        },
        labels: {
          setLabels: "autopilot.labels.setLabels",
          createLabel: "autopilot.labels.createLabel",
        },
      },
      queries: {
        labels: {
          listLabels: "autopilot.labels.listLabels",
          listWorkItemLabels: "autopilot.labels.listWorkItemLabels",
        },
      },
    },
    organizations: {
      members: {
        list: "organizations.members.list",
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "acme" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "4 days ago",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { TaskCard } from "@/features/autopilot/components/task-card";

const workItemId = toId("autopilotWorkItems", "a".repeat(32));
const orgId = toId("organizations", "o".repeat(32));

function makeTask(
  overrides: Partial<Doc<"autopilotWorkItems">> = {}
): Doc<"autopilotWorkItems"> {
  return {
    _creationTime: 1,
    _id: workItemId,
    organizationId: orgId,
    type: "task",
    title: "Create investor pitch deck",
    description:
      "Long body copy belongs on the detail page, not the issue row.",
    status: "todo",
    priority: "high",
    needsReview: false,
    identifier: "CLOUD-43",
    createdAt: 1_776_024_000_000,
    updatedAt: 1_776_024_000_000,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseQuery.mockReset();
  mockUseMutation.mockClear();
  mockPush.mockClear();
  mockUseQuery.mockReturnValue([]);
});

describe("TaskCard", () => {
  it("renders a compact Linear-style issue row without a description preview", () => {
    render(<TaskCard task={makeTask()} />);

    expect(screen.getByText("Create investor pitch deck")).toBeInTheDocument();
    expect(screen.getByText("CLOUD-43")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Long body copy belongs on the detail page, not the issue row."
      )
    ).not.toBeInTheDocument();
  });
});
