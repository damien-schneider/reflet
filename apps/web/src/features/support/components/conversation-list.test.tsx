import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  AvatarImage: ({ alt }: { alt?: string }) => <img alt={alt} />,
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
  CheckCircle: () => <svg data-testid="check-icon" />,
  UserCirclePlus: () => <svg data-testid="assign-icon" />,
  XCircle: () => <svg data-testid="x-icon" />,
}));

vi.mock("./conversation-status-badge", () => ({
  ConversationStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

import { ConversationList } from "./conversation-list";

const mockConversation = (overrides = {}) => ({
  _id: "conv1" as Id<"supportConversations">,
  adminUnreadCount: 0,
  lastMessageAt: Date.now() - 60_000,
  lastMessagePreview: "Hello there",
  status: "open",
  subject: "Need help",
  user: { email: "john@example.com", image: undefined, name: "John Doe" },
  userUnreadCount: 0,
  ...overrides,
});

describe("ConversationList", () => {
  it("renders the loading skeleton while conversations are undefined", () => {
    const { container } = render(
      <ConversationList conversations={undefined} onSelect={vi.fn()} />
    );
    expect(screen.queryByText("No conversations")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
  });

  it("renders empty state when conversations array is empty", () => {
    render(<ConversationList conversations={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No conversations")).toBeInTheDocument();
  });

  it("shows user-facing empty message by default", () => {
    render(<ConversationList conversations={[]} onSelect={vi.fn()} />);
    expect(
      screen.getByText("Start a new conversation to get help")
    ).toBeInTheDocument();
  });

  it("shows admin-facing empty message when isAdmin is true", () => {
    render(
      <ConversationList conversations={[]} isAdmin={true} onSelect={vi.fn()} />
    );
    expect(screen.getByText("No support requests yet")).toBeInTheDocument();
  });

  it("renders conversation items", () => {
    const conversations = [mockConversation()];
    render(
      <ConversationList conversations={conversations} onSelect={vi.fn()} />
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
      <ConversationList conversations={conversations} onSelect={onSelect} />
    );

    await user.click(screen.getByText("John Doe"));
    expect(onSelect).toHaveBeenCalledWith(conversations[0]);
  });

  it("shows user email when name is not available", () => {
    const conversations = [
      mockConversation({
        _id: "conv2" as Id<"supportConversations">,
        user: { email: "test@example.com" },
      }),
    ];
    render(
      <ConversationList conversations={conversations} onSelect={vi.fn()} />
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows Unknown User when user info is missing", () => {
    const conversations = [
      mockConversation({
        _id: "conv3" as Id<"supportConversations">,
        user: undefined,
      }),
    ];
    render(
      <ConversationList conversations={conversations} onSelect={vi.fn()} />
    );
    expect(screen.getByText("Unknown User")).toBeInTheDocument();
  });

  it("shows unread badge for admin when adminUnreadCount > 0", () => {
    const conversations = [mockConversation({ adminUnreadCount: 5 })];
    render(
      <ConversationList
        conversations={conversations}
        isAdmin={true}
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
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders initials from name", () => {
    const conversations = [mockConversation()];
    render(
      <ConversationList conversations={conversations} onSelect={vi.fn()} />
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders initials from email when name is missing", () => {
    const conversations = [
      mockConversation({
        _id: "conv4" as Id<"supportConversations">,
        user: { email: "alice@example.com" },
      }),
    ];
    render(
      <ConversationList conversations={conversations} onSelect={vi.fn()} />
    );
    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ConversationList
        className="custom-list"
        conversations={[]}
        onSelect={vi.fn()}
      />
    );
    expect(container.firstChild).toHaveClass("custom-list");
  });
});
