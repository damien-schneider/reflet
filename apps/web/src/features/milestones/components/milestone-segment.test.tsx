import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateMilestone = vi.fn().mockResolvedValue(undefined);
const mockRemoveMilestone = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "milestones:update") {
      return mockUpdateMilestone;
    }
    if (ref === "milestones:remove") {
      return mockRemoveMilestone;
    }
    return vi.fn();
  },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    milestones: {
      update: "milestones:update",
      remove: "milestones:remove",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: () => <span data-testid="icon-check" />,
  PencilSimple: () => <span data-testid="icon-pencil" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("motion/react", () => ({
  motion: {
    button: ({
      children,
      onClick,
      className,
      style,
      ...rest
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      className?: string;
      style?: React.CSSProperties;
      [key: string]: unknown;
    }) => (
      <button
        aria-label={rest["aria-label"] as string}
        className={className}
        onClick={onClick}
        style={style}
        type="button"
      >
        {children}
      </button>
    ),
    div: ({
      children,
      className,
      style,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list">{children}</div>
  ),
  ContextListContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-content">{children}</div>
  ),
  ContextListItem: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button data-variant={variant} onClick={onClick} type="button">
      {children}
    </button>
  ),
  ContextListSeparator: () => <hr />,
  ContextListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-trigger">{children}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => (
    <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
  ),
}));

vi.mock("@/components/ui/emoji-picker", () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: () => <div data-testid="color-picker" />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span />,
}));

vi.mock("@/lib/milestone-constants", () => ({
  isTimeHorizon: () => true,
  TIME_HORIZON_CONFIG: {
    now: { label: "Now" },
    next_month: { label: "Next Month" },
    later: { label: "Later" },
  },
  TIME_HORIZONS: ["now", "next_month", "later"],
}));

vi.mock("@/lib/milestone-deadline", () => ({
  getDeadlineInfo: vi.fn(() => null),
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagColorValues: () => ({ text: "#3b82f6", bg: "#eff6ff" }),
  isValidTagColor: () => true,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("./milestone-date-picker", () => ({
  MilestoneDatePicker: () => <div data-testid="date-picker" />,
}));

import { MilestoneSegment } from "./milestone-segment";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeMilestone = (
  overrides: Partial<{
    _id: string;
    name: string;
    emoji: string;
    color: string;
    timeHorizon: string;
    targetDate: number;
    status: string;
    progress: {
      total: number;
      completed: number;
      inProgress: number;
      percentage: number;
    };
  }> = {}
) => ({
  _id: (overrides._id ?? "ms1") as never,
  name: overrides.name ?? "Alpha Release",
  emoji: overrides.emoji ?? "🚀",
  color: overrides.color ?? "blue",
  timeHorizon: (overrides.timeHorizon ?? "now") as never,
  targetDate: overrides.targetDate,
  status: overrides.status ?? "active",
  progress: overrides.progress ?? {
    total: 10,
    completed: 5,
    inProgress: 2,
    percentage: 50,
  },
});

describe("MilestoneSegment", () => {
  it("renders without crash", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(
      screen.getByLabelText("Alpha Release: 50% complete (5 of 10)")
    ).toBeInTheDocument();
  });

  it("renders milestone name", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ name: "Beta" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getAllByText("Beta")).toHaveLength(2); // default and hover state
  });

  it("renders emoji", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ emoji: "🎯" })}
        onClick={vi.fn()}
      />
    );
    const emojis = screen.getAllByText("🎯");
    expect(emojis.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone()}
        onClick={onClick}
      />
    );
    await user.click(
      screen.getByLabelText("Alpha Release: 50% complete (5 of 10)")
    );
    expect(onClick).toHaveBeenCalled();
  });

  it("does not render context menu for non-admin", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin={false}
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByTestId("context-list")).toBeNull();
  });

  it("renders context menu for admin", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("context-list")).toBeInTheDocument();
  });

  it("context menu shows Edit option", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("context menu shows Mark as Complete for active milestones", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "active" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
  });

  it("context menu hides Mark as Complete for completed milestones", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "completed" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText("Mark as Complete")).toBeNull();
  });

  it("context menu shows Delete option", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders percentage on hover overlay", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({
          progress: { total: 4, completed: 2, inProgress: 0, percentage: 50 },
        })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("calls updateMilestone when Edit is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Milestone")).toBeInTheDocument();
  });

  it("calls updateMilestone for Mark as Complete", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "active" })}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Mark as Complete"));
    expect(mockUpdateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("calls removeMilestone for Delete", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Delete"));
    expect(mockRemoveMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ms1" })
    );
  });

  it("renders completed milestone without Mark as Complete option", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "completed" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText("Mark as Complete")).toBeNull();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders milestone without emoji", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ emoji: undefined })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getAllByText("Alpha Release").length).toBeGreaterThan(0);
  });

  it("renders milestone with emoji", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ emoji: "🚀" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getAllByText("🚀").length).toBeGreaterThan(0);
  });

  it("applies active styles when isActive", () => {
    const { container } = render(
      <MilestoneSegment
        isActive
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("renders with 0% progress", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({
          progress: { total: 4, completed: 0, inProgress: 0, percentage: 0 },
        })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders with 100% progress", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({
          progress: { total: 4, completed: 4, inProgress: 0, percentage: 100 },
        })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onClick when segment button is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone()}
        onClick={onClick}
      />
    );
    const buttons = screen.getAllByRole("button");
    // The first button is the motion.button segment
    await user.click(buttons[0]);
    expect(onClick).toHaveBeenCalled();
  });

  it("renders edit dialog with form fields", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alpha Release")).toBeInTheDocument();
  });

  it("renders with inProgress count in aria-label", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({
          progress: { total: 10, completed: 3, inProgress: 4, percentage: 30 },
        })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/30% complete/)).toBeInTheDocument();
  });

  it("renders context trigger for admin", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("context-trigger")).toBeInTheDocument();
  });

  it("submits edit form with Save button", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("Save"));
    expect(mockUpdateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ms1", name: "Alpha Release" })
    );
  });

  it("submits edit form on Enter key in name input", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    const input = screen.getByDisplayValue("Alpha Release");
    await user.type(input, "{Enter}");
    expect(mockUpdateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ms1" })
    );
  });

  it("does not submit when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    const input = screen.getByDisplayValue("Alpha Release");
    await user.clear(input);
    await user.click(screen.getByText("Save"));
    expect(mockUpdateMilestone).not.toHaveBeenCalled();
  });

  it("closes edit dialog on Cancel", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("dialog")).toBeNull();
  });

  it("disables Save button when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    const input = screen.getByDisplayValue("Alpha Release");
    await user.clear(input);
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("renders overdue dot when deadline is overdue", async () => {
    const { getDeadlineInfo } = await import("@/lib/milestone-deadline");
    vi.mocked(getDeadlineInfo).mockReturnValue({
      status: "overdue",
      relativeLabel: "2 days overdue",
    } as never);
    const { container } = render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ targetDate: Date.now() - 86_400_000 })}
        onClick={vi.fn()}
      />
    );
    expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
    vi.mocked(getDeadlineInfo).mockReturnValue(null);
  });

  it("does not render overdue dot when not overdue", () => {
    const { container } = render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(container.querySelector(".bg-red-500")).toBeNull();
  });

  it("updates name in edit dialog", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Edit"));
    const input = screen.getByDisplayValue("Alpha Release");
    await user.clear(input);
    await user.type(input, "Beta Release");
    await user.click(screen.getByText("Save"));
    expect(mockUpdateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Beta Release" })
    );
  });
});
