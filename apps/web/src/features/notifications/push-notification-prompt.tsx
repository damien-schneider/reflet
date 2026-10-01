"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { BellRinging, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  type PushPromptActions,
  usePushPromptActions,
} from "@/features/notifications/use-push-prompt-actions";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationPrompt() {
  const preferences = useQuery(api.notifications.preferences.getPreferences);
  const { isLoading, isSupported, permissionState, isSubscribed, subscribe } =
    usePushNotifications();
  const actions = usePushPromptActions(subscribe);
  const shouldHide =
    actions.isDismissed ||
    isLoading ||
    preferences === undefined ||
    preferences.pushPromptDismissed ||
    preferences.pushEnabled ||
    isSubscribed ||
    !isSupported ||
    permissionState === "denied";
  const isActionVisible =
    actions.isEnabling || actions.errorMessage !== undefined;
  if (shouldHide && !isActionVisible) {
    return null;
  }
  return <PushPromptContent actions={actions} />;
}

function PushPromptContent({ actions }: { actions: PushPromptActions }) {
  return (
    <aside
      aria-label="Browser notifications"
      className="space-y-3 border-t px-4 py-3"
    >
      <div className="flex items-start gap-2">
        <BellRinging
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <p className="text-pretty text-muted-foreground text-xs">
          Get browser notifications for new comments, messages, and status
          changes.
        </p>
      </div>
      {actions.errorMessage ? (
        <p className="text-destructive-text text-xs" role="alert">
          {actions.errorMessage}
        </p>
      ) : null}
      <PushPromptButtons actions={actions} />
    </aside>
  );
}

function PushPromptButtons({ actions }: { actions: PushPromptActions }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        className="min-h-11"
        disabled={actions.isEnabling}
        onClick={actions.enableNotifications}
        size="sm"
        variant="surface"
      >
        {actions.isEnabling ? "Turning on…" : "Turn on"}
      </Button>
      <Button
        aria-label="Dismiss notification prompt"
        className="min-h-11 min-w-11"
        disabled={actions.isEnabling}
        iconOnly
        onClick={actions.dismissNotifications}
        size="sm"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
