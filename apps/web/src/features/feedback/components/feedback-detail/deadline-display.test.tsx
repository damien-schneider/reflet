/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CalendarCheck: ({ className }: { className?: string }) => (
    <span className={className} data-testid="calendar-icon" />
  ),
  X: ({ className }: { className?: string }) => (
    <span className={className} data-testid="x-icon" />
  ),
}));

vi.mock("@ctrl-ui/react/ui/calendar", () => ({
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

vi.mock("@ctrl-ui/react/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => <div data-open={open}>{children}</div>,
  PopoverContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
    sideOffset?: number;
  }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({
    "aria-label": ariaLabel,
    children,
    render: renderProp,
    className,
  }: {
    "aria-label"?: string;
    children?: React.ReactNode;
    render?: React.ReactNode;
    className?: string;
  }) => (
    <fieldset
      aria-label={ariaLabel}
      className={className}
      data-testid="popover-trigger"
    >
      {renderProp}
      {children}
    </fieldset>
  ),
}));

import { DeadlineDisplay } from "./deadline-display";

const baseProps = {
  isOpen: false,
  onChange: vi.fn(),
  onClear: vi.fn(),
  onOpenChange: vi.fn(),
};

describe("DeadlineDisplay", () => {
  afterEach(() => {
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

  it("renders clear deadline button when open and has deadline", () => {
    const futureDate = new Date(2027, 5, 15).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={futureDate} isOpen />);
    expect(screen.getByText("Clear deadline")).toBeInTheDocument();
  });

  it("does not render clear button when no deadline", () => {
    render(<DeadlineDisplay {...baseProps} deadline={null} isOpen />);
    expect(screen.queryByText("Clear deadline")).not.toBeInTheDocument();
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

  it("announces a past deadline as overdue", () => {
    const pastDate = new Date(2020, 0, 1).getTime();
    render(<DeadlineDisplay {...baseProps} deadline={pastDate} />);
    expect(
      screen.getByLabelText("Deadline January 1, overdue. Change deadline")
    ).toBeInTheDocument();
  });

  it("does not announce an upcoming deadline as overdue", () => {
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 30);
    render(<DeadlineDisplay {...baseProps} deadline={upcoming.getTime()} />);
    expect(screen.getByLabelText(/^Deadline /)).toBeInTheDocument();
    expect(screen.queryByLabelText(/overdue/)).not.toBeInTheDocument();
  });

  it("does not announce today's deadline as overdue", () => {
    const today = new Date();
    today.setHours(0, 0, 1, 0);
    render(<DeadlineDisplay {...baseProps} deadline={today.getTime()} />);
    expect(screen.getByLabelText(/^Deadline /)).toBeInTheDocument();
    expect(screen.queryByLabelText(/overdue/)).not.toBeInTheDocument();
  });
});
