import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  motion: {
    circle: ({
      style: _style,
      ...props
    }: Record<string, unknown> & { style?: unknown }) => <circle {...props} />,
    span: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useSpring: (val: unknown) => val,
  useTransform: (_val: unknown, fn: (v: number) => unknown) => fn(0),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { MilestoneProgressRing } from "./milestone-progress-ring";

afterEach(cleanup);

describe("MilestoneProgressRing", () => {
  const baseProgress = {
    total: 10,
    completed: 5,
    inProgress: 2,
    percentage: 50,
  };

  it("renders without crash", () => {
    render(<MilestoneProgressRing progress={baseProgress} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders with aria-label containing percentage", () => {
    render(<MilestoneProgressRing progress={baseProgress} />);
    expect(
      screen.getByLabelText("Milestone progress: 50%")
    ).toBeInTheDocument();
  });

  it("renders with custom size", () => {
    const { container } = render(
      <MilestoneProgressRing progress={baseProgress} size={64} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("64px");
    expect(wrapper.style.height).toBe("64px");
  });

  it("renders default size of 48", () => {
    const { container } = render(
      <MilestoneProgressRing progress={baseProgress} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("48px");
    expect(wrapper.style.height).toBe("48px");
  });

  it("renders background track circle", () => {
    const { container } = render(
      <MilestoneProgressRing progress={baseProgress} />
    );
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it("handles zero total gracefully", () => {
    const progress = { total: 0, completed: 0, inProgress: 0, percentage: 0 };
    render(<MilestoneProgressRing progress={progress} />);
    expect(screen.getByLabelText("Milestone progress: 0%")).toBeInTheDocument();
  });

  it("handles 100% completion", () => {
    const progress = {
      total: 5,
      completed: 5,
      inProgress: 0,
      percentage: 100,
    };
    render(<MilestoneProgressRing progress={progress} />);
    expect(
      screen.getByLabelText("Milestone progress: 100%")
    ).toBeInTheDocument();
  });

  it("renders percentage text", () => {
    render(<MilestoneProgressRing progress={baseProgress} />);
    expect(screen.getByText("%")).toBeInTheDocument();
  });
});
