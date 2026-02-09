"use client";

import { BellRinging, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";

/**
 * One-time inline card prompting the user to enable push notifications.
 * Self-manages visibility via user preferences stored in Convex.
 * Only renders when:
 * - User is authenticated
 * - Push prompt has not been dismissed
 * - Browser supports push notifications
 * - Permission is not "denied"
 * - Push is not already enabled
 */
export function PushNotificationPrompt() {
  const preferences = useQuery(api.notification_preferences.getPreferences);
  const updatePreferences = useMutation(
    api.notification_preferences.updatePreferences
  );
  const dismissPrompt = useMutation(
    api.notification_preferences.dismissPushPrompt
  );
  const { isSupported, permissionState, isSubscribed, subscribe } =
    usePushNotifications();
  const [isEnabling, setIsEnabling] = useState(false);

  // Don't render until preferences are loaded
  if (preferences === undefined) {
    return null;
  }

  // Don't show if already dismissed, push already enabled, or not supported
  const shouldHide =
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
        toast.success("Push notifications enabled!");
      } else {
        toast.error(
          "Failed to enable notifications. Check your browser settings."
        );
      }
    } catch {
      toast.error("Failed to enable notifications");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissPrompt();
    } catch {
      // Silently fail — prompt will hide on next load
    }
  };

  return (
    <div className="px-6 pt-4">
      <Card className="relative border-olive-200 bg-olive-50/50 dark:border-olive-800/50 dark:bg-olive-900/10">
        <button
          aria-label="Dismiss notification prompt"
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={handleDismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-olive-100 dark:bg-olive-800/30">
            <BellRinging
              className="size-6 text-olive-600 dark:text-olive-400"
              weight="duotone"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">
              Stay updated with push notifications
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Get notified about feedback updates, comments, and more — even
              when the app is in the background.
            </p>
          </div>
          <Button
            disabled={isEnabling}
            onClick={handleEnable}
            size="sm"
            variant="default"
          >
            {isEnabling ? "Enabling..." : "Enable"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
