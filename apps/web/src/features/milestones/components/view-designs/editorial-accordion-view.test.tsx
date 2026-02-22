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
      onClick,
      animate,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      onClick?: () => void;
      animate?: unknown;
      [key: string]: unknown;
    }) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
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

import { EditorialAccordionView } from "./editorial-accordion-view";

afterEach(() => {
  cleanup();
  queryResult = mockMilestones;
});

describe("EditorialAccordionView", () => {
  it("shows loading spinner when milestones is undefined", () => {
    queryResult = undefined;
    const { container } = render(
      <EditorialAccordionView
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
      <EditorialAccordionView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(
      screen.getByText("No milestones have been created yet.")
    ).toBeInTheDocument();
  });

  it("renders milestone names", () => {
    render(
      <EditorialAccordionView
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
      <EditorialAccordionView
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
      <EditorialAccordionView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders horizon labels", () => {
    render(
      <EditorialAccordionView
        isAdmin={false}
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText(/Now/)).toBeInTheDocument();
    expect(screen.getByText(/Next Month/)).toBeInTheDocument();
  });

  it("shows form popover for admin", () => {
    render(
      <EditorialAccordionView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByTestId("form-popover")).toBeInTheDocument();
  });

  it("does not show form popover for non-admin", () => {
    render(
      <EditorialAccordionView
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
      <EditorialAccordionView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getByText("Alpha"));
    expect(screen.getByTestId("expanded-panel")).toBeInTheDocument();
  });

  it("collapses panel when clicking same milestone again", async () => {
    const user = userEvent.setup();
    render(
      <EditorialAccordionView
        isAdmin
        onFeedbackClick={vi.fn()}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getByText("Alpha"));
    expect(screen.getByTestId("expanded-panel")).toBeInTheDocument();
    await user.click(screen.getByText("Alpha"));
    expect(screen.queryByTestId("expanded-panel")).toBeNull();
  });
});
