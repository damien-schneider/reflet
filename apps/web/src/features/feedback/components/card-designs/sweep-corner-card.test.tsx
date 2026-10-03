import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockVote = vi.fn();

vi.mock("@phosphor-icons/react", () => ({
  PushPin: ({ className }: { className?: string }) => (
    <span className={className} data-testid="pin-icon" />
  ),
  Sparkle: ({ className }: { className?: string }) => (
    <span className={className} data-testid="sparkle-icon" />
  ),
}));

vi.mock("@reflet/ui/feedback-sweep-corner", () => ({
  SweepCorner: ({
    children,
    className,
    onVote,
    upvotes,
    downvotes,
    voteType,
  }: {
    children: React.ReactNode;
    className?: string;
    onVote: (d: string) => void;
    upvotes: number;
    downvotes: number;
    voteType: string | null;
  }) => (
    <div
      className={className}
      data-downvotes={downvotes}
      data-testid="sweep"
      data-upvotes={upvotes}
      data-vote-type={voteType}
    >
      <button onClick={() => onVote("upvote")} type="button">
        upvote-btn
      </button>
      <button onClick={() => onVote("downvote")} type="button">
        downvote-btn
      </button>
      {children}
    </div>
  ),
  SweepCornerBadge: () => <div data-testid="badge" />,
  SweepCornerCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="sweep-card">
      {children}
    </div>
  ),
  SweepCornerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SweepCornerFooter: ({
    comments,
    time,
  }: {
    comments: number;
    time: string;
  }) => (
    <div data-testid="footer">
      <span data-testid="comments">{comments}</span>
      <span data-testid="time">{time}</span>
    </div>
  ),
  SweepCornerTag: ({
    children,
    color,
  }: {
    children: React.ReactNode;
    color: string;
  }) => (
    <span data-color={color} data-testid="tag">
      {children}
    </span>
  ),
  SweepCornerTags: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tags">{children}</div>
  ),
  SweepCornerTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="title">{children}</h3>
  ),
}));

import { SweepCornerFeedCard } from "@/features/feedback/components/card-designs/sweep-corner-card";
import type { FeedbackItem } from "@/features/feedback/components/feed-feedback-view";
import { toId } from "@/lib/convex-helpers";

afterEach(() => {
  vi.clearAllMocks();
});

const baseFeedback: FeedbackItem = {
  _id: toId("feedback", "f1"),
  commentCount: 4,
  createdAt: Date.now() - 60_000,
  downvoteCount: 4,
  organizationId: toId("organizations", "org1"),
  tags: [],
  title: "Test Feedback",
  upvoteCount: 6,
  userVoteType: null,
  voteCount: 10,
};

describe("SweepCornerFeedCard", () => {
  it("renders title", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("renders comment count in footer", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.getByTestId("comments")).toHaveTextContent("4");
  });

  it("passes upvotes and downvotes", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    const sweep = screen.getByTestId("sweep");
    expect(sweep).toHaveAttribute("data-upvotes", "6");
    expect(sweep).toHaveAttribute("data-downvotes", "4");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <SweepCornerFeedCard
        feedback={baseFeedback}
        onClick={onClick}
        onVote={mockVote}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("forwards upvote with the feedback id", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    fireEvent.click(screen.getByText("upvote-btn"));
    expect(mockVote).toHaveBeenCalledWith("f1", "upvote");
  });

  it("forwards downvote with the feedback id", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    fireEvent.click(screen.getByText("downvote-btn"));
    expect(mockVote).toHaveBeenCalledWith("f1", "downvote");
  });

  it("renders pinned icon when isPinned", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, isPinned: true }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("pin-icon")).toBeInTheDocument();
  });

  it("applies pinned styles to card", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, isPinned: true }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("sweep-card").className).toContain(
      "border-primary/50"
    );
  });

  it("does not render pin icon when not pinned", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.queryByTestId("pin-icon")).not.toBeInTheDocument();
  });

  it("renders status tag when present", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          organizationStatus: { color: "green", name: "Done" },
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it.each([
    { color: "green", isApproved: true, label: "Approved for publication" },
    { color: "yellow", isApproved: false, label: "Pending publication review" },
    {
      color: "red",
      isApproved: false,
      label: "Publication rejected",
      publicationRejectedAt: 1,
    },
    {
      color: "neutral",
      isApproved: true,
      isInternal: true,
      label: "Internal",
    },
  ])(
    "distinguishes $label with its publication tone",
    ({ color, label, ...publication }) => {
      render(
        <SweepCornerFeedCard
          feedback={{ ...baseFeedback, ...publication, isMember: true }}
          onVote={mockVote}
        />
      );
      expect(screen.getByText(label)).toHaveAttribute("data-color", color);
    }
  );

  it("distinguishes clarification from a suggested rejection", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          aiJunk: 0.92,
          aiNeedsReview: 0.85,
          isMember: true,
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByText("Needs clarification")).toHaveAttribute(
      "data-color",
      "orange"
    );
    expect(screen.getByText("92%")).toHaveAttribute("data-color", "red");
    expect(screen.getByText("Junk risk:")).toBeVisible();
    expect(screen.getByText("Unassigned")).toHaveAttribute(
      "data-color",
      "neutral"
    );
  });

  it("keeps team publication and triage properties off public cards", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          aiJunk: 0.92,
          aiNeedsReview: 0.85,
          isApproved: false,
          isMember: false,
          organizationStatus: { color: "green", name: "Done" },
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(
      screen.queryByText("Pending publication review")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Needs clarification")).not.toBeInTheDocument();
    expect(screen.queryByText("92%")).not.toBeInTheDocument();
  });

  it("does not render status when absent", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.queryByTestId("tag")).not.toBeInTheDocument();
  });

  it("renders tags when provided", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: toId("tags", "t1"), color: "red", name: "Bug" },
            { _id: toId("tags", "t2"), color: "blue", name: "Feature" },
          ],
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("does not render tags section when tags empty", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.queryByTestId("tags")).not.toBeInTheDocument();
  });

  it("renders tag icon when provided", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: toId("tags", "t1"), color: "red", icon: "🐛", name: "Bug" },
          ],
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByText("🐛")).toBeInTheDocument();
  });

  it("renders sparkle for AI-applied tags", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            {
              _id: toId("tags", "t1"),
              appliedByAi: true,
              color: "purple",
              name: "AI",
            },
          ],
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("sparkle-icon")).toBeInTheDocument();
  });

  it("filters null tags", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [null, { _id: toId("tags", "t1"), color: "red", name: "Bug" }],
        }}
        onVote={mockVote}
      />
    );
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("uses voteCount fallback when upvoteCount undefined", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, upvoteCount: undefined }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("sweep")).toHaveAttribute("data-upvotes", "10");
  });

  it("passes voteType", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, userVoteType: "upvote" }}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("sweep")).toHaveAttribute(
      "data-vote-type",
      "upvote"
    );
  });

  it("does not crash without onClick", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
  });

  it("applies custom className", () => {
    render(
      <SweepCornerFeedCard
        className="my-cls"
        feedback={baseFeedback}
        onVote={mockVote}
      />
    );
    expect(screen.getByTestId("sweep")).toHaveClass("my-cls");
  });

  it("renders time in footer", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} onVote={mockVote} />);
    expect(screen.getByTestId("time")).toBeInTheDocument();
  });
});
