"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { BellRinging, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationPrompt() {
  const preferences = useQuery(api.notifications.preferences.getPreferences);
  const updatePreferences = useMutation(
    api.notifications.preferences.updatePreferences
  );
  const dismissPrompt = useMutation(
    api.notifications.preferences.dismissPushPrompt
  );
  const { isSupported, permissionState, isSubscribed, subscribe } =
    usePushNotifications();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const shouldHide =
    isDismissed ||
    preferences === undefined ||
    preferences.pushPromptDismissed ||
    preferences.pushEnabled ||
    isSubscribed ||
    !isSupported ||
    permissionState === "denied";

  if (shouldHide) {
    return null;
  }

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const success = await subscribe();
      if (success) {
        await updatePreferences({ pushEnabled: true });
        await dismissPrompt();
      } else {
        toast.error(
          "Your browser blocked notifications. Allow them in site settings."
        );
      }
    } catch {
      toast.error("Couldn’t turn on notifications. Try again.");
    }
    setIsEnabling(false);
  };

  const handleDismiss = async () => {
    setIsDismissed(true);
    try {
      await dismissPrompt();
    } catch {
      setIsDismissed(false);
      toast.error("Couldn’t hide this prompt. Try again.");
    }
  };

  return (
    <aside aria-label="Browser notifications" className="px-4 pt-2 sm:px-6">
      <div className="flex min-h-12 items-center gap-3 border-border border-b py-2">
        <BellRinging
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <p className="min-w-0 flex-1 text-pretty text-sm">
          Get browser notifications for new comments, messages, and status
          changes.
        </p>
        <Button
          disabled={isEnabling}
          onClick={handleEnable}
          size="sm"
          variant="surface"
        >
          {isEnabling ? "Turning on…" : "Turn on"}
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Dismiss notification prompt"
                iconOnly
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              />
            }
          >
            <X aria-hidden="true" className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Dismiss</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
