import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockToggleVote = vi.fn().mockResolvedValue(undefined);
const mockAuthGuard = vi.fn((cb: () => void) => cb());

vi.mock("convex/react", () => ({
  useMutation: () => mockToggleVote,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: { votes: { toggle: "votes:toggle" } },
}));

vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => ({ guard: mockAuthGuard }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

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
    onVote,
    upvotes,
    downvotes,
    voteType,
  }: {
    children: React.ReactNode;
    onVote: (d: string) => void;
    upvotes: number;
    downvotes: number;
    voteType: string | null;
  }) => (
    <div
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

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { SweepCornerFeedCard } from "./sweep-corner-card";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseFeedback = {
  _id: "f1" as Id<"feedback">,
  title: "Test Feedback",
  voteCount: 10,
  commentCount: 4,
  createdAt: Date.now() - 60_000,
  organizationId: "org1" as Id<"organizations">,
  upvoteCount: 6,
  downvoteCount: 4,
  userVoteType: null as "upvote" | "downvote" | null,
  tags: [] as Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>,
};

describe("SweepCornerFeedCard", () => {
  it("renders title", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("renders comment count in footer", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("comments")).toHaveTextContent("4");
  });

  it("renders badge", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("passes upvotes and downvotes", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    const sweep = screen.getByTestId("sweep");
    expect(sweep).toHaveAttribute("data-upvotes", "6");
    expect(sweep).toHaveAttribute("data-downvotes", "4");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SweepCornerFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Enter key", () => {
    const onClick = vi.fn();
    render(<SweepCornerFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Enter",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Space key", () => {
    const onClick = vi.fn();
    render(<SweepCornerFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: " ",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("ignores other keys", () => {
    const onClick = vi.fn();
    render(<SweepCornerFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Tab",
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("handles upvote through authGuard", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("upvote-btn"));
    expect(mockAuthGuard).toHaveBeenCalled();
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "upvote",
    });
  });

  it("handles downvote through authGuard", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("downvote-btn"));
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "downvote",
    });
  });

  it("renders pinned icon when isPinned", () => {
    render(
      <SweepCornerFeedCard feedback={{ ...baseFeedback, isPinned: true }} />
    );
    expect(screen.getByTestId("pin-icon")).toBeInTheDocument();
  });

  it("applies pinned styles to card", () => {
    render(
      <SweepCornerFeedCard feedback={{ ...baseFeedback, isPinned: true }} />
    );
    expect(screen.getByTestId("sweep-card").className).toContain(
      "border-primary/50"
    );
  });

  it("does not render pin icon when not pinned", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("pin-icon")).not.toBeInTheDocument();
  });

  it("renders status tag when present", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          organizationStatus: { name: "Done", color: "green" },
        }}
      />
    );
    const tags = screen.getAllByTestId("tag");
    const statusTag = tags.find((t) => t.textContent?.includes("Done"));
    expect(statusTag).toBeDefined();
    expect(statusTag).toHaveAttribute("data-color", "green");
  });

  it("does not render status when absent", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("tag")).not.toBeInTheDocument();
  });

  it("renders tags when provided", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: "t1" as Id<"tags">, name: "Bug", color: "red" },
            { _id: "t2" as Id<"tags">, name: "Feature", color: "blue" },
          ],
        }}
      />
    );
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("does not render tags section when tags empty", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("tags")).not.toBeInTheDocument();
  });

  it("renders tag icon when provided", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: "t1" as Id<"tags">, name: "Bug", color: "red", icon: "🐛" },
          ],
        }}
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
              _id: "t1" as Id<"tags">,
              name: "AI",
              color: "purple",
              appliedByAi: true,
            },
          ],
        }}
      />
    );
    expect(screen.getByTestId("sparkle-icon")).toBeInTheDocument();
  });

  it("filters null tags", () => {
    render(
      <SweepCornerFeedCard
        feedback={{
          ...baseFeedback,
          tags: [null, { _id: "t1" as Id<"tags">, name: "Bug", color: "red" }],
        }}
      />
    );
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("uses voteCount fallback when upvoteCount undefined", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, upvoteCount: undefined }}
      />
    );
    expect(screen.getByTestId("sweep")).toHaveAttribute("data-upvotes", "10");
  });

  it("passes voteType", () => {
    render(
      <SweepCornerFeedCard
        feedback={{ ...baseFeedback, userVoteType: "upvote" }}
      />
    );
    expect(screen.getByTestId("sweep")).toHaveAttribute(
      "data-vote-type",
      "upvote"
    );
  });

  it("does not crash without onClick", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
  });

  it("applies custom className", () => {
    render(<SweepCornerFeedCard className="my-cls" feedback={baseFeedback} />);
    expect(screen.getByRole("button", { name: /test feedback/i })).toHaveClass(
      "my-cls"
    );
  });

  it("renders time in footer", () => {
    render(<SweepCornerFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("time")).toBeInTheDocument();
  });
});
