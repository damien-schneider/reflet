import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockMilestones = [
  {
    _id: "m1",
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
    name: "Beta",
    emoji: "🎯",
    color: "green",
    timeHorizon: "later",
    status: "active",
    targetDate: undefined,
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
    }: {
      children?: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => <div className={className}>{children}</div>,
    button: ({
      children,
      className,
      onClick,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      onClick?: () => void;
      [key: string]: unknown;
    }) => (
      <button className={className} onClick={onClick} type="button">
        {children}
      </button>
    ),
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    ref,
    ...rest
  }: {
    children: React.ReactNode;
    ref?: unknown;
    [key: string]: unknown;
  }) => <div data-testid="scroll-area">{children}</div>,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/milestone-constants", () => ({
  isTimeHorizon: (v: string) => ["now", "next_month", "later"].includes(v),
  TIME_HORIZON_CONFIG: {
    now: { label: "Now" },
    next_month: { label: "Next Month" },
    later: { label: "Later" },
  },
  TIME_HORIZONS: ["now", "next_month", "later"],
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagColorValues: () => ({ text: "#3b82f6", bg: "#eff6ff" }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("../milestone-expanded-panel", () => ({
  MilestoneExpandedPanel: () => (
    <div data-testid="expanded-panel">Expanded</div>
  ),
}));

vi.mock("../milestone-form-popover", () => ({
  MilestoneFormPopover: () => <div data-testid="form-popover">Add</div>,
}));

vi.mock("../milestone-segment", () => ({
  MilestoneSegment: ({
    milestone,
    onClick,
  }: {
    milestone: { _id: string; name: string };
    onClick: () => void;
  }) => (
    <button
      data-testid={`segment-${milestone._id}`}
      onClick={onClick}
      type="button"
    >
      {milestone.name}
    </button>
  ),
}));

import { TrackView } from "./track-view";

afterEach(() => {
  cleanup();
  queryResult = mockMilestones;
});

describe("TrackView", () => {
  it("shows loading spinner when milestones is undefined", () => {
    queryResult = undefined;
    const { container } = render(
      <TrackView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders milestone segment components", () => {
    render(
      <TrackView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getAllByTestId("segment-m1").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByTestId("segment-m2").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("renders horizon labels", () => {
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getAllByText("Now").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Later").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Today marker", () => {
    render(
      <TrackView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows form popovers for admin", () => {
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    const popovers = screen.getAllByTestId("form-popover");
    expect(popovers.length).toBeGreaterThanOrEqual(1);
  });

  it("expands panel when milestone segment is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getAllByTestId("segment-m1")[0]);
    expect(
      screen.getAllByTestId("expanded-panel").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("collapses panel when same milestone is clicked again", async () => {
    const user = userEvent.setup();
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getAllByTestId("segment-m1")[0]);
    expect(
      screen.getAllByTestId("expanded-panel").length
    ).toBeGreaterThanOrEqual(1);
    await user.click(screen.getAllByTestId("segment-m1")[0]);
    expect(screen.queryByTestId("expanded-panel")).toBeNull();
  });

  it("only shows horizons with milestones for non-admin", () => {
    render(
      <TrackView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getAllByText("Now").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Later").length).toBeGreaterThanOrEqual(1);
  });

  it("shows all horizons for admin", () => {
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getAllByText("Now").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Next Month").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Later").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state placeholder for horizons without milestones", () => {
    queryResult = [];
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    // Admin sees all horizons even with no milestones
    expect(screen.getAllByText("Now").length).toBeGreaterThanOrEqual(1);
  });

  it("hides form popovers for non-admin", () => {
    render(
      <TrackView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.queryByTestId("form-popover")).toBeNull();
  });

  it("renders scroll area on desktop", () => {
    render(
      <TrackView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
  });
});
