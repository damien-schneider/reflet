import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => vi.fn());
const validTaskId = "a".repeat(32);

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
        },
      },
      queries: {
        work: {
          getChildren: "autopilot.work.getChildren",
          getWorkItem: "autopilot.work.getWorkItem",
          getWorkItemRuns: "autopilot.work.getWorkItemRuns",
        },
      },
    },
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    use: () => ({ taskId: validTaskId }),
  };
});

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "just now",
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="task-skeleton" />,
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({ value }: { value: string }) => <div>{value}</div>,
}));

vi.mock("@/components/ui/typography", () => ({
  H2: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

describe("TaskDetailPage", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockClear();
  });

  it("shows loading skeletons while the task query is loading", async () => {
    const { default: TaskDetailPage } = await import("./page");

    mockUseQuery.mockReturnValue(undefined);

    render(
      <TaskDetailPage params={Promise.resolve({ taskId: validTaskId })} />
    );

    expect(screen.getAllByTestId("task-skeleton")).toHaveLength(3);
    expect(screen.queryByText("Task not found")).not.toBeInTheDocument();
  });

  it("shows not found after the task query resolves empty", async () => {
    const { default: TaskDetailPage } = await import("./page");

    mockUseQuery.mockReturnValue(null);

    render(
      <TaskDetailPage params={Promise.resolve({ taskId: validTaskId })} />
    );

    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });
});
