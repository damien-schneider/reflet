import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoteButton } from "./vote-button";

// Mock Convex
const mockToggleVote = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockToggleVote,
}));

// Mock Auth
const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

// Mock Jotai
const mockSetAuthDialogOpen = vi.fn();
vi.mock("jotai", () => ({
  useSetAtom: () => mockSetAuthDialogOpen,
  atom: vi.fn(),
}));

// Mock Tooltip to avoid portal issues and simplify testing
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock dependencies with specific types
vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    votes: {
      toggle: "votes:toggle",
    },
  },
}));

describe("VoteButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders correctly with vote count and correct aria-label (not voted)", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "user1" } } });
    // @ts-expect-error - mocking Id
    render(<VoteButton feedbackId="123" hasVoted={false} voteCount={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: /Vote, currently 42 votes/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("renders correctly when voted", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "user1" } } });
    // @ts-expect-error - mocking Id
    render(<VoteButton feedbackId="123" hasVoted={true} voteCount={43} />);

    expect(screen.getByText("43")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: /Remove vote, currently 43 votes/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("calls toggleVote when clicked (authenticated)", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "user1" } } });
    mockToggleVote.mockResolvedValue(null);

    // @ts-expect-error - mocking Id
    render(<VoteButton feedbackId="123" hasVoted={false} voteCount={42} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockToggleVote).toHaveBeenCalledWith({ feedbackId: "123" });
  });

  it("opens auth dialog when clicked (unauthenticated)", () => {
    mockUseSession.mockReturnValue({ data: null }); // No user

    // @ts-expect-error - mocking Id
    render(<VoteButton feedbackId="123" hasVoted={false} voteCount={42} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockToggleVote).not.toHaveBeenCalled();
    expect(mockSetAuthDialogOpen).toHaveBeenCalledWith(true);
  });

  it("disables button while loading", async () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "user1" } } });
    // Create a promise that we can control or just one that takes time
    mockToggleVote.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    // @ts-expect-error - mocking Id
    render(<VoteButton feedbackId="123" hasVoted={false} voteCount={42} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(button).toBeDisabled();
    // We can't easily check for the spinner SVG without strict class checking,
    // but disabled state is a good proxy for "loading state activated"
  });

  it("stops propagation of click event", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "user1" } } });
    const handleClickOuter = vi.fn();

    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: Testing propagation
      // biome-ignore lint/a11y/useKeyWithClickEvents: Testing propagation
      <div onClick={handleClickOuter}>
        {/* @ts-expect-error - mocking Id */}
        <VoteButton feedbackId="123" hasVoted={false} voteCount={42} />
      </div>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClickOuter).not.toHaveBeenCalled();
  });
});
