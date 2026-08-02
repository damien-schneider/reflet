"use client";

import { Circle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import {
  CONVERSATION_STATUS_META,
  isConversationStatus,
} from "@/features/support/lib/conversation-status";
import { cn } from "@/lib/utils";

interface ConversationStatusBadgeProps {
  className?: string;
  showIcon?: boolean;
  status: string;
}

const UNKNOWN_STATUS = {
  badgeClassName: "bg-zinc-500/10 text-zinc-600",
  icon: Circle,
};

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
    <Badge className={cn(meta.badgeClassName, className)} variant="secondary">
      {showIcon && <Icon className="h-3 w-3" weight="fill" />}
      {meta.label}
    </Badge>
  );
}
