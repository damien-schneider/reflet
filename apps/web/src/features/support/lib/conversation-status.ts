import { CheckCircle, Circle, Clock, XCircle } from "@phosphor-icons/react";

export const CONVERSATION_STATUSES = [
  "open",
  "awaiting_reply",
  "resolved",
  "closed",
] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

type StatusIcon = React.ComponentType<{
  className?: string;
  weight?: "fill" | "regular";
}>;

interface StatusMeta {
  badgeClassName: string;
  icon: StatusIcon;
  label: string;
  toggleClassName: string;
}

export const CONVERSATION_STATUS_META: Record<ConversationStatus, StatusMeta> =
  {
    awaiting_reply: {
      badgeClassName: "bg-warning/10 text-warning-text",
      icon: Clock,
      label: "Awaiting",
      toggleClassName:
        "data-[pressed]:bg-warning/15 data-[pressed]:text-warning-text",
    },
    closed: {
      badgeClassName: "bg-muted text-muted-foreground",
      icon: XCircle,
      label: "Closed",
      toggleClassName:
        "data-[pressed]:bg-muted data-[pressed]:text-muted-foreground",
    },
    open: {
      badgeClassName: "bg-brand-subtle text-brand-text",
      icon: Circle,
      label: "Open",
      toggleClassName:
        "data-[pressed]:bg-brand-subtle data-[pressed]:text-brand-text",
    },
    resolved: {
      badgeClassName: "bg-success/10 text-success-text",
      icon: CheckCircle,
      label: "Resolved",
      toggleClassName:
        "data-[pressed]:bg-success/15 data-[pressed]:text-success-text",
    },
  };

export const isConversationStatus = (
  value: string
): value is ConversationStatus => value in CONVERSATION_STATUS_META;

export const isConversationEditable = (status: ConversationStatus): boolean =>
  status !== "closed" && status !== "resolved";
