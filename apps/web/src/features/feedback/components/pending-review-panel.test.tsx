/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";

const { mockToast, mockUpdateFeedback } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  mockUpdateFeedback: vi.fn().mockResolvedValue(undefined),
}));
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateFeedback,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      mutations: { update: "feedback_mutations.update" },
      publication: { setState: "feedback_publication.setState" },
      review: { listPendingReview: "feedback_review.listPendingReview" },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: mockToast,
}));

import { PendingReviewPanel } from "./pending-review-panel";

const organizationId = toId("organizations", "org1");
const feedbackId = toId("feedback", "fb1");

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
    expect(screen.getByText("All caught up")).toBeInTheDocument();
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
    expect(screen.getByText("Needs clarification")).toBeInTheDocument();
  });

  it("hides the clarification warning after an explicit human correction", () => {
    mockUseQuery.mockReturnValue({
      canApprove: true,
      items: [
        { ...pendingItem, aiNeedsReview: 0.91, needsClarification: false },
      ],
    });
    renderPanel();
    expect(screen.queryByText("Needs clarification")).not.toBeInTheDocument();
  });

  it("omits the needs-review chip for a low probability", () => {
    mockUseQuery.mockReturnValue({
      canApprove: true,
      items: [{ ...pendingItem, aiNeedsReview: 0.2 }],
    });
    renderPanel();
    expect(screen.queryByText("Needs clarification")).not.toBeInTheDocument();
  });

  it("approves through the shared update mutation", async () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [pendingItem] });
    renderPanel();
    fireEvent.click(
      screen.getByRole("button", { name: "Approve Broken export" })
    );
    await waitFor(() =>
      expect(mockUpdateFeedback).toHaveBeenCalledWith({
        feedbackId,
        state: "approved",
      })
    );
  });

  it("dismisses through the shared remove mutation after confirming", async () => {
    mockUseQuery.mockReturnValue({ canApprove: true, items: [pendingItem] });
    renderPanel();
    fireEvent.click(
      screen.getByRole("button", { name: "Reject Broken export" })
    );
    expect(mockUpdateFeedback).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole("button", { name: "Reject and archive" })
    );
    await waitFor(() =>
      expect(mockUpdateFeedback).toHaveBeenCalledWith({
        feedbackId,
        state: "rejected",
      })
    );
  });

  it("approves every pending item at once", async () => {
    const secondId = toId("feedback", "fb2");
    mockUseQuery.mockReturnValue({
      canApprove: true,
      items: [pendingItem, { ...pendingItem, _id: secondId, title: "Slow" }],
    });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Approve all 2/ }));
    await waitFor(() => expect(mockUpdateFeedback).toHaveBeenCalledTimes(2));
    expect(mockUpdateFeedback).toHaveBeenCalledWith({
      feedbackId: secondId,
      state: "approved",
    });
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
