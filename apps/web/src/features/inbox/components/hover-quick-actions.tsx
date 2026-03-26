"use client";

import { CheckCircle, UserCirclePlus, XCircle } from "@phosphor-icons/react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        "flex items-center gap-0.5 opacity-0 transition-opacity group-hover/conversation:opacity-100",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="h-7 w-7"
              onClick={(e) => handleClick(e, onResolve)}
              size="icon"
              variant="ghost"
            />
          }
        >
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span className="sr-only">Resolve</span>
        </TooltipTrigger>
        <TooltipContent>Resolve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="h-7 w-7"
              onClick={(e) => handleClick(e, onClose)}
              size="icon"
              variant="ghost"
            />
          }
        >
          <XCircle className="h-4 w-4 text-zinc-500" />
          <span className="sr-only">Close</span>
        </TooltipTrigger>
        <TooltipContent>Close</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className="h-7 w-7"
              onClick={(e) => handleClick(e, onAssignToMe)}
              size="icon"
              variant="ghost"
            />
          }
        >
          <UserCirclePlus className="h-4 w-4 text-olive-500" />
          <span className="sr-only">Assign to me</span>
        </TooltipTrigger>
        <TooltipContent>Assign to me</TooltipContent>
      </Tooltip>
    </div>
  );
}
