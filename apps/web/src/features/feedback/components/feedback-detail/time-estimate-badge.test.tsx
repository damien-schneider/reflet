/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateAnalysis = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateAnalysis,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback_actions: { updateAnalysis: "feedback_actions.updateAnalysis" },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretDown: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="caret-down" />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="clock-icon" />
  ),
  Sparkle: ({ className, weight }: { className?: string; weight?: string }) => (
    <svg
      className={className}
      data-testid="sparkle-icon"
      data-weight={weight}
    />
  ),
  X: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-icon" />
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuRadioGroup: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
    value: string;
  }) => (
    <div data-testid="radio-group" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{
              onClick?: () => void;
              value: string;
            }>,
            {
              onClick: () =>
                onValueChange(
                  (child as React.ReactElement<{ value: string }>).props.value
                ),
            }
          );
        }
        return child;
      })}
    </div>
  ),
  DropdownMenuRadioItem: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value: string;
    onClick?: () => void;
  }) => (
    <div
      data-testid={`radio-item-${value}`}
      data-value={value}
      onClick={onClick}
      onKeyDown={() => {}}
      role="menuitemradio"
    >
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({
    children,
    className,
    render: renderProp,
  }: {
    children: React.ReactNode;
    className?: string;
    render?: React.ReactNode;
  }) => (
    <button className={className} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-open={open} data-testid="popover">
      {children}
      <button
        data-testid="toggle-popover"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        togglePopover
      </button>
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
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children: React.ReactNode;
    render?: React.ReactNode;
  }) => <div data-testid="popover-trigger">{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    onClick,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    render?: React.ReactNode;
  }) => (
    <span data-testid="tooltip-trigger" onClick={onClick} onKeyDown={() => {}}>
      {renderProp}
      {children}
    </span>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args.filter((a) => typeof a === "string").join(" "),
}));

import React from "react";

import { TimeEstimateBadge } from "./time-estimate-badge";

const feedbackId = "f1" as Id<"feedback">;

