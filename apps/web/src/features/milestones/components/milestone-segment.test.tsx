import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createContext, useContext, useState } from "react";
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
    organizations: {
      milestone_actions: {
        remove: "milestones:remove",
      },
      milestones: {
        update: "milestones:update",
      },
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: () => <span data-testid="icon-check" />,
  DotsThreeVertical: () => <span data-testid="icon-dots" />,
  PencilSimple: () => <span data-testid="icon-pencil" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("@ctrl-ui/react/ui/dropdown-menu", () => {
  const OpenContext = createContext<{ open: boolean; toggle: () => void }>({
    open: false,
    toggle: () => undefined,
  });
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = useState(false);
      return (
        <OpenContext.Provider
          value={{ open, toggle: () => setOpen((value) => !value) }}
        >
          {children}
        </OpenContext.Provider>
      );
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = useContext(OpenContext);
      return open ? (
        <div data-testid="dropdown-content" role="menu">
          {children}
        </div>
      ) : null;
    },
    DropdownMenuItem: ({
      children,
      className,
      onClick,
    }: {
      children: React.ReactNode;
      className?: string;
      onClick?: () => void;
    }) => (
      <button className={className} onClick={onClick} type="button">
        {children}
      </button>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({
      children,
      className,
      ...rest
    }: {
      "aria-label"?: string;
      children: React.ReactNode;
      className?: string;
    }) => {
      const { toggle } = useContext(OpenContext);
      return (
        <button
          aria-label={rest["aria-label"]}
          className={className}
          onClick={toggle}
          type="button"
        >
          {children}
        </button>
      );
    },
  };
});

vi.mock("motion/react", () => ({
  domAnimation: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
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
  useReducedMotion: () => false,
}));

vi.mock("@ctrl-ui/react/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-list">{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-content">{children}</div>
  ),
  ContextMenuItem: ({
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
  ContextMenuSeparator: () => <hr />,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-trigger">{children}</div>
  ),
}));

vi.mock("@ctrl-ui/react/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = "button",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
  }) => (
    <button disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
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

vi.mock("@ctrl-ui/react/ui/select", () => ({
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
    later: { label: "Later" },
    next_month: { label: "Next Month" },
    now: { label: "Now" },
  },
  TIME_HORIZONS: ["now", "next_month", "later"],
}));

vi.mock("@/lib/milestone-deadline", () => ({
  getDeadlineInfo: vi.fn(() => null),
}));

vi.mock("./milestone-date-picker", () => ({
  MilestoneDatePicker: () => <div data-testid="date-picker" />,
}));

import { MilestoneSegment } from "./milestone-segment";

afterEach(() => {
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
  color: overrides.color ?? "blue",
  emoji: overrides.emoji ?? "🚀",
  name: overrides.name ?? "Alpha Release",
  progress: overrides.progress ?? {
    completed: 5,
    inProgress: 2,
    percentage: 50,
    total: 10,
  },
  status: overrides.status ?? "active",
  targetDate: overrides.targetDate,
  timeHorizon: (overrides.timeHorizon ?? "now") as never,
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

  it("exposes admin actions through a labelled keyboard-reachable trigger", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ name: "Beta" })}
        onClick={vi.fn()}
      />
    );
    const trigger = screen.getByRole("button", {
      name: "Actions for Beta",
    });
    expect(screen.queryByTestId("dropdown-content")).toBeNull();
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
  });

  it("does not render an actions trigger for non-admins", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin={false}
        milestone={makeMilestone({ name: "Beta" })}
        onClick={vi.fn()}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Actions for Beta" })
    ).toBeNull();
  });

  it("context menu shows Mark as complete for active milestones", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "active" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Mark as complete")).toBeInTheDocument();
  });

  it("context menu hides Mark as complete for completed milestones", () => {
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "completed" })}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText("Mark as complete")).toBeNull();
  });

  it("renders percentage on hover overlay", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({
          progress: { completed: 2, inProgress: 0, percentage: 50, total: 4 },
        })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("calls updateMilestone for Mark as complete", async () => {
    const user = userEvent.setup();
    render(
      <MilestoneSegment
        isActive={false}
        isAdmin
        milestone={makeMilestone({ status: "active" })}
        onClick={vi.fn()}
      />
    );
    await user.click(screen.getByText("Mark as complete"));
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
    expect(mockRemoveMilestone).not.toHaveBeenCalled();
    await user.click(
      await screen.findByRole("button", { name: "Delete milestone" })
    );
    expect(mockRemoveMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ms1" })
    );
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

  it("announces the overdue deadline in the accessible name", async () => {
    const { getDeadlineInfo } = await import("@/lib/milestone-deadline");
    vi.mocked(getDeadlineInfo).mockReturnValue({
      daysRemaining: -2,
      label: "Jan 1, 2025",
      relativeLabel: "2 days overdue",
      status: "overdue",
    });
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone({ targetDate: Date.now() - 86_400_000 })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/2 days overdue/)).toBeInTheDocument();
    vi.mocked(getDeadlineInfo).mockReturnValue(null);
  });

  it("omits the overdue notice when the milestone is on track", () => {
    render(
      <MilestoneSegment
        isActive={false}
        milestone={makeMilestone()}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/overdue/i)).toBeNull();
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
      expect.objectContaining({ id: "ms1", name: "Beta Release" })
    );
  });
});
