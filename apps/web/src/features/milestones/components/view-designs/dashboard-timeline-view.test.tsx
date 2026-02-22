import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockMilestones = [
  {
    _id: "m1",
    _creationTime: 1_700_000_000_000,
    name: "Alpha",
    emoji: "🚀",
    color: "blue",
    timeHorizon: "now",
    status: "active",
    targetDate: undefined,
    progress: { total: 5, completed: 2, inProgress: 1, percentage: 40 },
  },
  {
    _id: "m2",
    _creationTime: 1_700_000_001_000,
    name: "Beta",
    emoji: "🎯",
    color: "green",
    timeHorizon: "next_month",
    status: "active",
    targetDate: Date.now() + 86_400_000,
    progress: { total: 3, completed: 0, inProgress: 1, percentage: 0 },
  },
];

let queryResult: unknown = mockMilestones;

vi.mock("convex/react", () => ({
  useQuery: () => queryResult,
  useMutation: () => vi.fn(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    milestones: {
      list: "milestones:list",
      get: "milestones:get",
      addFeedback: "milestones:addFeedback",
      removeFeedback: "milestones:removeFeedback",
    },
    feedback_list: { listByOrganization: "feedback:list" },
  },
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      className,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => <div className={className}>{children}</div>,
    circle: (props: Record<string, unknown>) => <circle {...props} />,
  },
}));

vi.mock("@/lib/milestone-constants", () => ({
  isTimeHorizon: (v: string) => ["now", "next_month", "later"].includes(v),
  TIME_HORIZON_CONFIG: {
    now: { label: "Now", shortLabel: "Now" },
    next_month: { label: "Next Month", shortLabel: "Next" },
    later: { label: "Later", shortLabel: "Later" },
  },
  TIME_HORIZONS: ["now", "next_month", "later"],
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagColorValues: () => ({ text: "#3b82f6", bg: "#eff6ff" }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretRight: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-caret" />
  ),
}));

vi.mock("../milestone-expanded-panel", () => ({
  MilestoneExpandedPanel: () => (
    <div data-testid="expanded-panel">Expanded</div>
  ),
}));

vi.mock("../milestone-form-popover", () => ({
  MilestoneFormPopover: () => <div data-testid="form-popover">Add</div>,
}));

import { DashboardTimelineView } from "./dashboard-timeline-view";

afterEach(() => {
  cleanup();
  queryResult = mockMilestones;
});

describe("DashboardTimelineView", () => {
  it("shows loading spinner when milestones is undefined", () => {
    queryResult = undefined;
    const { container } = render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows empty message for non-admin when no milestones", () => {
    queryResult = [];
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(
      screen.getByText("No milestones have been created yet.")
    ).toBeInTheDocument();
  });

  it("renders KPI header with totals", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("2/8 items")).toBeInTheDocument();
    expect(screen.getByText("2 done")).toBeInTheDocument();
  });

  it("renders milestone names", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders emojis", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("🚀")).toBeInTheDocument();
    expect(screen.getByText("🎯")).toBeInTheDocument();
  });

  it("renders percentages", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows form popover for admin", () => {
    render(
      <DashboardTimelineView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByTestId("form-popover")).toBeInTheDocument();
  });

  it("does not show form popover for non-admin", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.queryByTestId("form-popover")).toBeNull();
  });

  it("toggles expanded panel on milestone click", async () => {
    const user = userEvent.setup();
    render(
      <DashboardTimelineView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getByText("Alpha"));
    expect(screen.getByTestId("expanded-panel")).toBeInTheDocument();
  });

  it("shows in-progress count when > 0", () => {
    render(
      <DashboardTimelineView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("2 in progress")).toBeInTheDocument();
  });
});
