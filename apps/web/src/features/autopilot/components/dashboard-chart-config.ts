import type { ChartConfig } from "@/components/ui/chart";

export const STATUS_COLORS: Record<string, string> = {
  backlog: "var(--chart-3)",
  todo: "var(--chart-4)",
  in_progress: "var(--chart-1)",
  in_review: "var(--chart-5)",
  done: "var(--chart-2)",
  cancelled: "var(--muted-foreground)",
};

export const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const TYPE_COLORS: Record<string, string> = {
  initiative: "var(--chart-1)",
  story: "var(--chart-2)",
  task: "var(--chart-3)",
  spec: "var(--chart-4)",
  bug: "var(--chart-5)",
};

export const TYPE_LABELS: Record<string, string> = {
  initiative: "Initiative",
  story: "Story",
  task: "Task",
  spec: "Spec",
  bug: "Bug",
};

export const activityChartConfig = {
  actions: {
    label: "Actions",
    color: "var(--chart-1)",
  },
  successes: {
    label: "Successes",
    color: "var(--chart-2)",
  },
  errors: {
    label: "Errors",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export const costChartConfig = {
  cost: {
    label: "Cost ($)",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
