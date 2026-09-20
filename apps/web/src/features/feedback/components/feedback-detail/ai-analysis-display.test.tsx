/**
 * @vitest-environment jsdom
 */
import { toast } from "@ctrl-ui/react/ui/toast";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRecomputeAnalysis = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockRecomputeAnalysis,
  useQuery: vi.fn(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      auto_tagging_jobs: {
        recomputeFeedbackAnalysis:
          "auto_tagging_jobs.recomputeFeedbackAnalysis",
      },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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
const RECOMPUTE_LABEL = "Recompute AI analysis";

describe("AiAnalysisDisplay", () => {
  afterEach(() => {
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

  it("offers recompute to admins even without any analysis", () => {
    render(<AiAnalysisDisplay feedbackId={feedbackId} isAdmin />);
    expect(
      screen.getByRole("button", { name: RECOMPUTE_LABEL })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("priority-badge")).not.toBeInTheDocument();
  });

  it("hides recompute from non-admins", () => {
    render(
      <AiAnalysisDisplay
        aiPriority="high"
        feedbackId={feedbackId}
        isAdmin={false}
      />
    );
    expect(
      screen.queryByRole("button", { name: RECOMPUTE_LABEL })
    ).not.toBeInTheDocument();
  });

  it("recomputes analysis for the feedback when an admin clicks recompute", async () => {
    render(
      <AiAnalysisDisplay aiPriority="high" feedbackId={feedbackId} isAdmin />
    );

    fireEvent.click(screen.getByRole("button", { name: RECOMPUTE_LABEL }));

    await waitFor(() => {
      expect(mockRecomputeAnalysis).toHaveBeenCalledWith({ feedbackId });
    });
    expect(toast.success).toHaveBeenCalledWith("Recomputing analysis");
  });

  it("reports a failed recompute", async () => {
    mockRecomputeAnalysis.mockRejectedValueOnce(new Error("Admins only"));

    render(<AiAnalysisDisplay feedbackId={feedbackId} isAdmin />);
    fireEvent.click(screen.getByRole("button", { name: RECOMPUTE_LABEL }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to recompute analysis", {
        description: "Admins only",
      });
    });
    expect(toast.success).not.toHaveBeenCalled();
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

  it("flags feedback the AI wants a human to follow up on", () => {
    render(
      <AiAnalysisDisplay aiNeedsReview={0.9} feedbackId={feedbackId} isAdmin />
    );
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("does not flag feedback the AI is confident about", () => {
    render(
      <AiAnalysisDisplay aiNeedsReview={0.1} feedbackId={feedbackId} isAdmin />
    );
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
  });
});
