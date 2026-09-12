import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusBadge } from "./status-badge";

// Mock Badge component
vi.mock("@ctrl-ui/react/ui/badge", () => ({
  Badge: ({
    children,
    className,
    color,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    color?: string;
    variant?: string;
  }) => (
    <span className={className} data-color={color} data-variant={variant}>
      {children}
    </span>
  ),
}));

describe("StatusBadge", () => {
  it("should render open status with correct label", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("should render under_review status with correct label", () => {
    render(<StatusBadge status="under_review" />);
    expect(screen.getByText("Under Review")).toBeInTheDocument();
  });

  it("should render planned status with correct label", () => {
    render(<StatusBadge status="planned" />);
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("should render in_progress status with correct label", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("should render completed status with correct label", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("should render closed status with correct label", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("should apply correct color for each status", () => {
    const statusColors = [
      { expectedColor: "blue", status: "open" },
      { expectedColor: "yellow", status: "under_review" },
      { expectedColor: "purple", status: "planned" },
      { expectedColor: "blue", status: "in_progress" },
      { expectedColor: "green", status: "completed" },
      { expectedColor: "neutral", status: "closed" },
    ] as const;

    for (const { status, expectedColor } of statusColors) {
      cleanup();
      const { container } = render(<StatusBadge status={status} />);
      const badge = container.firstChild;
      expect(badge).toHaveAttribute("data-color", expectedColor);
    }
  });

  it("should apply custom className", () => {
    const { container } = render(
      <StatusBadge className="custom-test-class" status="open" />
    );

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("custom-test-class");
  });

  it("should handle unknown status gracefully", () => {
    render(<StatusBadge status="unknown_status" />);
    // Should render the status as-is when not in config
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });

  it("should render all statuses consistently", () => {
    const statuses = [
      "open",
      "under_review",
      "planned",
      "in_progress",
      "completed",
      "closed",
    ] as const;

    for (const status of statuses) {
      cleanup();
      render(<StatusBadge status={status} />);
      // Each should render without errors
      expect(document.body.textContent).toBeTruthy();
    }
  });
});
