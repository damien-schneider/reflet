import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-check-circle" />
  ),
  Circle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-circle" />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-clock" />
  ),
  XCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-x-circle" />
  ),
}));

import { ConversationStatusBadge } from "./conversation-status-badge";

afterEach(cleanup);

describe("ConversationStatusBadge", () => {
  it("renders open status with correct label", () => {
    render(<ConversationStatusBadge status="open" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders awaiting_reply status with correct label", () => {
    render(<ConversationStatusBadge status="awaiting_reply" />);
    expect(screen.getByText("Awaiting")).toBeInTheDocument();
  });

  it("renders resolved status with correct label", () => {
    render(<ConversationStatusBadge status="resolved" />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders closed status with correct label", () => {
    render(<ConversationStatusBadge status="closed" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows icon by default", () => {
    render(<ConversationStatusBadge status="open" />);
    expect(screen.getByTestId("icon-circle")).toBeInTheDocument();
  });

  it("hides icon when showIcon is false", () => {
    render(<ConversationStatusBadge showIcon={false} status="open" />);
    expect(screen.queryByTestId("icon-circle")).not.toBeInTheDocument();
  });

  it("renders correct icon for each status", () => {
    const { unmount: u1 } = render(
      <ConversationStatusBadge status="awaiting_reply" />
    );
    expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
    u1();

    const { unmount: u2 } = render(
      <ConversationStatusBadge status="resolved" />
    );
    expect(screen.getByTestId("icon-check-circle")).toBeInTheDocument();
    u2();

    render(<ConversationStatusBadge status="closed" />);
    expect(screen.getByTestId("icon-x-circle")).toBeInTheDocument();
  });

  it("falls back to raw status string for unknown statuses", () => {
    render(<ConversationStatusBadge status="custom_status" />);
    expect(screen.getByText("custom_status")).toBeInTheDocument();
  });

  it("uses circle icon for unknown statuses", () => {
    render(<ConversationStatusBadge status="unknown" />);
    expect(screen.getByTestId("icon-circle")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ConversationStatusBadge className="custom-class" status="open" />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("custom-class");
  });
});
