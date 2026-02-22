import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockDeleteFeedback = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: () => mockDeleteFeedback,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback_actions: { remove: "feedback_actions:remove" },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Chat: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-chat" />
  ),
  PushPin: ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon-pin" />
  ),
  Sparkle: () => <span data-testid="icon-sparkle" />,
  Trash: () => <span data-testid="icon-trash" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    color,
    className,
  }: {
    children: React.ReactNode;
    color?: string;
    className?: string;
  }) => (
    <span className={className} data-color={color} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ContextListContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-content">{children}</div>
  ),
  ContextListItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  ContextListTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/features/feedback/components/vote-button", () => ({
  VoteButton: ({
    voteCount,
    hasVoted,
  }: {
    voteCount: number;
    hasVoted?: boolean;
  }) => (
    <div data-has-voted={hasVoted} data-testid="vote-button">
      {voteCount}
    </div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("./ai-mini-indicator", () => ({
  AiMiniIndicator: ({ label }: { label: string }) => (
    <span data-testid="ai-indicator">{label}</span>
  ),
}));

import { FeedbackListItem } from "./feedback-list-item";

afterEach(cleanup);

const makeFeedback = (
  overrides: Partial<Record<string, unknown>> = {}
): Doc<"feedback"> & {
  hasVoted?: boolean;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
    appliedByAi?: boolean;
  }>;
  organizationStatus?: { name: string; color: string } | null;
  author?: { name: string | null; email: string; image: string | null } | null;
} =>
  ({
    _id: "fb1" as Id<"feedback">,
    _creationTime: Date.now(),
    title: "Test Feedback",
    description: "A test description",
    voteCount: 12,
    commentCount: 3,
    createdAt: Date.now() - 86_400_000,
    organizationId: "org1" as Id<"organizations">,
    isPinned: false,
    hasVoted: false,
    tags: [],
    organizationStatus: null,
    author: { name: "John", email: "john@test.com", image: null },
    ...overrides,
  }) as never;

describe("FeedbackListItem", () => {
  it("renders title", () => {
    render(<FeedbackListItem feedback={makeFeedback()} />);
    expect(screen.getByText("Test Feedback")).toBeInTheDocument();
  });

  it("renders vote button with count", () => {
    render(<FeedbackListItem feedback={makeFeedback()} />);
    expect(screen.getByTestId("vote-button")).toHaveTextContent("12");
  });

  it("renders author name", () => {
    render(<FeedbackListItem feedback={makeFeedback()} />);
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("renders Unknown when author is missing", () => {
    render(<FeedbackListItem feedback={makeFeedback({ author: null })} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders comment count", () => {
    render(<FeedbackListItem feedback={makeFeedback()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          tags: [
            { _id: "t1", name: "Bug", color: "red", icon: "🐛" },
            { _id: "t2", name: "Feature", color: "blue" },
          ],
        })}
      />
    );
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("🐛")).toBeInTheDocument();
  });

  it("renders organization status badge", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          organizationStatus: { name: "Open", color: "green" },
        })}
      />
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders pin icon when isPinned", () => {
    render(<FeedbackListItem feedback={makeFeedback({ isPinned: true })} />);
    expect(screen.getByTestId("icon-pin")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<FeedbackListItem feedback={makeFeedback()} onClick={onClick} />);
    await user.click(screen.getByText("Test Feedback"));
    expect(onClick).toHaveBeenCalledWith("fb1");
  });

  it("renders AI priority indicator", () => {
    render(
      <FeedbackListItem feedback={makeFeedback({ aiPriority: "high" })} />
    );
    expect(screen.getByText("P: high")).toBeInTheDocument();
  });

  it("renders AI complexity indicator", () => {
    render(
      <FeedbackListItem feedback={makeFeedback({ aiComplexity: "low" })} />
    );
    expect(screen.getByText("C: low")).toBeInTheDocument();
  });

  it("prefers manual priority over AI priority", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          priority: "critical",
          aiPriority: "low",
        })}
      />
    );
    expect(screen.getByText("P: critical")).toBeInTheDocument();
  });

  it("shows delete context menu for admin", () => {
    render(<FeedbackListItem feedback={makeFeedback()} isAdmin={true} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows delete context menu for author", () => {
    render(<FeedbackListItem feedback={makeFeedback()} isAuthor={true} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("hides delete for non-admin non-author", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback()}
        isAdmin={false}
        isAuthor={false}
      />
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("does not render tags section when tags empty", () => {
    render(<FeedbackListItem feedback={makeFeedback({ tags: [] })} />);
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
  });

  it("renders hasVoted state on vote button", () => {
    render(<FeedbackListItem feedback={makeFeedback({ hasVoted: true })} />);
    expect(screen.getByTestId("vote-button")).toHaveAttribute(
      "data-has-voted",
      "true"
    );
  });

  it("renders zero comment count", () => {
    render(<FeedbackListItem feedback={makeFeedback({ commentCount: 0 })} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders Unknown when author name is null", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          author: { name: null, email: "user@test.com", image: null },
        })}
      />
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("prefers manual complexity over AI complexity", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          complexity: "high",
          aiComplexity: "low",
        })}
      />
    );
    expect(screen.getByText("C: high")).toBeInTheDocument();
  });

  it("renders tag icon when present", () => {
    render(
      <FeedbackListItem
        feedback={makeFeedback({
          tags: [{ _id: "t1", name: "Bug", color: "red", icon: "🐛" }],
        })}
      />
    );
    expect(screen.getByText("🐛")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog on Delete click", async () => {
    const user = userEvent.setup();
    render(<FeedbackListItem feedback={makeFeedback()} isAdmin={true} />);
    await user.click(screen.getByText("Delete"));
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });
});
