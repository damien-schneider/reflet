import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoteButton } from "./vote-button";

// Mock icons
vi.mock("@phosphor-icons/react", () => ({
  CaretUp: () => <svg data-testid="caret-up-icon" />,
}));

// Mock convex
const mockToggleVote = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => {
    const fn = (...args: any[]) => mockToggleVote(...args);
    fn.withOptimisticUpdate = () => fn;
    return fn;
  },
}));

// Mock jotai
vi.mock("jotai", () => ({
  useAtomValue: vi.fn(),
  atom: vi.fn(),
}));

// Mock auth guard
const mockAuthGuard = vi.fn((cb) => cb());
vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => ({
    guard: mockAuthGuard,
    isAuthenticated: true,
  }),
}));

// Mock tooltip
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock button
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    "aria-pressed": ariaPressed,
    ...props
  }: any) => (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("VoteButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    feedbackId: "feedback123" as Id<"feedback">,
    voteCount: 10,
    hasVoted: false,
  };

  it("should render with vote count and icon", () => {
    render(<VoteButton {...defaultProps} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByTestId("caret-up-icon")).toBeInTheDocument();
  });

  it("should have correct accessibility attributes when not voted", () => {
    render(<VoteButton {...defaultProps} hasVoted={false} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Upvote");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("should have correct accessibility attributes when voted", () => {
    render(<VoteButton {...defaultProps} hasVoted={true} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Remove vote");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("should show correct tooltip text when not voted", () => {
    render(<VoteButton {...defaultProps} hasVoted={false} />);
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Upvote");
  });

  it("should show correct tooltip text when voted", () => {
    render(<VoteButton {...defaultProps} hasVoted={true} />);
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent(
      "Remove vote"
    );
  });

  it("should call toggleVote when clicked", () => {
    render(<VoteButton {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(mockAuthGuard).toHaveBeenCalled();
    expect(mockToggleVote).toHaveBeenCalledWith({
      feedbackId: defaultProps.feedbackId,
      voteType: "upvote",
    });
  });

  it("should stop propagation on click", () => {
    const handleParentClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: testing click propagation
      // biome-ignore lint/a11y/noStaticElementInteractions: testing click propagation
      // biome-ignore lint/a11y/noNoninteractiveElementInteractions: testing click propagation
      <div onClick={handleParentClick}>
        <VoteButton {...defaultProps} />
      </div>
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(handleParentClick).not.toHaveBeenCalled();
  });
});
