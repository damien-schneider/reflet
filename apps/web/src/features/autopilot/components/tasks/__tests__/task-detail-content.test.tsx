import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toId } from "@/lib/convex-helpers";

const { mockUseQuery, mockUseMutation } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(() => vi.fn()),
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
        work: {
          getChildren: "autopilot.work.getChildren",
          getWorkItem: "autopilot.work.getWorkItem",
          getWorkItemRuns: "autopilot.work.getWorkItemRuns",
        },
        labels: {
          listLabels: "autopilot.labels.listLabels",
          listWorkItemLabels: "autopilot.labels.listWorkItemLabels",
        },
        activity: {
          listActivity: "autopilot.activity.listActivity",
          listWorkItemActivity: "autopilot.activity.listWorkItemActivity",
        },
      },
      mutations_unused: {},
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
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("date-fns", () => ({
  format: () => "May 14, 2026",
  formatDistanceToNow: () => "just now",
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({ value }: { value: string }) => (
    <div data-testid="tiptap">{value}</div>
  ),
}));

vi.mock("@/features/autopilot/components/views/task-runs-list", () => ({
  TaskRunsList: () => <div data-testid="task-runs-list" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { TaskDetailContent } from "@/features/autopilot/components/tasks/task-detail-content";

const workItemId = toId("autopilotWorkItems", "a".repeat(32));
const orgId = toId("organizations", "o".repeat(32));

interface FakeTask {
  _id: ReturnType<typeof toId<"autopilotWorkItems">>;
  acceptanceCriteria?: string[];
  assignedAgent?: string;
  assigneeUserId?: string;
  completionPercent?: number;
  createdAt: number;
  description: string;
  identifier: string;
  organizationId: ReturnType<typeof toId<"organizations">>;
  parentId?: ReturnType<typeof toId<"autopilotWorkItems">>;
  priority: string;
  prNumber?: number;
  prUrl?: string;
  status: string;
  title: string;
  updatedAt: number;
}

function makeTask(overrides: Partial<FakeTask> = {}): FakeTask {
  return {
    _id: workItemId,
    organizationId: orgId,
    title: "Refactor login flow",
    identifier: "ACME-12",
    status: "todo",
    priority: "medium",
    description: "Some description",
    createdAt: Date.now() - 1000,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function setupQueries({
  task,
  children = [],
  labels = [],
}: {
  task: unknown;
  children?: unknown[];
  labels?: unknown[];
}) {
  mockUseQuery.mockImplementation((key: unknown, args: unknown) => {
    if (args === "skip") {
      return undefined;
    }
    if (key === "autopilot.work.getWorkItem") {
      return task;
    }
    if (key === "autopilot.work.getChildren") {
      return children;
    }
    if (key === "autopilot.labels.listWorkItemLabels") {
      return labels;
    }
    if (key === "autopilot.labels.listLabels") {
      return [];
    }
    if (key === "autopilot.activity.listActivity") {
      return [];
    }
    if (key === "autopilot.activity.listWorkItemActivity") {
      return [];
    }
    if (key === "organizations.members.list") {
      return [];
    }
    return undefined;
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseQuery.mockReset();
  mockUseMutation.mockClear();
});

describe("TaskDetailContent", () => {
  it("renders the title and identifier when the task is loaded", () => {
    setupQueries({ task: makeTask() });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Refactor login flow" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy identifier ACME-12/ })
    ).toBeInTheDocument();
  });

  it("queries activity for the loaded work item directly", () => {
    setupQueries({ task: makeTask() });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      "autopilot.activity.listWorkItemActivity",
      { workItemId }
    );
  });

  it("renders the loading skeleton while the task query is undefined", () => {
    setupQueries({ task: undefined });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(
      screen.getAllByTestId("task-detail-skeleton").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Task not found")).not.toBeInTheDocument();
  });

  it("renders a not-found message when the task query resolves null", () => {
    setupQueries({ task: null });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });

  it("renders the subtasks list when children exist", () => {
    const child = {
      _id: toId("autopilotWorkItems", "b".repeat(32)),
      title: "Child story",
      identifier: "ACME-13",
      status: "todo",
    };
    setupQueries({
      task: makeTask(),
      children: [child],
    });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(screen.getByText("Child story")).toBeInTheDocument();
    expect(screen.getByText(/Subtasks \(1\)/)).toBeInTheDocument();
  });

  it("renders acceptance criteria items when present", () => {
    setupQueries({
      task: makeTask({
        acceptanceCriteria: ["First criterion", "Second criterion"],
      }),
    });

    render(<TaskDetailContent workItemId={workItemId} />);

    expect(screen.getByText("First criterion")).toBeInTheDocument();
    expect(screen.getByText("Second criterion")).toBeInTheDocument();
    expect(screen.getByText("Acceptance criteria")).toBeInTheDocument();
  });

  it("opens quick sub-issue creation from the task detail page", async () => {
    const user = userEvent.setup();
    setupQueries({ task: makeTask() });

    render(<TaskDetailContent workItemId={workItemId} />);

    await user.click(screen.getByRole("button", { name: /Add sub-issues/i }));

    expect(
      await screen.findByRole("dialog", { name: /Quick create sub-issue/i })
    ).toBeInTheDocument();
  });
});
