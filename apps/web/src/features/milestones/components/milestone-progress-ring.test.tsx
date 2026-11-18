import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  domAnimation: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    circle: ({
      style: _style,
      ...props
    }: Record<string, unknown> & { style?: unknown }) => <circle {...props} />,
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    span: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useReducedMotion: () => false,
  useSpring: (val: unknown) => val,
  useTransform: (_val: unknown, fn: (v: number) => unknown) => fn(0),
}));

import { MilestoneProgressRing } from "./milestone-progress-ring";

describe("MilestoneProgressRing", () => {
  const baseProgress = {
    completed: 5,
    inProgress: 2,
    percentage: 50,
    total: 10,
  };

  it("renders with aria-label containing percentage", () => {
    render(<MilestoneProgressRing progress={baseProgress} />);
    expect(
      screen.getByLabelText("Milestone progress: 50%")
    ).toBeInTheDocument();
  });
});
