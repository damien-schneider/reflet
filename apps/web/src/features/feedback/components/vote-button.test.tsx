import { cleanup, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { VoteButton } from "./vote-button";

// Mock dependencies
vi.mock("convex/react", () => ({
  useMutation: () => ({
    withOptimisticUpdate: () => vi.fn(),
  }),
}));

vi.mock("jotai", () => ({
  useAtomValue: vi.fn(),
  atom: vi.fn(),
}));

vi.mock("@/hooks/use-auth-guard");

vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    votes: { toggle: "toggle" },
    feedback_list: { list: "list", listForRoadmap: "listForRoadmap" },
  },
}));

// Mock Shadcn UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    onClick,
    "aria-label": ariaLabel,
    "aria-pressed": ariaPressed,
    variant,
  }: any) => (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={className}
      data-variant={variant}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <span data-testid="caret-up" />,
}));

describe("VoteButton", () => {
  const mockFeedbackId = "feedback-1" as any;
  const mockBoardId = "board-1" as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth guard mock
    (useAuthGuard as Mock).mockReturnValue({
      isAuthenticated: true,
      guard: (fn: any) => fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should render with correct vote count", () => {
    render(
      <VoteButton
        boardId={mockBoardId}
        feedbackId={mockFeedbackId}
        hasVoted={false}
        voteCount={42}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should have correct accessibility attributes when not voted", () => {
    render(
      <VoteButton
        boardId={mockBoardId}
        feedbackId={mockFeedbackId}
        hasVoted={false}
        voteCount={10}
      />
    );

    const button = screen.getByRole("button");
    // Initially expected to fail until implementation
    expect(button).toHaveAttribute("aria-label", "Upvote feedback");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("should have correct accessibility attributes when voted", () => {
    render(
      <VoteButton
        boardId={mockBoardId}
        feedbackId={mockFeedbackId}
        hasVoted={true}
        voteCount={11}
      />
    );

    const button = screen.getByRole("button");
    // Initially expected to fail until implementation
    expect(button).toHaveAttribute("aria-label", "Remove vote");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
