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

vi.mock("@reflet/ui/feedback-editorial-feed", () => ({
  EditorialFeedComments: ({ count }: { count: number }) => (
    <span data-testid="comments">{count}</span>
  ),
  EditorialFeedContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  EditorialFeedItem: ({
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
      data-testid="feed-item"
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
  EditorialFeedMeta: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="meta">{children}</div>
  ),
  EditorialFeedRule: () => <hr data-testid="rule" />,
  EditorialFeedStatus: ({
    children,
    color,
  }: {
    children: React.ReactNode;
    color: string;
  }) => (
    <span data-color={color} data-testid="status">
      {children}
    </span>
  ),
  EditorialFeedTag: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tag">{children}</span>
  ),
  EditorialFeedTime: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="time">{children}</span>
  ),
  EditorialFeedTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="title">{children}</h3>
  ),
  EditorialFeedVote: () => <div data-testid="vote" />,
}));

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { EditorialFeedFeedCard } from "./editorial-feed-card";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseFeedback = {
  _id: "f1" as Id<"feedback">,
  title: "Test Feedback",
  voteCount: 10,
  commentCount: 3,
  createdAt: Date.now() - 60_000,
  organizationId: "org1" as Id<"organizations">,
  upvoteCount: 8,
  downvoteCount: 2,
  userVoteType: null as "upvote" | "downvote" | null,
  tags: [] as Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>,
};

describe("EditorialFeedFeedCard", () => {
  it("renders title", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("renders comment count", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("comments")).toHaveTextContent("3");
  });

  it("renders time element", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("time")).toBeInTheDocument();
  });

  it("passes upvotes and downvotes to feed item", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    const item = screen.getByTestId("feed-item");
    expect(item).toHaveAttribute("data-upvotes", "8");
    expect(item).toHaveAttribute("data-downvotes", "2");
  });

  it("calls onClick with feedback id when clicked", () => {
    const onClick = vi.fn();
    render(<EditorialFeedFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Enter keydown", () => {
    const onClick = vi.fn();
    render(<EditorialFeedFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Enter",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Space keydown", () => {
    const onClick = vi.fn();
    render(<EditorialFeedFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: " ",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("does not call onClick for other keys", () => {
    const onClick = vi.fn();
    render(<EditorialFeedFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Tab",
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("handles vote upvote via authGuard", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("upvote-btn"));
    expect(mockAuthGuard).toHaveBeenCalled();
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "upvote",
    });
  });

  it("handles vote downvote via authGuard", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("downvote-btn"));
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "downvote",
    });
  });

  it("renders pinned icon when isPinned", () => {
    render(
      <EditorialFeedFeedCard feedback={{ ...baseFeedback, isPinned: true }} />
    );
    expect(screen.getByTestId("pin-icon")).toBeInTheDocument();
  });

  it("does not render pinned icon when not pinned", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("pin-icon")).not.toBeInTheDocument();
  });

  it("renders status when organizationStatus is present", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{
          ...baseFeedback,
          organizationStatus: { name: "In Progress", color: "blue" },
        }}
      />
    );
    expect(screen.getByTestId("status")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("status")).toHaveAttribute("data-color", "blue");
  });

  it("does not render status when not present", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("status")).not.toBeInTheDocument();
  });

  it("renders tags", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: "t1" as Id<"tags">, name: "Bug", color: "red" },
            { _id: "t2" as Id<"tags">, name: "Feature", color: "blue" },
          ],
        }}
      />
    );
    expect(screen.getAllByTestId("tag")).toHaveLength(2);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("renders sparkle icon for AI-applied tags", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            {
              _id: "t1" as Id<"tags">,
              name: "Bug",
              color: "red",
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
      <EditorialFeedFeedCard
        feedback={{
          ...baseFeedback,
          tags: [null, { _id: "t1" as Id<"tags">, name: "Bug", color: "red" }],
        }}
      />
    );
    expect(screen.getAllByTestId("tag")).toHaveLength(1);
  });

  it("uses voteCount fallback when upvoteCount is undefined", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{ ...baseFeedback, upvoteCount: undefined }}
      />
    );
    const item = screen.getByTestId("feed-item");
    expect(item).toHaveAttribute("data-upvotes", "10");
  });

  it("passes userVoteType to feed item", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{ ...baseFeedback, userVoteType: "upvote" }}
      />
    );
    expect(screen.getByTestId("feed-item")).toHaveAttribute(
      "data-vote-type",
      "upvote"
    );
  });

  it("passes null voteType when userVoteType is undefined", () => {
    render(
      <EditorialFeedFeedCard
        feedback={{ ...baseFeedback, userVoteType: undefined }}
      />
    );
    const item = screen.getByTestId("feed-item");
    expect(item.getAttribute("data-vote-type")).toBeNull();
  });

  it("does not crash when onClick is not provided", () => {
    render(<EditorialFeedFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
  });

  it("applies custom className", () => {
    render(
      <EditorialFeedFeedCard className="custom-class" feedback={baseFeedback} />
    );
    expect(screen.getByRole("button", { name: /test feedback/i })).toHaveClass(
      "custom-class"
    );
  });

  it("renders with tags=undefined", () => {
    render(
      <EditorialFeedFeedCard feedback={{ ...baseFeedback, tags: undefined }} />
    );
    expect(screen.queryByTestId("tag")).not.toBeInTheDocument();
  });
});
