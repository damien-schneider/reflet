/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CalendarCheck: ({ className }: { className?: string }) => (
    <span className={className} data-testid="calendar-icon" />
  ),
  X: ({ className }: { className?: string }) => (
    <span className={className} data-testid="x-icon" />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    color,
  }: {
    children: React.ReactNode;
    className?: string;
    color?: string;
  }) => (
    <span className={className} data-color={color} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    selected,
  }: {
    mode: string;
    onSelect: (date: Date | undefined) => void;
    selected?: Date;
  }) => (
    <div data-testid="calendar">
      <button
        data-selected={selected?.toISOString()}
        onClick={() => onSelect(new Date(2027, 0, 15))}
        type="button"
      >
        Select date
      </button>
      <button onClick={() => onSelect(undefined)} type="button">
        Select undefined
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => <div data-open={open}>{children}</div>,
  PopoverTrigger: ({
    children,
    render: renderProp,
    className,
  }: {
    children?: React.ReactNode;
    render?: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="popover-trigger">
      {renderProp}
      {children}
    </div>
  ),
  PopoverContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
    sideOffset?: number;
  }) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args.filter((a) => typeof a === "string").join(" "),
}));

import { DeadlineDisplay } from "./deadline-display";

const baseProps = {
  isOpen: false,
  onOpenChange: vi.fn(),
  onChange: vi.fn(),
  onClear: vi.fn(),
};

describe("DeadlineDisplay", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows Deadline placeholder when no deadline", () => {
    render(<DeadlineDisplay {...baseProps} deadline={null} />);
    expect(screen.getByText("Deadline")).toBeInTheDocument();
  });

  it("shows Deadline placeholder when deadline is 0", () => {
    render(<DeadlineDisplay {...baseProps} deadline={0} />);
    expect(screen.getByText("Deadline")).toBeInTheDocument();
  });

  it("shows formatted date when deadline is set", () => {
    const date = new Date(2026, 2, 15).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={date} />);
    expect(screen.getByText("Mar 15")).toBeInTheDocument();
  });

  it("shows overdue styling for past dates", () => {
    const pastDate = new Date(2020, 0, 1).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={pastDate} />);
    expect(screen.getByText("Jan 1")).toBeInTheDocument();
  });

  it("renders clear deadline button when open and has deadline", () => {
    const futureDate = new Date(2027, 5, 15).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={futureDate} isOpen />);
    expect(screen.getByText("Clear deadline")).toBeInTheDocument();
  });

  it("does not render clear button when no deadline", () => {
    render(<DeadlineDisplay {...baseProps} deadline={null} isOpen />);
    expect(screen.queryByText("Clear deadline")).not.toBeInTheDocument();
  });

  it("calls onClear when clear deadline button is clicked", () => {
    const onClear = vi.fn();
    const futureDate = new Date(2027, 5, 15).getTime();
    render(
      <DeadlineDisplay
        {...baseProps}
        deadline={futureDate}
        isOpen
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByText("Clear deadline"));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("calls onChange when a date is selected in calendar", () => {
    const onChange = vi.fn();
    const futureDate = new Date(2027, 5, 15).getTime();
    render(
      <DeadlineDisplay
        {...baseProps}
        deadline={futureDate}
        isOpen
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText("Select date"));
    expect(onChange).toHaveBeenCalledWith(new Date(2027, 0, 15));
  });

  it("does not call onChange when undefined is selected", () => {
    const onChange = vi.fn();
    render(
      <DeadlineDisplay
        {...baseProps}
        deadline={null}
        isOpen
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText("Select undefined"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows overdue badge color for past dates", () => {
    const pastDate = new Date(2020, 0, 1).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={pastDate} />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-color", "red");
  });

  it("shows violet badge color for future dates", () => {
    const futureDate = new Date(2027, 5, 15).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={futureDate} />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-color", "violet");
  });

  it("does not show overdue for today's date", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    render(<DeadlineDisplay {...baseProps} deadline={today.getTime()} />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-color", "violet");
  });

  it("shows deadline placeholder when deadline is undefined", () => {
    render(<DeadlineDisplay {...baseProps} deadline={undefined} />);
    expect(screen.getByText("Deadline")).toBeInTheDocument();
  });

  it("renders calendar inside popover content", () => {
    render(<DeadlineDisplay {...baseProps} deadline={null} isOpen />);
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
  });
});
