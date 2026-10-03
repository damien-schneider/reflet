"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Bell, BellSlash } from "@phosphor-icons/react";

export function SubscribeButton({
  isSubscribed,
  onToggle,
  showLabel = false,
}: {
  isSubscribed: boolean | undefined;
  onToggle: () => void;
  showLabel?: boolean;
}) {
  const label =
    isSubscribed === true ? "Unsubscribe from updates" : "Subscribe to updates";

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        aria-pressed={isSubscribed === true}
        render={
          <Button
            className={cn(
              "h-8",
              !showLabel && "w-8",
              isSubscribed === true && "text-primary"
            )}
            iconOnly={!showLabel}
            onClick={onToggle}
            size="xs"
            variant="ghost"
          />
        }
      >
        {isSubscribed === true ? (
          <Bell className="h-4 w-4" weight="fill" />
        ) : (
          <BellSlash className="h-4 w-4" />
        )}
        {showLabel && (
          <span>{isSubscribed === true ? "Following" : "Follow updates"}</span>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
