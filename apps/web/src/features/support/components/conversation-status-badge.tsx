"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Circle } from "@phosphor-icons/react";
import {
  CONVERSATION_STATUS_META,
  isConversationStatus,
} from "@/features/support/lib/conversation-status";

interface ConversationStatusBadgeProps {
  className?: string;
  showIcon?: boolean;
  status: string;
}

const UNKNOWN_STATUS = { badgeColor: "neutral", icon: Circle } as const;

export function ConversationStatusBadge({
  status,
  className,
  showIcon = true,
}: ConversationStatusBadgeProps) {
  const meta = isConversationStatus(status)
    ? CONVERSATION_STATUS_META[status]
    : { ...UNKNOWN_STATUS, label: status };

  const Icon = meta.icon;

  return (
    <Badge className={className} color={meta.badgeColor} size="sm">
      {showIcon && <Icon aria-hidden className="size-3" weight="fill" />}
      {meta.label}
    </Badge>
  );
}
