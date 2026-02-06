import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCreateMilestone = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockCreateMilestone,
}));

vi.mock("@phosphor-icons/react", () => ({
  CalendarBlank: () => <svg data-testid="calendar-blank-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
}));

// Mock the popover to render inline for testing
vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-testid="popover-root">{children}</div>,
  PopoverTrigger: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    type?: "reset" | "button" | "submit";
  }) => (
    <button data-testid="popover-trigger" type="button" {...props}>
      {children}
    </button>
  ),
  PopoverContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="popover-content">
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/emoji-picker", () => ({
  EmojiPicker: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (v: string) => void;
  }) => (
    <button
      data-testid="emoji-picker"
      onClick={() => onChange("🎉")}
      type="button"
    >
      {value ?? "emoji"}
    </button>
  ),
}));

vi.mock("@/components/ui/notion-color-picker", () => ({
  NotionColorPicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="color-picker">
      <button onClick={() => onChange("red")} type="button">
        Red
      </button>
      <span>selected: {value}</span>
    </div>
  ),
}));

vi.mock("./milestone-date-picker", () => ({
  MilestoneDatePicker: ({
    value,
    onChange,
  }: {
    value?: number;
    onChange: (v: number | undefined) => void;
  }) => (
    <button
      data-testid="date-picker"
      onClick={() => onChange(undefined)}
      type="button"
    >
      {value ? "has date" : "no date"}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button disabled={disabled} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { MilestoneFormPopover } from "./milestone-form-popover";

const defaultProps = {
  organizationId: "org123" as Id<"organizations">,
  defaultTimeHorizon: "now" as const,
  open: true,
  onOpenChange: vi.fn(),
  onCreated: vi.fn(),
};

describe("MilestoneFormPopover", () => {
  afterEach(() => {
    cleanup();
    mockCreateMilestone.mockReset();
  });

  it("should render a popover with trigger button", () => {
    render(<MilestoneFormPopover {...defaultProps} open={false} />);

    expect(screen.getByTestId("popover-root")).toBeInTheDocument();
  });

  it("should show emoji picker, name input, and color picker when open", () => {
    render(<MilestoneFormPopover {...defaultProps} />);

    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Milestone name...")
    ).toBeInTheDocument();
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  it("should show Cancel and Create buttons", () => {
    render(<MilestoneFormPopover {...defaultProps} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("should call createMilestone with form data when Create is clicked", async () => {
    mockCreateMilestone.mockResolvedValue(undefined);
    render(<MilestoneFormPopover {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText("Milestone name...");
    fireEvent.change(nameInput, { target: { value: "New milestone" } });

    const createButton = screen.getByText("Create");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateMilestone).toHaveBeenCalledWith({
        organizationId: "org123",
        name: "New milestone",
        emoji: undefined,
        color: "blue",
        timeHorizon: "now",
        targetDate: undefined,
      });
    });
  });

  it("should call onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <MilestoneFormPopover {...defaultProps} onOpenChange={onOpenChange} />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should not call createMilestone when name is empty", () => {
    render(<MilestoneFormPopover {...defaultProps} />);

    const createButton = screen.getByText("Create");
    fireEvent.click(createButton);

    expect(mockCreateMilestone).not.toHaveBeenCalled();
  });

  it("should submit on Enter key", async () => {
    mockCreateMilestone.mockResolvedValue(undefined);
    render(<MilestoneFormPopover {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText("Milestone name...");
    fireEvent.change(nameInput, { target: { value: "Quick milestone" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockCreateMilestone).toHaveBeenCalledTimes(1);
    });
  });

  it("should use the provided defaultTimeHorizon when creating", async () => {
    mockCreateMilestone.mockResolvedValue(undefined);
    render(
      <MilestoneFormPopover
        {...defaultProps}
        defaultTimeHorizon="next_quarter"
      />
    );

    const nameInput = screen.getByPlaceholderText("Milestone name...");
    fireEvent.change(nameInput, { target: { value: "Test" } });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreateMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ timeHorizon: "next_quarter" })
      );
    });
  });
});
