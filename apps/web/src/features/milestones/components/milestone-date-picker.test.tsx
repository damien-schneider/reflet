import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  CalendarBlank: () => <span data-testid="icon-calendar" />,
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    selected,
  }: {
    onSelect: (day: Date | undefined) => void;
    selected?: Date;
    mode: string;
  }) => (
    <div data-testid="calendar">
      <button
        data-testid="select-date"
        onClick={() => onSelect(new Date(2026, 2, 15, 14, 30))}
        type="button"
      >
        Select Date
      </button>
    </div>
  ),
}));

vi.mock("@ctrl-ui/react/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <button className={className} data-testid="popover-trigger" type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/lib/milestone-deadline", () => ({
  getDeadlineButtonClass: () => "",
  getDeadlineInfo: () => null,
}));

import { MilestoneDatePicker } from "./milestone-date-picker";

describe("MilestoneDatePicker", () => {
  it("shows Set deadline when no value", () => {
    render(<MilestoneDatePicker onChange={vi.fn()} value={undefined} />);
    expect(screen.getByText("Set deadline")).toBeInTheDocument();
  });

  it("shows formatted date when value is set", () => {
    const date = new Date(2026, 2, 15).getTime();
    render(<MilestoneDatePicker onChange={vi.fn()} value={date} />);
    expect(screen.getByText("Mar 15, 2026")).toBeInTheDocument();
  });

  it("saves the picked day as its start-of-day timestamp", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MilestoneDatePicker onChange={onChange} value={undefined} />);
    await user.click(screen.getByTestId("select-date"));
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 15).getTime());
  });

  it("does not show clear deadline button when no value", () => {
    render(<MilestoneDatePicker onChange={vi.fn()} value={undefined} />);
    expect(screen.queryByText("Clear deadline")).toBeNull();
  });

  it("calls onChange with undefined when clear is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const date = new Date(2026, 2, 15).getTime();
    render(<MilestoneDatePicker onChange={onChange} value={date} />);
    await user.click(screen.getByText("Clear deadline"));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
