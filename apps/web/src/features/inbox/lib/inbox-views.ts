import type { ConversationStatus } from "@/features/support/lib/conversation-status";

export const INBOX_VIEWS = [
  {
    empty: {
      description: "You’re all caught up.",
      title: "No open conversations",
    },
    id: "open",
    label: "Open",
    statuses: ["open", "awaiting_reply"],
  },
  {
    empty: {
      description: "Conversations you resolve show up here.",
      title: "No resolved conversations",
    },
    id: "resolved",
    label: "Resolved",
    statuses: ["resolved"],
  },
  {
    empty: {
      description: "Conversations you close show up here.",
      title: "No closed conversations",
    },
    id: "closed",
    label: "Closed",
    statuses: ["closed"],
  },
  {
    empty: {
      description: "Messages from your support page and widget land here.",
      title: "No conversations yet",
    },
    id: "all",
    label: "All",
    statuses: undefined,
  },
] as const satisfies readonly {
  empty: { description: string; title: string };
  id: string;
  label: string;
  statuses: readonly ConversationStatus[] | undefined;
}[];

export type InboxView = (typeof INBOX_VIEWS)[number]["id"];

export function statusesInView(
  view: InboxView
): ConversationStatus[] | undefined {
  const statuses = INBOX_VIEWS.find((entry) => entry.id === view)?.statuses;
  return statuses ? [...statuses] : undefined;
}
