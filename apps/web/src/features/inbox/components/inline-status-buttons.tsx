"use client";

import { CheckCircle, Circle, Clock, XCircle } from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

const STATUS_OPTIONS: {
  value: ConversationStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}[] = [
  {
    activeClass: "data-[pressed]:bg-olive-500/15 data-[pressed]:text-olive-600",
    icon: Circle,
    label: "Open",
    value: "open",
  },
  {
    activeClass: "data-[pressed]:bg-amber-500/15 data-[pressed]:text-amber-600",
    icon: Clock,
    label: "Awaiting",
    value: "awaiting_reply",
  },
  {
    activeClass:
      "data-[pressed]:bg-emerald-500/15 data-[pressed]:text-emerald-600",
    icon: CheckCircle,
    label: "Resolved",
    value: "resolved",
  },
  {
    activeClass: "data-[pressed]:bg-zinc-500/15 data-[pressed]:text-zinc-600",
    icon: XCircle,
    label: "Closed",
    value: "closed",
  },
];

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
    <ToggleGroup className={cn("gap-1", className)} size="sm" variant="outline">
      {STATUS_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = currentStatus === option.value;

        return (
          <ToggleGroupItem
            className={cn("gap-1 text-xs", option.activeClass)}
            key={option.value}
            onPressedChange={() => {
              if (!isActive) {
                onStatusChange(option.value);
              }
            }}
            pressed={isActive}
            value={option.value}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
