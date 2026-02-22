/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("./complexity-badge", () => ({
  ComplexityBadge: ({
    effectiveComplexity,
  }: {
    effectiveComplexity: string;
  }) => <span data-testid="complexity-badge">{effectiveComplexity}</span>,
}));

vi.mock("./priority-badge", () => ({
  PriorityBadge: ({ effectivePriority }: { effectivePriority: string }) => (
    <span data-testid="priority-badge">{effectivePriority}</span>
  ),
}));

vi.mock("./time-estimate-badge", () => ({
  TimeEstimateBadge: ({ effectiveEstimate }: { effectiveEstimate: string }) => (
    <span data-testid="time-estimate-badge">{effectiveEstimate}</span>
  ),
}));

import { AiAnalysisDisplay } from "./ai-analysis-display";

const feedbackId = "f1" as Id<"feedback">;

describe("AiAnalysisDisplay", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when not admin", () => {
    const { container } = render(
      <AiAnalysisDisplay
        aiPriority="high"
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when admin but no analysis data", () => {
    const { container } = render(
      <AiAnalysisDisplay feedbackId={feedbackId} isAdmin />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders priority badge when priority exists", () => {
    render(
      <AiAnalysisDisplay aiPriority="high" feedbackId={feedbackId} isAdmin />
    );
    expect(screen.getByTestId("priority-badge")).toHaveTextContent("high");
  });

  it("renders complexity badge when complexity exists", () => {
    render(
      <AiAnalysisDisplay
        aiComplexity="moderate"
        feedbackId={feedbackId}
        isAdmin
      />
    );
    expect(screen.getByTestId("complexity-badge")).toHaveTextContent(
      "moderate"
    );
  });

  it("renders time estimate badge when time estimate exists", () => {
    render(
      <AiAnalysisDisplay
        aiTimeEstimate="2 hours"
        feedbackId={feedbackId}
        isAdmin
      />
    );
    expect(screen.getByTestId("time-estimate-badge")).toHaveTextContent(
      "2 hours"
    );
  });

  it("uses human override over AI values", () => {
    render(
      <AiAnalysisDisplay
        aiPriority="low"
        feedbackId={feedbackId}
        isAdmin
        priority="critical"
      />
    );
    expect(screen.getByTestId("priority-badge")).toHaveTextContent("critical");
  });

  it("renders all three badges when all data present", () => {
    render(
      <AiAnalysisDisplay
        aiComplexity="simple"
        aiPriority="high"
        aiTimeEstimate="1 hour"
        feedbackId={feedbackId}
        isAdmin
      />
    );
    expect(screen.getByTestId("priority-badge")).toBeInTheDocument();
    expect(screen.getByTestId("complexity-badge")).toBeInTheDocument();
    expect(screen.getByTestId("time-estimate-badge")).toBeInTheDocument();
  });
});
