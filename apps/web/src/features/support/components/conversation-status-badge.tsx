"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Circle } from "@phosphor-icons/react";
import {
  isConversationStatus,
  type StatusViewer,
  statusMetaFor,
} from "@/features/support/lib/conversation-status";

interface ConversationStatusBadgeProps {
  className?: string;
  status: string;
  viewer: StatusViewer;
}

const UNKNOWN_STATUS = { badgeColor: "neutral", icon: Circle } as const;

export function ConversationStatusBadge({
  className,
  status,
  viewer,
}: ConversationStatusBadgeProps) {
  const meta = isConversationStatus(status)
    ? statusMetaFor(status, viewer)
    : { ...UNKNOWN_STATUS, label: status };

  const Icon = meta.icon;

  return (
    <Badge className={className} color={meta.badgeColor} size="sm">
      <Icon aria-hidden className="size-3" weight="fill" />
      {meta.label}
    </Badge>
  );
}
