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
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
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

vi.mock("./conversation-status-badge", () => ({
  ConversationStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { ConversationList } from "./conversation-list";

afterEach(cleanup);

const mockConversation = (overrides = {}) => ({
  _id: "conv1",
  subject: "Need help",
  status: "open",
  lastMessageAt: Date.now() - 60_000,
  userUnreadCount: 0,
  adminUnreadCount: 0,
  user: { name: "John Doe", email: "john@example.com", image: undefined },
  lastMessagePreview: "Hello there",
  ...overrides,
});

describe("ConversationList", () => {
  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(
      <ConversationList
        conversations={undefined}
        isLoading={true}
        onSelect={vi.fn()}
      />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(5);
  });

  it("renders empty state when conversations is undefined", () => {
    render(
      <ConversationList
        conversations={undefined}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("No conversations")).toBeInTheDocument();
  });

  it("renders empty state when conversations array is empty", () => {
    render(
      <ConversationList
        conversations={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("No conversations")).toBeInTheDocument();
  });

  it("shows user-facing empty message by default", () => {
    render(
      <ConversationList
        conversations={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByText("Start a new conversation to get help")
    ).toBeInTheDocument();
  });

  it("shows admin-facing empty message when isAdmin is true", () => {
    render(
      <ConversationList
        conversations={[]}
        isAdmin={true}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("No support requests yet")).toBeInTheDocument();
  });

  it("renders conversation items", () => {
    const conversations = [mockConversation()];
    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Need help")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("calls onSelect when a conversation is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const conversations = [mockConversation()];

    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByText("John Doe"));
    expect(onSelect).toHaveBeenCalledWith(conversations[0]);
  });

  it("shows user email when name is not available", () => {
    const conversations = [
      mockConversation({
        _id: "conv2",
        user: { email: "test@example.com" },
      }),
    ];
    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows Unknown User when user info is missing", () => {
    const conversations = [mockConversation({ _id: "conv3", user: undefined })];
    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Unknown User")).toBeInTheDocument();
  });

  it("shows unread badge for admin when adminUnreadCount > 0", () => {
    const conversations = [mockConversation({ adminUnreadCount: 5 })];
    render(
      <ConversationList
        conversations={conversations}
        isAdmin={true}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows unread badge for user when userUnreadCount > 0", () => {
    const conversations = [mockConversation({ userUnreadCount: 3 })];
    render(
      <ConversationList
        conversations={conversations}
        isAdmin={false}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps unread count display at 99+", () => {
    const conversations = [mockConversation({ userUnreadCount: 150 })];
    render(
      <ConversationList
        conversations={conversations}
        isAdmin={false}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders initials from name", () => {
    const conversations = [mockConversation()];
    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders initials from email when name is missing", () => {
    const conversations = [
      mockConversation({
        _id: "conv4",
        user: { email: "alice@example.com" },
      }),
    ];
    render(
      <ConversationList
        conversations={conversations}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ConversationList
        className="custom-list"
        conversations={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(container.firstChild).toHaveClass("custom-list");
  });
});
