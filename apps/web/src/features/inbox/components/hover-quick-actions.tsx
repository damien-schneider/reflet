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
        "flex items-center gap-0.5 rounded-lg bg-accent opacity-0",
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
              iconOnly
              onClick={(e) => handleClick(e, onResolve)}
              size="md"
              variant="ghost"
            />
          }
        >
          <CheckCircle aria-hidden className="text-success-text" />
        </TooltipTrigger>
        <TooltipContent>Resolve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          aria-label="Close"
          render={
            <Button
              iconOnly
              onClick={(e) => handleClick(e, onClose)}
              size="md"
              variant="ghost"
            />
          }
        >
          <XCircle aria-hidden className="text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>Close</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          aria-label="Assign to me"
          render={
            <Button
              iconOnly
              onClick={(e) => handleClick(e, onAssignToMe)}
              size="md"
              variant="ghost"
            />
          }
        >
          <UserCirclePlus aria-hidden className="text-brand-text" />
        </TooltipTrigger>
        <TooltipContent>Assign to me</TooltipContent>
      </Tooltip>
    </div>
  );
}
