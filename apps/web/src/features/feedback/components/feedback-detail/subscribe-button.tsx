"use client";

import { Bell, BellSlash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SubscribeButton({
  isSubscribed,
  onToggle,
}: {
  isSubscribed: boolean | undefined;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <Button
          className={cn("h-8 w-8", isSubscribed === true && "text-primary")}
          onClick={onToggle}
          size="icon-sm"
          variant="ghost"
        >
          {isSubscribed === true ? (
            <Bell className="h-4 w-4" weight="fill" />
          ) : (
            <BellSlash className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isSubscribed === true ? "Unsubscribe" : "Subscribe"} to updates
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSubscribed === true
          ? "Unsubscribe from updates"
          : "Subscribe to updates"}
      </TooltipContent>
    </Tooltip>
  );
}
