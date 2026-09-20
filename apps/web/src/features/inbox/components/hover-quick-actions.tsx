"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CheckCircle, UserCirclePlus, XCircle } from "@phosphor-icons/react";
import type React from "react";
import { cn } from "@/lib/utils";

interface HoverQuickActionsProps {
  className?: string;
  onAssignToMe: () => void;
  onClose: () => void;
  onResolve: () => void;
}

const ACTION_BUTTON = "size-10";

export function HoverQuickActions({
  onResolve,
  onClose,
  onAssignToMe,
  className,
}: HoverQuickActionsProps) {
  const handleClick = (event: React.MouseEvent, handler: () => void) => {
    event.stopPropagation();
    handler();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity",
        "pointer-events-none group-focus-within/conversation:pointer-events-auto group-hover/conversation:pointer-events-auto",
        "group-focus-within/conversation:opacity-100 group-hover/conversation:opacity-100",
        "pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger
          aria-label="Resolve"
          render={
            <Button
              className={ACTION_BUTTON}
              iconOnly
              onClick={(e) => handleClick(e, onResolve)}
              variant="ghost"
            />
          }
        >
          <CheckCircle className="h-4 w-4 text-success-text" />
        </TooltipTrigger>
        <TooltipContent>Resolve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          aria-label="Close"
          render={
            <Button
              className={ACTION_BUTTON}
              iconOnly
              onClick={(e) => handleClick(e, onClose)}
              variant="ghost"
            />
          }
        >
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>Close</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          aria-label="Assign to me"
          render={
            <Button
              className={ACTION_BUTTON}
              iconOnly
              onClick={(e) => handleClick(e, onAssignToMe)}
              variant="ghost"
            />
          }
        >
          <UserCirclePlus className="h-4 w-4 text-brand-text" />
        </TooltipTrigger>
        <TooltipContent>Assign to me</TooltipContent>
      </Tooltip>
    </div>
  );
}
