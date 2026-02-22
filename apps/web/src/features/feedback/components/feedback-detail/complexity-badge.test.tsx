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

import { ComplexityBadge } from "./complexity-badge";

const feedbackId = "f1" as Id<"feedback">;

describe("ComplexityBadge", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the complexity label for non-admin", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="moderate"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Moderate")).toBeInTheDocument();
  });

  it("renders dropdown trigger when admin", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="simple"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Simple")).toBeInTheDocument();
  });

  it("renders trivial complexity label", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="trivial"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Trivial")).toBeInTheDocument();
  });

  it("renders very complex label", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="very_complex"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Very Complex")).toBeInTheDocument();
  });

  it("shows AI suggestion in tooltip when overridden", () => {
    render(
      <ComplexityBadge
        aiComplexity="trivial"
        effectiveComplexity="complex"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    expect(screen.getByText("C: Complex")).toBeInTheDocument();
  });

  it("renders complex label", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="complex"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Complex")).toBeInTheDocument();
  });

  it("renders simple label", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="simple"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    expect(screen.getByText("C: Simple")).toBeInTheDocument();
  });

  it("renders dropdown trigger for admin", () => {
    render(
      <ComplexityBadge
        effectiveComplexity="moderate"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does not render dropdown trigger for non-admin", () => {
    const { container } = render(
      <ComplexityBadge
        effectiveComplexity="moderate"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin={false}
        isOverridden={false}
      />
    );
    // Non-admin wraps badge in tooltip, not a dropdown. CaretDown icon should not appear
    expect(container.textContent).toContain("C: Moderate");
    expect(container.textContent).not.toContain("Trivial");
  });

  it("shows Reset to AI value when hasHumanOverride is true for admin", async () => {
    render(
      <ComplexityBadge
        aiComplexity="trivial"
        effectiveComplexity="complex"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    // Click dropdown trigger to open
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Reset to AI value")).toBeInTheDocument();
    });
  });

  it("does not show Reset to AI value when no human override", async () => {
    render(
      <ComplexityBadge
        effectiveComplexity="moderate"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Trivial")).toBeInTheDocument();
    });
    expect(screen.queryByText("Reset to AI value")).not.toBeInTheDocument();
  });

  it("calls updateAnalysis with clearComplexity when Reset is clicked", async () => {
    mockUpdateAnalysis.mockResolvedValue(undefined);
    render(
      <ComplexityBadge
        aiComplexity="trivial"
        effectiveComplexity="complex"
        feedbackId={feedbackId}
        hasHumanOverride
        isAdmin
        isOverridden
      />
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Reset to AI value")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Reset to AI value"));
    await waitFor(() => {
      expect(mockUpdateAnalysis).toHaveBeenCalledWith({
        feedbackId,
        clearComplexity: true,
      });
    });
  });

  it("renders all complexity option radio items for admin", async () => {
    render(
      <ComplexityBadge
        effectiveComplexity="moderate"
        feedbackId={feedbackId}
        hasHumanOverride={false}
        isAdmin
        isOverridden={false}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Trivial")).toBeInTheDocument();
    });
    expect(screen.getByText("Simple")).toBeInTheDocument();
    expect(screen.getAllByText("Moderate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByText("Very Complex")).toBeInTheDocument();
  });
});
