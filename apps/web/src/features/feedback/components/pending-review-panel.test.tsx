/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockRemoveFeedback, mockToast, mockUpdateFeedback } = vi.hoisted(
  () => ({
    mockRemoveFeedback: vi.fn().mockResolvedValue(undefined),
    mockToast: {
      error: vi.fn(),
      success: vi.fn(),
    },
    mockUpdateFeedback: vi.fn().mockResolvedValue(undefined),
  })
);
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (reference: unknown) =>
    reference === "feedback_actions.remove"
      ? mockRemoveFeedback
      : mockUpdateFeedback,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      actions: { remove: "feedback_actions.remove" },
      mutations: { update: "feedback_mutations.update" },
      review: { listPendingReview: "feedback_review.listPendingReview" },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: mockToast,
}));

import { PendingReviewPanel } from "./pending-review-panel";

const organizationId = "org1" as Id<"organizations">;
const feedbackId = "fb1" as Id<"feedback">;

const pendingItem = {
  _id: feedbackId,
  aiUsefulness: 0.12,
  createdAt: Date.now(),
  description: "Users keep hitting a wall",
  source: "widget" as const,
  title: "Broken export",
};

const renderPanel = () =>
  render(<PendingReviewPanel organizationId={organizationId} orgSlug="acme" />);

describe("PendingReviewPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the empty state when nothing is pending", () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [] });
    renderPanel();
    expect(screen.getByText("Nothing waiting for review")).toBeInTheDocument();
  });

  it("shows the usefulness probability as a percentage", () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [pendingItem] });
    renderPanel();
    expect(screen.getByText("12% useful")).toBeInTheDocument();
  });

  it("flags items the AI wants a human to follow up on", () => {
    mockUseQuery.mockReturnValue({
      canApprove: true,
      items: [{ ...pendingItem, aiNeedsReview: 0.91 }],
    });
    renderPanel();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("omits the needs-review chip for a low probability", () => {
    mockUseQuery.mockReturnValue({
      canApprove: true,
      items: [{ ...pendingItem, aiNeedsReview: 0.2 }],
    });
    renderPanel();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
  });

  it("approves through the shared update mutation", async () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [pendingItem] });
    renderPanel();
    fireEvent.click(
      screen.getByRole("button", { name: "Approve Broken export" })
    );
    await waitFor(() =>
      expect(mockUpdateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        isApproved: true,
      })
    );
  });

  it("dismisses through the shared remove mutation", async () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [pendingItem] });
    renderPanel();
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss Broken export" })
    );
    await waitFor(() =>
      expect(mockRemoveFeedback).toHaveBeenCalledWith({ id: feedbackId })
    );
  });

  it("hides the approve control from members who cannot approve", () => {
    mockUseQuery.mockReturnValue({ canApprove: false, items: [pendingItem] });
    renderPanel();
    expect(
      screen.queryByRole("button", { name: "Approve Broken export" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Broken export" })
    ).toBeInTheDocument();
  });
});
