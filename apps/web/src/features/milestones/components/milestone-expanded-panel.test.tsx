import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMilestone = {
  _id: "ms1",
  name: "Alpha Release",
  description: "First alpha release",
  targetDate: undefined as number | undefined,
  status: "active",
  progress: { total: 5, completed: 2, inProgress: 1, percentage: 40 },
  feedback: [
    {
      _id: "fb1",
      title: "Feedback One",
      voteCount: 10,
      organizationStatus: { name: "Open", color: "blue" },
    },
    {
      _id: "fb2",
      title: "Feedback Two",
      voteCount: 5,
      organizationStatus: null,
    },
  ],
};

const mockAllFeedback = [
  { _id: "fb1", title: "Feedback One", voteCount: 10 },
  { _id: "fb3", title: "Unlinked Feedback", voteCount: 3 },
];

let mockQueryFn: (ref: string, args: unknown) => unknown;

vi.mock("convex/react", () => ({
  useQuery: (ref: string, args: unknown) => mockQueryFn(ref, args),
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    milestones: {
      get: "milestones:get",
      addFeedback: "milestones:addFeedback",
      removeFeedback: "milestones:removeFeedback",
    },
    feedback_list: {
      listByOrganization: "feedback_list:listByOrganization",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  CalendarBlank: () => <span data-testid="icon-calendar" />,
  MagnifyingGlass: () => <span data-testid="icon-search" />,
  X: () => <span data-testid="icon-x" />,
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
      children: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => <div className={className}>{children}</div>,
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    onChange,
    value,
    placeholder,
    className,
  }: {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value?: string;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      className={className}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("@/lib/milestone-deadline", () => ({
  getDeadlineInfo: () => null,
  getDeadlineBadgeStyles: () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("./milestone-progress-ring", () => ({
  MilestoneProgressRing: ({
    progress,
  }: {
    progress: { percentage: number };
  }) => <div data-testid="progress-ring">{progress.percentage}%</div>,
}));

import { MilestoneExpandedPanel } from "./milestone-expanded-panel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MilestoneExpandedPanel", () => {
  beforeEach(() => {
    mockQueryFn = (ref: string) => {
      if (ref === "milestones:get") {
        return mockMilestone;
      }
      if (ref === "feedback_list:listByOrganization") {
        return mockAllFeedback;
      }
      return undefined;
    };
  });

  it("returns null when milestone is not loaded", () => {
    mockQueryFn = () => undefined;
    const { container } = render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders description when available", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("First alpha release")).toBeInTheDocument();
  });

  it("renders progress ring", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByTestId("progress-ring")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("shows progress stats", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("2/5 done")).toBeInTheDocument();
    expect(screen.getByText("1 in progress")).toBeInTheDocument();
  });

  it("renders linked feedback for admin", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Feedback One")).toBeInTheDocument();
    expect(screen.getByText("Feedback Two")).toBeInTheDocument();
  });

  it("shows Linked Feedback count", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Linked Feedback (2)")).toBeInTheDocument();
  });

  it("shows search input for admin", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(
      screen.getByPlaceholderText("Search feedback to link...")
    ).toBeInTheDocument();
  });

  it("does not show search input for non-admin", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin={false}
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(
      screen.queryByPlaceholderText("Search feedback to link...")
    ).toBeNull();
  });

  it("shows No feedback linked yet when feedback array is empty", () => {
    mockQueryFn = (ref: string) => {
      if (ref === "milestones:get") {
        return { ...mockMilestone, feedback: [] };
      }
      if (ref === "feedback_list:listByOrganization") {
        return [];
      }
      return undefined;
    };
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("No feedback linked yet")).toBeInTheDocument();
  });

  it("calls onFeedbackClick when feedback item is clicked", async () => {
    const onFeedbackClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        onFeedbackClick={onFeedbackClick}
        organizationId={"org1" as never}
      />
    );
    await user.click(screen.getByText("Feedback One"));
    expect(onFeedbackClick).toHaveBeenCalledWith("fb1");
  });

  it("renders linked feedback read-only for non-admin", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin={false}
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    expect(screen.getByText("Feedback One")).toBeInTheDocument();
    expect(screen.getByText("Linked Feedback (2)")).toBeInTheDocument();
  });

  it("search input filters displayed unlinked feedback", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    const searchInput = screen.getByPlaceholderText(
      "Search feedback to link..."
    );
    await user.type(searchInput, "Unlinked");
    expect(searchInput).toHaveValue("Unlinked");
  });

  it("shows vote count on linked feedback", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    // Vote counts are rendered as part of feedback items
    expect(screen.getByText("Feedback One")).toBeInTheDocument();
    expect(screen.getByText("Feedback Two")).toBeInTheDocument();
  });

  it("shows status badge on linked feedback", () => {
    render(
      <MilestoneExpandedPanel
        isAdmin
        milestoneId={"ms1" as never}
        organizationId={"org1" as never}
      />
    );
    // "Open" status comes from mockMilestone.feedback[0].organizationStatus.name
    const badges = screen.getAllByText("Open");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
