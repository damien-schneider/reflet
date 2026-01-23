"use client";

import { CheckCircle, Circle, Clock, XCircle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

const STATUS_CONFIG: Record<
  ConversationStatus,
  {
    label: string;
    icon: React.ComponentType<{
      className?: string;
      weight?: "fill" | "regular";
    }>;
    className: string;
  }
> = {
  open: {
    label: "Open",
    icon: Circle,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  awaiting_reply: {
    label: "Awaiting",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
};

interface ConversationStatusBadgeProps {
  status: ConversationStatus | string;
  className?: string;
  showIcon?: boolean;
}

export function ConversationStatusBadge({
  status,
  className,
  showIcon = true,
}: ConversationStatusBadgeProps) {
  const config = STATUS_CONFIG[status as ConversationStatus] ?? {
    label: status,
    icon: Circle,
    className: "bg-zinc-500/10 text-zinc-600",
  };

  const Icon = config.icon;

  return (
    <Badge className={cn(config.className, className)} variant="secondary">
      {showIcon && <Icon className="h-3 w-3" weight="fill" />}
      {config.label}
    </Badge>
  );
}
