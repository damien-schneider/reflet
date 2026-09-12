"use client";

import { Toggle } from "@ctrl-ui/react/ui/toggle";
import {
  CONVERSATION_STATUS_META,
  CONVERSATION_STATUSES,
  type ConversationStatus,
} from "@/features/support/lib/conversation-status";
import { cn } from "@/lib/utils";

interface InlineStatusButtonsProps {
  className?: string;
  currentStatus: string;
  onStatusChange: (status: ConversationStatus) => void;
}

export function InlineStatusButtons({
  currentStatus,
  onStatusChange,
  className,
}: InlineStatusButtonsProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {CONVERSATION_STATUSES.map((status) => {
        const meta = CONVERSATION_STATUS_META[status];
        const Icon = meta.icon;
        const isActive = currentStatus === status;

        return (
          <Toggle
            className={cn("gap-1 text-xs", meta.toggleClassName)}
            key={status}
            onPressedChange={() => {
              if (!isActive) {
                onStatusChange(status);
              }
            }}
            pressed={isActive}
            value={status}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </Toggle>
        );
      })}
    </div>
  );
}
