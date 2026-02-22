import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({
      data: { user: { id: "current-user" } },
    })),
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <p className={className}>{children}</p>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  ChatCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chat-icon" />
  ),
}));

vi.mock("./message-bubble", () => ({
  MessageBubble: ({ body }: { body: string }) => (
    <div data-testid="message-bubble">{body}</div>
  ),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    support_messages: {
      listReactions: "support_messages.listReactions",
      addReaction: "support_messages.addReaction",
      removeReaction: "support_messages.removeReaction",
    },
  },
}));

import { MessageList } from "./message-list";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

const createMessage = (overrides = {}) => ({
  _id: "msg1" as never,
  senderId: "user1",
  senderType: "user" as const,
  body: "Test message",
  isRead: false,
  createdAt: Date.now(),
  isOwnMessage: false,
  ...overrides,
});

describe("MessageList", () => {
  it("renders loading state", () => {
    render(<MessageList isLoading={true} messages={undefined} />);
    expect(screen.getByText("Loading messages...")).toBeInTheDocument();
  });

  it("renders empty state when messages is undefined", () => {
    render(<MessageList isLoading={false} messages={undefined} />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start the conversation by sending a message")
    ).toBeInTheDocument();
  });

  it("renders empty state when messages array is empty", () => {
    render(<MessageList isLoading={false} messages={[]} />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("renders message bubbles for each message", () => {
    const messages = [
      createMessage({ _id: "msg1", body: "First message" }),
      createMessage({ _id: "msg2", body: "Second message" }),
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText("First message")).toBeInTheDocument();
    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("groups messages by date with date headers", () => {
    const today = new Date();
    const messages = [
      createMessage({
        _id: "msg1",
        body: "Today's message",
        createdAt: today.getTime(),
      }),
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows Yesterday header for yesterday's messages", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const messages = [
      createMessage({
        _id: "msg1",
        body: "Yesterday msg",
        createdAt: yesterday.getTime(),
      }),
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MessageList className="custom-list" isLoading={false} messages={[]} />
    );
    expect(container.firstChild).toHaveClass("custom-list");
  });
});
