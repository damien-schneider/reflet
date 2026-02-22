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

vi.mock("@reflet/ui/feedback-minimal-notch", () => ({
  MinimalNotch: ({
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
      data-testid="notch"
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
  MinimalNotchCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="notch-card">
      {children}
    </div>
  ),
  MinimalNotchMeta: ({
    comments,
    time,
  }: {
    comments: number;
    time: string;
  }) => (
    <div data-testid="meta">
      <span data-testid="comments">{comments}</span>
      <span data-testid="time">{time}</span>
    </div>
  ),
  MinimalNotchStatus: ({
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
  MinimalNotchTag: ({
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
  MinimalNotchTags: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tags">{children}</div>
  ),
  MinimalNotchTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="title">{children}</h3>
  ),
  MinimalNotchVote: () => <div data-testid="vote" />,
}));

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { MinimalNotchFeedCard } from "./minimal-notch-card";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseFeedback = {
  _id: "f1" as Id<"feedback">,
  title: "Test Feedback",
  voteCount: 10,
  commentCount: 5,
  createdAt: Date.now() - 60_000,
  organizationId: "org1" as Id<"organizations">,
  upvoteCount: 7,
  downvoteCount: 3,
  userVoteType: null as "upvote" | "downvote" | null,
  tags: [] as Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  } | null>,
};

describe("MinimalNotchFeedCard", () => {
  it("renders title", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("renders comment count", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    expect(screen.getByTestId("comments")).toHaveTextContent("5");
  });

  it("passes upvotes and downvotes", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    const notch = screen.getByTestId("notch");
    expect(notch).toHaveAttribute("data-upvotes", "7");
    expect(notch).toHaveAttribute("data-downvotes", "3");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<MinimalNotchFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Enter key", () => {
    const onClick = vi.fn();
    render(<MinimalNotchFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Enter",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("calls onClick on Space key", () => {
    const onClick = vi.fn();
    render(<MinimalNotchFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: " ",
    });
    expect(onClick).toHaveBeenCalledWith("f1");
  });

  it("ignores other keys", () => {
    const onClick = vi.fn();
    render(<MinimalNotchFeedCard feedback={baseFeedback} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /test feedback/i }), {
      key: "Escape",
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("handles upvote through authGuard", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("upvote-btn"));
    expect(mockAuthGuard).toHaveBeenCalled();
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "upvote",
    });
  });

  it("handles downvote through authGuard", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByText("downvote-btn"));
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: "f1",
      voteType: "downvote",
    });
  });

  it("renders pinned icon when isPinned=true", () => {
    render(
      <MinimalNotchFeedCard feedback={{ ...baseFeedback, isPinned: true }} />
    );
    expect(screen.getByTestId("pin-icon")).toBeInTheDocument();
  });

  it("applies pinned styles to card when isPinned", () => {
    render(
      <MinimalNotchFeedCard feedback={{ ...baseFeedback, isPinned: true }} />
    );
    expect(screen.getByTestId("notch-card").className).toContain(
      "border-primary/50"
    );
  });

  it("does not render pin icon when not pinned", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("pin-icon")).not.toBeInTheDocument();
  });

  it("renders status when present", () => {
    render(
      <MinimalNotchFeedCard
        feedback={{
          ...baseFeedback,
          organizationStatus: { name: "In Progress", color: "blue" },
        }}
      />
    );
    expect(screen.getByTestId("status")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("status")).toHaveAttribute("data-color", "blue");
  });

  it("does not render status when absent", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("status")).not.toBeInTheDocument();
  });

  it("renders tags section when tags exist", () => {
    render(
      <MinimalNotchFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            { _id: "t1" as Id<"tags">, name: "Bug", color: "red" },
            { _id: "t2" as Id<"tags">, name: "Feature", color: "green" },
          ],
        }}
      />
    );
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    expect(screen.getAllByTestId("tag")).toHaveLength(2);
  });

  it("does not render tags section when tags empty", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    expect(screen.queryByTestId("tags")).not.toBeInTheDocument();
  });

  it("renders tag icon when provided", () => {
    render(
      <MinimalNotchFeedCard
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
      <MinimalNotchFeedCard
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
      <MinimalNotchFeedCard
        feedback={{
          ...baseFeedback,
          tags: [
            null,
            { _id: "t1" as Id<"tags">, name: "Bug", color: "red" },
            null,
          ],
        }}
      />
    );
    expect(screen.getAllByTestId("tag")).toHaveLength(1);
  });

  it("uses voteCount fallback when upvoteCount undefined", () => {
    render(
      <MinimalNotchFeedCard
        feedback={{ ...baseFeedback, upvoteCount: undefined }}
      />
    );
    expect(screen.getByTestId("notch")).toHaveAttribute("data-upvotes", "10");
  });

  it("passes voteType correctly", () => {
    render(
      <MinimalNotchFeedCard
        feedback={{ ...baseFeedback, userVoteType: "downvote" }}
      />
    );
    expect(screen.getByTestId("notch")).toHaveAttribute(
      "data-vote-type",
      "downvote"
    );
  });

  it("does not crash without onClick", () => {
    render(<MinimalNotchFeedCard feedback={baseFeedback} />);
    fireEvent.click(screen.getByRole("button", { name: /test feedback/i }));
  });

  it("applies custom className", () => {
    render(
      <MinimalNotchFeedCard className="my-class" feedback={baseFeedback} />
    );
    expect(screen.getByRole("button", { name: /test feedback/i })).toHaveClass(
      "my-class"
    );
  });

  it("passes tag color prop", () => {
    render(
      <MinimalNotchFeedCard
        feedback={{
          ...baseFeedback,
          tags: [{ _id: "t1" as Id<"tags">, name: "Bug", color: "purple" }],
        }}
      />
    );
    expect(screen.getByTestId("tag")).toHaveAttribute("data-color", "purple");
  });
});
