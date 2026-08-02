import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => []),
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
    support: {
      messages: {
        addReaction: "support.messages.addReaction",
        listReactions: "support.messages.listReactions",
        removeReaction: "support.messages.removeReaction",
      },
    },
  },
}));

import { MessageList } from "./message-list";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const createMessage = (overrides = {}) => ({
  _id: "msg1" as never,
  body: "Test message",
  createdAt: Date.now(),
  isOwnMessage: false,
  isRead: false,
  senderId: "user1",
  senderType: "user" as const,
  ...overrides,
});

const baseProps = { conversationId: "conv1" as never };

describe("MessageList", () => {
  it("renders the loading state while messages are undefined", () => {
    render(<MessageList {...baseProps} messages={undefined} />);
    expect(screen.getByText("Loading messages...")).toBeInTheDocument();
    expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
  });

  it("renders empty state when messages array is empty", () => {
    render(<MessageList {...baseProps} messages={[]} />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("renders message bubbles for each message", () => {
    const messages = [
      createMessage({ _id: "msg1", body: "First message" }),
      createMessage({ _id: "msg2", body: "Second message" }),
    ];
    render(<MessageList {...baseProps} messages={messages} />);
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
    render(<MessageList {...baseProps} messages={messages} />);
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
    render(<MessageList {...baseProps} messages={messages} />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MessageList {...baseProps} className="custom-list" messages={[]} />
    );
    expect(container.firstChild).toHaveClass("custom-list");
  });
});