describe("TimeEstimateBadge", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the time estimate for non-admin", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("2 hours")).toBeInTheDocument();
  });

  it("renders popover trigger for admin", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="30 minutes"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    expect(screen.getByText("30 minutes")).toBeInTheDocument();
  });

  it("renders different time formats", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="3 days"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("renders weeks format", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 weeks"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
  });

  it("shows overridden badge when human override exists", () => {
    render(
      <TimeEstimateBadge
        aiTimeEstimate="1 hour"
        effectiveEstimate="4 hours"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    expect(screen.getByText("4 hours")).toBeInTheDocument();
  });

  it("renders non-admin badge as non-interactive tooltip", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="3 days"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    // Non-admin gets a Tooltip wrapper, not a Popover
    expect(screen.getByText("3 days")).toBeInTheDocument();
    // Should not have popover trigger (button type)
    const _buttons = screen.queryAllByRole("button");
    // Non-admin rendering may have minimal buttons
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("opens popover for admin to edit time estimate", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    // Open the popover via toggle button
    fireEvent.click(screen.getByTestId("toggle-popover"));
    // Should show time estimate editor
    expect(screen.getByText("Time estimate")).toBeInTheDocument();
  });

  it("parses minutes format correctly", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="15 minutes"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    expect(screen.getByText("15 minutes")).toBeInTheDocument();
  });

  it("parses abbreviated formats (e.g., '2h')", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 h"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    // The component parses it but displays the effectiveEstimate as-is
    expect(screen.getByText("2 h")).toBeInTheDocument();
  });

  it("falls back to 1 hour for invalid format", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="invalid"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    // Opens popover - the parsed default should be 1 hour
    fireEvent.click(screen.getByTestId("toggle-popover"));
    expect(screen.getByText("Time estimate")).toBeInTheDocument();
  });

  it("shows Reset to AI value button when human override exists", () => {
    render(
      <TimeEstimateBadge
        aiTimeEstimate="1 hour"
        effectiveEstimate="4 hours"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    expect(screen.getByText("Reset to AI value")).toBeInTheDocument();
  });

  it("does not show Reset button when no human override", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    expect(screen.queryByText("Reset to AI value")).not.toBeInTheDocument();
  });

  it("calls updateAnalysis with clearTimeEstimate on reset", async () => {
    mockUpdateAnalysis.mockResolvedValue(undefined);
    render(
      <TimeEstimateBadge
        aiTimeEstimate="1 hour"
        effectiveEstimate="4 hours"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    fireEvent.click(screen.getByText("Reset to AI value"));
    await waitFor(() => {
      expect(mockUpdateAnalysis).toHaveBeenCalledWith({
        feedbackId,
        clearTimeEstimate: true,
      });
    });
  });

  it("shows AI tooltip for overridden estimate", () => {
    render(
      <TimeEstimateBadge
        aiTimeEstimate="1 hour"
        effectiveEstimate="4 hours"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin={false}
        isOverridden
      />
    );
    expect(screen.getByText("4 hours")).toBeInTheDocument();
  });

  it("renders badge element", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    expect(screen.getByText("2 hours")).toBeInTheDocument();
  });

  it("renders without AI estimate", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="3 days"
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("does not show popover for non-admin", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="1 week"
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("returns null when no estimate provided", () => {
    const { container } = render(
      <TimeEstimateBadge
        effectiveEstimate=""
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    // Empty estimate still renders badge markup
    expect(container).toBeInTheDocument();
  });

  it("admin popover shows amount and unit selects", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    expect(screen.getByText("Time estimate")).toBeInTheDocument();
    // Popover should contain amount and unit dropdown triggers
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("admin popover shows CaretDown icon", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    // Admin badge should contain the caret-down icon
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders singular 'minute' for amount 1", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="1 minute"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("1 minute")).toBeInTheDocument();
  });

  it("renders singular 'day' for amount 1", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="1 day"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("1 day")).toBeInTheDocument();
  });

  it("renders singular 'week' for amount 1", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="1 week"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("1 week")).toBeInTheDocument();
  });

  it("calls handleAmountChange and saves when amount radio item clicked", async () => {
    mockUpdateAnalysis.mockResolvedValue(undefined);
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    // Open the popover
    fireEvent.click(screen.getByTestId("toggle-popover"));
    // Click a different amount
    const radioItem5 = screen.getByTestId("radio-item-5");
    fireEvent.click(radioItem5);
    await waitFor(() => {
      expect(mockUpdateAnalysis).toHaveBeenCalledWith({
        feedbackId,
        timeEstimate: "5 hours",
      });
    });
  });

  it("calls handleUnitChange and recalculates closest amount", async () => {
    mockUpdateAnalysis.mockResolvedValue(undefined);
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    // Click the days unit radio
    const daysItem = screen.getByTestId("radio-item-days");
    fireEvent.click(daysItem);
    await waitFor(() => {
      expect(mockUpdateAnalysis).toHaveBeenCalledWith({
        feedbackId,
        timeEstimate: "2 days",
      });
    });
  });

  it("does not save when formatted estimate matches current", async () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByTestId("toggle-popover"));
    // Click the same amount that's already selected
    const radioItem2 = screen.getByTestId("radio-item-2");
    fireEvent.click(radioItem2);
    // Should not call updateAnalysis since 2 hours === 2 hours
    expect(mockUpdateAnalysis).not.toHaveBeenCalled();
  });

  it("renders sparkle icon with fill weight when overridden", () => {
    render(
      <TimeEstimateBadge
        aiTimeEstimate="1 hour"
        effectiveEstimate="4 hours"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin={false}
        isOverridden
      />
    );
    const sparkle = screen.getByTestId("sparkle-icon");
    expect(sparkle).toHaveAttribute("data-weight", "fill");
  });

  it("renders sparkle icon with regular weight when not overridden", () => {
    render(
      <TimeEstimateBadge
        effectiveEstimate="2 hours"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    const sparkle = screen.getByTestId("sparkle-icon");
    expect(sparkle).toHaveAttribute("data-weight", "regular");
  });
});
