"use client";

import { BellRinging, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
          className="size-4 shrink-0 text-olive-600 dark:text-olive-400"
          weight="duotone"
        />
        <p className="min-w-0 flex-1 font-medium text-sm">
          Get feedback updates
        </p>
        <Button
          disabled={isEnabling}
          onClick={handleEnable}
          size="sm"
          variant="ghost"
        >
          {isEnabling ? "Enabling…" : "Enable"}
        </Button>
        <button
          aria-label="Dismiss notification prompt"
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-9"
          onClick={handleDismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
