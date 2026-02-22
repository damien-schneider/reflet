import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarImage: ({ alt }: { alt?: string }) => <img alt={alt} />,
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { MessageBubble } from "./message-bubble";

afterEach(cleanup);

const baseProps = {
  body: "Hello, world!",
  isOwnMessage: false,
  senderType: "user" as const,
  sender: { name: "Alice", email: "alice@test.com" },
};

describe("MessageBubble", () => {
  it("renders message body", () => {
    render(<MessageBubble {...baseProps} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("renders sender name when showAvatar is true", () => {
    render(<MessageBubble {...baseProps} showAvatar={true} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders 'You' for own messages", () => {
    render(<MessageBubble {...baseProps} isOwnMessage={true} showAvatar />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows (Support) label for admin senders who are not the current user", () => {
    render(
      <MessageBubble
        {...baseProps}
        isOwnMessage={false}
        senderType="admin"
        showAvatar
      />
    );
    expect(screen.getByText("(Support)")).toBeInTheDocument();
  });

  it("does not show (Support) label for own admin messages", () => {
    render(
      <MessageBubble
        {...baseProps}
        isOwnMessage={true}
        senderType="admin"
        showAvatar
      />
    );
    expect(screen.queryByText("(Support)")).not.toBeInTheDocument();
  });

  it("renders initials from name", () => {
    render(<MessageBubble {...baseProps} showAvatar />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders initials from email when name is missing", () => {
    render(
      <MessageBubble
        {...baseProps}
        sender={{ email: "bob@test.com" }}
        showAvatar
      />
    );
    expect(screen.getByText("BT")).toBeInTheDocument();
  });

  it("renders ? as fallback initials", () => {
    render(
      <MessageBubble {...baseProps} sender={undefined} showAvatar={true} />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("hides avatar when showAvatar is false", () => {
    render(<MessageBubble {...baseProps} showAvatar={false} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows timestamp when showTimestamp and timestamp are provided", () => {
    const timestamp = new Date(2026, 0, 15, 14, 30).getTime();
    render(
      <MessageBubble
        {...baseProps}
        showTimestamp={true}
        timestamp={timestamp}
      />
    );
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("does not show timestamp when showTimestamp is false", () => {
    const timestamp = new Date(2026, 0, 15, 14, 30).getTime();
    render(
      <MessageBubble
        {...baseProps}
        showTimestamp={false}
        timestamp={timestamp}
      />
    );
    const timeElements = screen.queryAllByText(/\d{2}:\d{2}/);
    expect(timeElements).toHaveLength(0);
  });

  it("renders reactions", () => {
    const reactions = [
      { emoji: "👍", count: 3, userIds: ["u1", "u2", "u3"] },
      { emoji: "❤️", count: 1, userIds: ["u1"] },
    ];
    render(
      <MessageBubble
        {...baseProps}
        messageId={"msg1" as never}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
        reactions={reactions}
      />
    );
    expect(screen.getAllByText("👍").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("calls onAddReaction when clicking a reaction the user hasn't reacted to", async () => {
    const user = userEvent.setup();
    const onAddReaction = vi.fn();
    const reactions = [{ emoji: "👍", count: 1, userIds: ["other-user"] }];

    render(
      <MessageBubble
        {...baseProps}
        currentUserId="current-user"
        messageId={"msg1" as never}
        onAddReaction={onAddReaction}
        onRemoveReaction={vi.fn()}
        reactions={reactions}
      />
    );

    const thumbsButton = screen
      .getAllByRole("button")
      .find((btn) => btn.textContent?.includes("👍"));
    if (thumbsButton) {
      await user.click(thumbsButton);
    }
    expect(onAddReaction).toHaveBeenCalledWith("msg1", "👍");
  });

  it("calls onRemoveReaction when clicking a reaction the user already reacted to", async () => {
    const user = userEvent.setup();
    const onRemoveReaction = vi.fn();
    const reactions = [
      { emoji: "👍", count: 2, userIds: ["current-user", "other"] },
    ];

    render(
      <MessageBubble
        {...baseProps}
        currentUserId="current-user"
        messageId={"msg1" as never}
        onAddReaction={vi.fn()}
        onRemoveReaction={onRemoveReaction}
        reactions={reactions}
      />
    );

    const reactionButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent?.includes("👍"));
    // Click the first reaction button (the one in the list)
    if (reactionButtons[0]) {
      await user.click(reactionButtons[0]);
    }
    expect(onRemoveReaction).toHaveBeenCalledWith("msg1", "👍");
  });

  it("renders the React quick-add button when onAddReaction is provided", () => {
    render(
      <MessageBubble
        {...baseProps}
        messageId={"msg1" as never}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
      />
    );
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("does not render reactions when no messageId provided", () => {
    render(
      <MessageBubble
        {...baseProps}
        onAddReaction={vi.fn()}
        reactions={[{ emoji: "👍", count: 1, userIds: [] }]}
      />
    );
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });
});
