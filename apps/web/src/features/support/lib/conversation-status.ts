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
      badgeClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: Clock,
      label: "Awaiting",
      toggleClassName:
        "data-[pressed]:bg-amber-500/15 data-[pressed]:text-amber-600",
    },
    closed: {
      badgeClassName: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
      icon: XCircle,
      label: "Closed",
      toggleClassName:
        "data-[pressed]:bg-zinc-500/15 data-[pressed]:text-zinc-600",
    },
    open: {
      badgeClassName: "bg-olive-500/10 text-olive-600 dark:text-olive-400",
      icon: Circle,
      label: "Open",
      toggleClassName:
        "data-[pressed]:bg-olive-500/15 data-[pressed]:text-olive-600",
    },
    resolved: {
      badgeClassName:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle,
      label: "Resolved",
      toggleClassName:
        "data-[pressed]:bg-emerald-500/15 data-[pressed]:text-emerald-600",
    },
  };

export const isConversationStatus = (
  value: string
): value is ConversationStatus => value in CONVERSATION_STATUS_META;

export const isConversationEditable = (status: ConversationStatus): boolean =>
  status !== "closed" && status !== "resolved";
