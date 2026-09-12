"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Bell, BellSlash } from "@phosphor-icons/react";
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
          iconOnly
          onClick={onToggle}
          size="xs"
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
