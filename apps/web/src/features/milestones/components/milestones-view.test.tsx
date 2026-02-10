import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock convex/react
const mockMilestones = [
  {
    _id: "m1",
    _creationTime: 1_700_000_000_000,
    name: "Alpha release",
    emoji: "\u{1F680}",
    color: "blue",
    timeHorizon: "now",
    status: "active",
    progress: { total: 5, completed: 2, inProgress: 1, percentage: 40 },
  },
  {
    _id: "m2",
    _creationTime: 1_700_000_001_000,
    name: "Beta release",
    emoji: "\u{1F3AF}",
    color: "green",
    timeHorizon: "next_month",
    status: "active",
    progress: { total: 3, completed: 0, inProgress: 1, percentage: 0 },
  },
];

vi.mock("convex/react", () => ({
  useQuery: () => mockMilestones,
  useMutation: () => vi.fn(),
}));

// Mock useIsMobile to avoid window.matchMedia errors in test env
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

// Mock child components to avoid deep dependency chains
vi.mock("./milestone-segment", () => ({
  MilestoneSegment: ({
    milestone,
    onClick,
  }: {
    milestone: { _id: string; name: string };
    onClick: () => void;
  }) => (
    <button
      data-testid={`milestone-segment-${milestone._id}`}
      onClick={onClick}
      type="button"
    >
      {milestone.name}
    </button>
  ),
}));

vi.mock("./milestone-form-popover", () => ({
  MilestoneFormPopover: () => (
    <div data-testid="milestone-form-popover">Add</div>
  ),
}));

vi.mock("./milestone-expanded-panel", () => ({
  MilestoneExpandedPanel: () => (
    <div data-testid="expanded-panel">Expanded</div>
  ),
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

// Mock ScrollArea with ref forwarding and data-slot viewport attribute
// The component passes ref={trackRef} to ScrollArea and then queries for
// [data-slot="scroll-area-viewport"] inside it via trackRef.current.querySelector
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    direction,
    ref,
  }: {
    children: React.ReactNode;
    direction?: string;
    ref?: React.Ref<HTMLDivElement>;
  }) => (
    <div data-direction={direction} data-testid="scroll-area" ref={ref}>
      <div data-slot="scroll-area-viewport" data-testid="scroll-viewport">
        {children}
      </div>
    </div>
  ),
  ScrollBar: () => null,
}));

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
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
