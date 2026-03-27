import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    color,
  }: {
    children: React.ReactNode;
    color?: string;
  }) => <span data-color={color}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-arrow-right" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-x" {...props} />
  ),
}));

import { InsightCard } from "./insight-card";

afterEach(cleanup);

const baseInsight = {
  _id: "insight-1",
  type: "feature_suggestion",
  title: "Add dark mode support",
  summary: "Users frequently request dark mode for reduced eye strain.",
  priority: "high",
  status: "active",
  suggestedFeedbackTitle: "Dark mode",
  createdAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
};

const baseProps = {
  insight: baseInsight,
  onConvert: vi.fn(),
  onDismiss: vi.fn(),
};

describe("InsightCard", () => {
  it("renders the insight title", () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText("Add dark mode support")).toBeInTheDocument();
  });

  it("renders the insight summary", () => {
    render(<InsightCard {...baseProps} />);
    expect(
      screen.getByText(
        "Users frequently request dark mode for reduced eye strain."
      )
    ).toBeInTheDocument();
  });

  it("renders the priority badge", () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders the type badge", () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText("Feature Suggestion")).toBeInTheDocument();
  });

  it("renders relative time display", () => {
    render(<InsightCard {...baseProps} />);
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("shows 'just now' for very recent insights", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, createdAt: Date.now() }}
      />
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("shows days ago for older insights", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{
          ...baseInsight,
          createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        }}
      />
    );
    expect(screen.getByText("3d ago")).toBeInTheDocument();
  });

  it("calls onConvert when Convert to Feedback button is clicked", async () => {
    const user = userEvent.setup();
    const onConvert = vi.fn();
    render(<InsightCard {...baseProps} onConvert={onConvert} />);
    await user.click(screen.getByText("Convert to Feedback"));
    expect(onConvert).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when Dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<InsightCard {...baseProps} onDismiss={onDismiss} />);
    await user.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("hides Convert to Feedback when status is converted_to_feedback", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, status: "converted_to_feedback" }}
      />
    );
    expect(screen.queryByText("Convert to Feedback")).not.toBeInTheDocument();
    // Dismiss is still visible because status is not "dismissed"
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("hides Dismiss when status is dismissed", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, status: "dismissed" }}
      />
    );
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
    // Convert is still visible because status is not "converted_to_feedback"
    expect(screen.getByText("Convert to Feedback")).toBeInTheDocument();
  });

  it("hides both buttons when status is dismissed and no suggestedFeedbackTitle", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{
          ...baseInsight,
          status: "dismissed",
          suggestedFeedbackTitle: undefined,
        }}
      />
    );
    expect(screen.queryByText("Convert to Feedback")).not.toBeInTheDocument();
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });

  it("hides Convert to Feedback when suggestedFeedbackTitle is undefined", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, suggestedFeedbackTitle: undefined }}
      />
    );
    expect(screen.queryByText("Convert to Feedback")).not.toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("renders correct priority badge color for critical", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, priority: "critical" }}
      />
    );
    expect(screen.getByText("Critical")).toHaveAttribute("data-color", "red");
  });

  it("renders correct type badge color for competitive_alert", () => {
    render(
      <InsightCard
        {...baseProps}
        insight={{ ...baseInsight, type: "competitive_alert" }}
      />
    );
    expect(screen.getByText("Competitive Alert")).toHaveAttribute(
      "data-color",
      "red"
    );
  });
});
