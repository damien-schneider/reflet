"use client";

import { Bell, BellRinging } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface SidebarSubscriptionSectionProps {
  isSubscribed: boolean | undefined;
  onToggleSubscription: () => void;
}

export function SidebarSubscriptionSection({
  isSubscribed,
  onToggleSubscription,
}: SidebarSubscriptionSectionProps) {
  return (
    <div>
      <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Subscribe to post
      </h4>
      <p className="mb-3 text-muted-foreground text-xs">
        Be notified about new comments and status updates
      </p>
      <Button
        className="w-full"
        onClick={onToggleSubscription}
        variant={isSubscribed ? "default" : "outline"}
      >
        {isSubscribed ? (
          <>
            <BellRinging className="mr-2 h-4 w-4" />
            Subscribed
          </>
        ) : (
          <>
            <Bell className="mr-2 h-4 w-4" />
            Subscribe
          </>
        )}
      </Button>
    </div>
  );
}
