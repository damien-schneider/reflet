import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  ChatIcon: () => <span data-testid="icon-chat" />,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  domAnimation: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    span: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("./mock-data", () => ({
  MOCK: {
    title: "Test Title",
    status: { name: "Planned", color: "blue" },
    tags: [
      { id: "1", name: "UX", color: "purple" },
      { id: "2", name: "Feature", color: "green" },
    ],
    commentCount: 7,
    timeAgo: "3 days ago",
    upvotes: 24,
    downvotes: 3,
  },
}));

import {
  AnimatedCount,
  CardMeta,
  CardTags,
  CardTitle,
  FullCard,
  MockCard,
  useVoteState,
} from "./shared-helpers";

afterEach(cleanup);

describe("useVoteState", () => {
  it("initializes with given values", () => {
    let result: ReturnType<typeof useVoteState> | undefined;
    const TestComponent = () => {
      result = useVoteState(10, 2);
      return null;
    };
    render(<TestComponent />);
    expect(result?.upvotes).toBe(10);
    expect(result?.downvotes).toBe(2);
    expect(result?.voteType).toBeNull();
  });

  it("toggles upvote on", async () => {
    let result: ReturnType<typeof useVoteState> | undefined;
    const TestComponent = () => {
      result = useVoteState(10, 2);
      return (
        <button onClick={() => result?.vote("upvote")} type="button">
          Vote
        </button>
      );
    };
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByText("Vote"));
    expect(result?.voteType).toBe("upvote");
    expect(result?.upvotes).toBe(11);
  });

  it("toggles upvote off", async () => {
    let result: ReturnType<typeof useVoteState> | undefined;
    const TestComponent = () => {
      result = useVoteState(10, 2);
      return (
        <button onClick={() => result?.vote("upvote")} type="button">
          Vote
        </button>
      );
    };
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByText("Vote"));
    await user.click(screen.getByText("Vote"));
    expect(result?.voteType).toBeNull();
    expect(result?.upvotes).toBe(10);
  });

  it("switches from upvote to downvote", async () => {
    let result: ReturnType<typeof useVoteState> | undefined;
    const TestComponent = () => {
      result = useVoteState(10, 2);
      return (
        <>
          <button onClick={() => result?.vote("upvote")} type="button">
            Up
          </button>
          <button onClick={() => result?.vote("downvote")} type="button">
            Down
          </button>
        </>
      );
    };
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByText("Up"));
    expect(result?.upvotes).toBe(11);
    await user.click(screen.getByText("Down"));
    expect(result?.voteType).toBe("downvote");
    expect(result?.upvotes).toBe(10);
    expect(result?.downvotes).toBe(3);
  });
});

describe("AnimatedCount", () => {
  it("renders value", () => {
    render(<AnimatedCount value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<AnimatedCount className="custom" value={5} />);
    expect(screen.getByText("5")).toHaveClass("custom");
  });
});

describe("CardMeta", () => {
  it("renders comment count and time", () => {
    render(<CardMeta />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
  });
});

describe("CardTags", () => {
  it("renders tag names", () => {
    render(<CardTags />);
    expect(screen.getByText("UX")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders title and status", () => {
    render(<CardTitle />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });
});

describe("MockCard", () => {
  it("renders with vote slot", () => {
    render(<MockCard voteSlot={<div data-testid="vote-slot">votes</div>} />);
    expect(screen.getByTestId("vote-slot")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });
});

describe("FullCard", () => {
  it("renders children", () => {
    render(
      <FullCard>
        <span>content</span>
      </FullCard>
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
