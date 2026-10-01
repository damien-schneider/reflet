"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  ArrowCounterClockwise,
  CheckCircle,
  type Icon,
  UserCirclePlus,
  XCircle,
} from "@phosphor-icons/react";
import {
  acceptsReplies,
  type ConversationStatus,
} from "@/features/support/lib/conversation-status";
import { cn } from "@/lib/utils";

interface RowActions {
  onAssignToMe: () => void;
  onStatusChange: (status: ConversationStatus) => void;
}

interface QuickAction {
  icon: Icon;
  iconClassName: string;
  label: string;
  run: () => void;
}

function quickActionsFor(status: string, actions: RowActions): QuickAction[] {
  const assignToMe = {
    icon: UserCirclePlus,
    iconClassName: "text-brand-text",
    label: "Assign to me",
    run: actions.onAssignToMe,
  };
  if (!acceptsReplies(status)) {
    return [
      {
        icon: ArrowCounterClockwise,
        iconClassName: "text-muted-foreground",
        label: "Reopen",
        run: () => actions.onStatusChange("open"),
      },
      assignToMe,
    ];
  }
  return [
    {
      icon: CheckCircle,
      iconClassName: "text-success-text",
      label: "Resolve",
      run: () => actions.onStatusChange("resolved"),
    },
    {
      icon: XCircle,
      iconClassName: "text-muted-foreground",
      label: "Close",
      run: () => actions.onStatusChange("closed"),
    },
    assignToMe,
  ];
}

export function HoverQuickActions({
  actions,
  className,
  status,
}: {
  actions: RowActions;
  className?: string;
  status: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-accent opacity-0",
        "pointer-events-none group-focus-within/conversation:pointer-events-auto group-hover/conversation:pointer-events-auto",
        "group-focus-within/conversation:opacity-100 group-hover/conversation:opacity-100",
        "pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
        className
      )}
    >
      {quickActionsFor(status, actions).map(
        ({ icon: ActionIcon, iconClassName, label, run }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              aria-label={label}
              render={
                <Button
                  iconOnly
                  onClick={(event) => {
                    event.stopPropagation();
                    run();
                  }}
                  size="xs"
                  variant="ghost"
                />
              }
            >
              <ActionIcon aria-hidden className={iconClassName} />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      )}
    </div>
  );
}
