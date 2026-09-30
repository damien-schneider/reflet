import type { BadgeColor } from "@ctrl-ui/react/ui/badge";
import { CheckCircle, Circle, Clock, XCircle } from "@phosphor-icons/react";

export const CONVERSATION_STATUSES = [
  "open",
  "awaiting_reply",
  "resolved",
  "closed",
] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

type StatusIcon = React.ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
  weight?: "fill" | "regular";
}>;

interface StatusMeta {
  badgeColor: BadgeColor;
  icon: StatusIcon;
  label: string;
}

export const CONVERSATION_STATUS_META: Record<ConversationStatus, StatusMeta> =
  {
    awaiting_reply: { badgeColor: "yellow", icon: Clock, label: "Awaiting" },
    closed: { badgeColor: "neutral", icon: XCircle, label: "Closed" },
    open: { badgeColor: "blue", icon: Circle, label: "Open" },
    resolved: { badgeColor: "green", icon: CheckCircle, label: "Resolved" },
  };

export const isConversationStatus = (
  value: string
): value is ConversationStatus => value in CONVERSATION_STATUS_META;

export const isConversationEditable = (status: ConversationStatus): boolean =>
  status !== "closed" && status !== "resolved";
