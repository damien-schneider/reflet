import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock convex/react
const mockMilestones = [
  {
    _id: "m1",
    _creationTime: 1_700_000_000_000,
    name: "Alpha release",
    emoji: "🚀",
    color: "blue",
    timeHorizon: "now",
    progress: { total: 5, completed: 2, inProgress: 1, percentage: 40 },
  },
  {
    _id: "m2",
    _creationTime: 1_700_000_001_000,
    name: "Beta release",
    emoji: "🎯",
    color: "green",
    timeHorizon: "next_month",
    progress: { total: 3, completed: 0, inProgress: 1, percentage: 0 },
  },
];

vi.mock("convex/react", () => ({
  useQuery: () => mockMilestones,
  useMutation: () => vi.fn(),
}));

vi.mock("@phosphor-icons/react", () => ({
  CalendarBlank: () => <svg data-testid="calendar-blank-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  Flag: () => <svg data-testid="flag-icon" />,
  PencilSimple: () => <svg data-testid="pencil-simple-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
  X: () => <svg data-testid="x-icon" />,
  XIcon: () => <svg data-testid="x-icon-close" />,
}));

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return ({
          children,
          className,
          style,
          ...rest
        }: {
          children?: React.ReactNode;
          className?: string;
          style?: React.CSSProperties;
          [key: string]: unknown;
        }) => {
          const Tag = prop as keyof HTMLElementTagNameMap;
          const filteredProps: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(rest)) {
            if (
              key.startsWith("data-") ||
              key === "role" ||
              key === "aria-label" ||
              key === "onClick" ||
              key === "type" ||
              key === "id"
            ) {
              filteredProps[key] = value;
            }
          }
          return (
            <Tag className={className} style={style} {...filteredProps}>
              {children}
            </Tag>
          );
        };
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./milestone-date-picker", () => ({
  MilestoneDatePicker: () => <div data-testid="date-picker">Date picker</div>,
}));

vi.mock("./milestone-expanded-panel", () => ({
  MilestoneExpandedPanel: () => (
    <div data-testid="expanded-panel">Expanded</div>
  ),
}));

vi.mock("./milestone-inline-form", () => ({
  MilestoneInlineForm: () => <div data-testid="inline-form">Form</div>,
}));

// Mock scroll area with data-slot attribute on the viewport,
// matching the real component's DOM structure
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    direction,
  }: {
    children: React.ReactNode;
    direction?: string;
  }) => (
    <div data-direction={direction} data-testid="scroll-area">
      <div data-slot="scroll-area-viewport" data-testid="scroll-viewport">
        {children}
      </div>
    </div>
  ),
  ScrollBar: () => null,
}));

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { MilestonesView } from "./milestones-view";

const defaultProps = {
  organizationId: "org123" as Id<"organizations">,
  isAdmin: true,
  onFeedbackClick: vi.fn(),
};

const ZONE_LABEL_PATTERN =
  /^(Now|Next Month|Next Quarter|6 Months|Next Year|Future)$/;
const MIN_WIDTH_PATTERN = /min-width:\s*(\d+)/;

function getZoneMinWidths(): number[] {
  const labels = screen.getAllByText(ZONE_LABEL_PATTERN);
  const widths: number[] = [];
  for (const label of labels) {
    const parent = label.closest("[style]");
    if (parent) {
      const style = parent.getAttribute("style") || "";
      const match = style.match(MIN_WIDTH_PATTERN);
      if (match) {
        widths.push(Number.parseInt(match[1], 10));
      }
    }
  }
  return widths;
}

function dispatchWheel(
  element: HTMLElement,
  options: { deltaY: number; ctrlKey: boolean }
) {
  act(() => {
    element.dispatchEvent(
      new WheelEvent("wheel", {
        ...options,
        bubbles: false,
        cancelable: true,
      })
    );
  });
}

describe("MilestonesView - Trackpad Zoom", () => {
  afterEach(() => {
    cleanup();
  });

  it("should zoom in when pinch-to-zoom gesture (ctrl+wheel up) is detected on the scroll viewport", () => {
    render(<MilestonesView {...defaultProps} />);
    const viewport = screen.getByTestId("scroll-viewport");

    // Non-bubbling event: only caught if listener is directly on the viewport
    dispatchWheel(viewport, { deltaY: -20, ctrlKey: true });

    const widths = getZoneMinWidths();
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.some((w) => w > 160)).toBe(true);
  });

  it("should zoom out when pinch-to-zoom gesture (ctrl+wheel down) is detected on the scroll viewport", () => {
    render(<MilestonesView {...defaultProps} />);
    const viewport = screen.getByTestId("scroll-viewport");

    dispatchWheel(viewport, { deltaY: 20, ctrlKey: true });

    const widths = getZoneMinWidths();
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.some((w) => w < 160)).toBe(true);
  });

  it("should NOT zoom when regular scroll (no ctrl key) is used", () => {
    render(<MilestonesView {...defaultProps} />);
    const viewport = screen.getByTestId("scroll-viewport");

    dispatchWheel(viewport, { deltaY: -50, ctrlKey: false });

    const widths = getZoneMinWidths();
    expect(widths.every((w) => w === 160)).toBe(true);
  });

  it("should not zoom below minimum zone width (80px)", () => {
    render(<MilestonesView {...defaultProps} />);
    const viewport = screen.getByTestId("scroll-viewport");

    for (let i = 0; i < 50; i++) {
      dispatchWheel(viewport, { deltaY: 100, ctrlKey: true });
    }

    const widths = getZoneMinWidths();
    expect(widths.every((w) => w >= 80)).toBe(true);
  });

  it("should not zoom above maximum zone width (500px)", () => {
    render(<MilestonesView {...defaultProps} />);
    const viewport = screen.getByTestId("scroll-viewport");

    for (let i = 0; i < 100; i++) {
      dispatchWheel(viewport, { deltaY: -100, ctrlKey: true });
    }

    const widths = getZoneMinWidths();
    expect(widths.every((w) => w <= 500)).toBe(true);
  });
});
