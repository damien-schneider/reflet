import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { AdminConversationView } from "@/features/inbox/components/conversation/admin-conversation-view";

vi.mock("@/features/support/components/thread/message-thread", () => ({
  MessageThread: ({ composer }: { composer: ReactNode }) => composer,
}));

const baseConversation = {
  _creationTime: 0,
  _id: "conversation_1" as Id<"supportConversations">,
  adminUnreadCount: 0,
  createdAt: 0,
  isAdmin: true,
  lastMessageAt: 0,
  organizationId: "org_1" as Id<"organizations">,
  status: "open",
  subject: "Billing question",
  updatedAt: 0,
  user: { email: "jane@example.com", name: "Jane" },
  userUnreadCount: 0,
} as const;

function renderView(overrides: Record<string, unknown> = {}) {
  const onStatusChange = vi.fn(() => Promise.resolve());
  render(
    <AdminConversationView
      controls={{
        actions: {
          onAssign: vi.fn(() => Promise.resolve()),
          onSendMessage: vi.fn(() => Promise.resolve()),
          onStatusChange,
        },
        members: [],
      }}
      conversation={{ ...baseConversation, ...overrides }}
      messages={[]}
    />
  );
  return { onStatusChange };
}

it("resolves or closes an open conversation from the header", async () => {
  const { onStatusChange } = renderView();

  await userEvent.click(screen.getByRole("button", { name: /Resolve/ }));
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onStatusChange.mock.calls).toEqual([["resolved"], ["closed"]]);
});

it("blocks replies on a resolved conversation until it is reopened", async () => {
  const { onStatusChange } = renderView({ status: "resolved" });

  expect(screen.getByRole("textbox", { name: "Reply" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: /Resolve/ })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reopen" }));

  expect(onStatusChange).toHaveBeenCalledWith("open");
});

it("identifies guest senders by email", () => {
  renderView({
    guestEmail: "visitor@example.com",
    guestId: "guest_1",
    user: { email: "visitor@example.com" },
  });

  expect(screen.getByText("visitor@example.com")).toBeVisible();
  expect(screen.getByText("Guest")).toBeVisible();
});
