import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@/features/inbox/components/inline-status-buttons", () => ({
  InlineStatusButtons: ({
    currentStatus,
    onStatusChange,
  }: {
    currentStatus: string;
    onStatusChange: (status: string) => void;
  }) => (
    <div data-testid="inline-status-buttons">
      <span>{currentStatus}</span>
      <button onClick={() => onStatusChange("closed")} type="button">
        Closed
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H2: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <h2>{children}</h2>
  ),
  H3: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <h3 className={className}>{children}</h3>,
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Text: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  ChatCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chat-icon" />
  ),
}));

vi.mock("@/features/inbox/components/assign-member-dropdown", () => ({
  AssignMemberDropdown: () => <div data-testid="assign-dropdown">Assign</div>,
}));

vi.mock("@/features/inbox/components/message-input", () => ({
  MessageInput: ({
    disabled,
    placeholder,
  }: {
    disabled?: boolean;
    placeholder?: string;
    onSend: (msg: string) => void;
  }) => (
    <div data-disabled={disabled} data-testid="message-input">
      {placeholder}
    </div>
  ),
}));

vi.mock("@/features/inbox/components/message-list", () => ({
  MessageList: ({
    isLoading,
  }: {
    isLoading?: boolean;
    messages?: unknown[];
  }) => (
    <div data-loading={isLoading} data-testid="message-list">
      Messages
    </div>
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

import {
  AdminConversationView,
  EmptyConversationState,
} from "./admin-conversation-view";

afterEach(cleanup);

const baseConversation = {
  subject: "Help with billing",
  status: "open",
  assignedTo: undefined,
  user: { name: "Test User" },
};

const baseProps = {
  conversation: baseConversation,
  messages: [],
  messagesLoading: false,
  teamMembers: [],
  onSendMessage: vi.fn(),
  onStatusChange: vi.fn(),
  onAssign: vi.fn(),
};

describe("AdminConversationView", () => {
  it("renders conversation subject", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByText("Help with billing")).toBeInTheDocument();
  });

  it("shows default title when subject is missing", () => {
    render(
      <AdminConversationView
        {...baseProps}
        conversation={{ ...baseConversation, subject: undefined }}
      />
    );
    expect(screen.getByText("Support Conversation")).toBeInTheDocument();
  });

  it("renders user name", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
  });

  it("shows Unknown User when user name is missing", () => {
    render(
      <AdminConversationView
        {...baseProps}
        conversation={{ ...baseConversation, user: undefined }}
      />
    );
    expect(screen.getByText(/Unknown User/)).toBeInTheDocument();
  });

  it("shows guest email for guest conversations", () => {
    render(
      <AdminConversationView
        {...baseProps}
        conversation={{
          ...baseConversation,
          user: undefined,
          guestEmail: "guest@example.com",
        }}
      />
    );
    expect(screen.getByText(/guest@example.com/)).toBeInTheDocument();
    expect(screen.getByText("(guest)")).toBeInTheDocument();
  });

  it("renders AssignMemberDropdown", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByTestId("assign-dropdown")).toBeInTheDocument();
  });

  it("renders MessageList", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
  });

  it("renders MessageInput", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("disables MessageInput when conversation is closed", () => {
    render(
      <AdminConversationView
        {...baseProps}
        conversation={{ ...baseConversation, status: "closed" }}
      />
    );
    expect(screen.getByTestId("message-input")).toHaveAttribute(
      "data-disabled",
      "true"
    );
  });

  it("disables MessageInput when conversation is resolved", () => {
    render(
      <AdminConversationView
        {...baseProps}
        conversation={{ ...baseConversation, status: "resolved" }}
      />
    );
    expect(screen.getByTestId("message-input")).toHaveAttribute(
      "data-disabled",
      "true"
    );
  });

  it("enables MessageInput when conversation is open", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByTestId("message-input")).toHaveAttribute(
      "data-disabled",
      "false"
    );
  });

  it("renders InlineStatusButtons", () => {
    render(<AdminConversationView {...baseProps} />);
    expect(screen.getByTestId("inline-status-buttons")).toBeInTheDocument();
  });

  it("calls onStatusChange when a status button is clicked", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminConversationView {...baseProps} onStatusChange={onStatusChange} />
    );
    await user.click(screen.getByText("Closed"));
    expect(onStatusChange).toHaveBeenCalledWith("closed");
  });
});

describe("EmptyConversationState", () => {
  it("shows select conversation message when conversations exist", () => {
    render(<EmptyConversationState hasConversations={true} />);
    expect(screen.getByText("Select a conversation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a conversation from the sidebar to view messages"
      )
    ).toBeInTheDocument();
  });

  it("shows no conversations message when none exist", () => {
    render(<EmptyConversationState hasConversations={false} />);
    expect(screen.getByText("No conversations")).toBeInTheDocument();
    expect(
      screen.getByText("No support requests have been submitted yet.")
    ).toBeInTheDocument();
  });
});
