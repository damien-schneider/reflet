import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoteButton } from "./vote-button";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

// Mocks
vi.mock("convex/react", () => ({
  useMutation: () => ({ withOptimisticUpdate: () => vi.fn() }),
}));

vi.mock("jotai", () => ({
  useAtomValue: () => "mockValue",
  atom: () => "mockAtom",
}));

vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => ({ guard: vi.fn(), isAuthenticated: true }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, "aria-label": ariaLabel, "aria-pressed": ariaPressed, onClick }: any) => (
    <button aria-label={ariaLabel} aria-pressed={ariaPressed} onClick={onClick}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "mock-button-class",
}));

vi.mock("@reflet-v2/backend/convex/_generated/api", () => ({
  api: {
    votes: { toggle: "toggle" },
    feedback_list: { list: "list", listForRoadmap: "listForRoadmap" },
  },
}));

describe("VoteButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("should have correct accessibility attributes when not voted", () => {
    render(
      <VoteButton
        feedbackId={"123" as Id<"feedback">}
        voteCount={10}
        hasVoted={false}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Upvote (10)");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("should have correct accessibility attributes when voted", () => {
    render(
      <VoteButton
        feedbackId={"123" as Id<"feedback">}
        voteCount={11}
        hasVoted={true}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Remove vote (11)");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
