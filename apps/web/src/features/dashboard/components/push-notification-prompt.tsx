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

  const shouldHide =
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
      if (!success) {
        toast.error("Enable notifications in your browser settings.");
        return;
      }
      await updatePreferences({ pushEnabled: true });
      await dismissPrompt();
      toast.success("Push notifications enabled");
    } catch {
      toast.error("Couldn’t enable notifications");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissPrompt();
    } catch {
      toast.error("Couldn’t dismiss this prompt");
    }
  };

  return (
    <div className="px-4 pt-2 sm:px-6">
      <div className="flex min-h-12 items-center gap-3 border-border border-b py-2">
        <BellRinging
          className="size-4 shrink-0 text-brand-text"
          weight="duotone"
        />
        <p className="min-w-0 flex-1 font-medium text-sm">
          Get feedback updates
        </p>
        <Button
          className="min-h-10"
          disabled={isEnabling}
          onClick={handleEnable}
          size="xs"
          variant="ghost"
        >
          {isEnabling ? "Enabling…" : "Enable"}
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Dismiss notification prompt"
                className="size-10"
                iconOnly
                onClick={handleDismiss}
                variant="ghost"
              />
            }
          >
            <X className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Dismiss</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
