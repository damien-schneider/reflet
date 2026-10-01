"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export interface PushPromptActions {
  dismissNotifications: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  errorMessage: string | undefined;
  isDismissed: boolean;
  isEnabling: boolean;
}

export function usePushPromptActions(
  subscribe: () => Promise<boolean>
): PushPromptActions {
  const updatePreferences = useMutation(
    api.notifications.preferences.updatePreferences
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const dismissal = useDismissPushPrompt(setErrorMessage);
  const enableNotifications = async () => {
    setIsEnabling(true);
    setErrorMessage(undefined);
    try {
      const success = await subscribe();
      if (success) {
        await updatePreferences({ pushEnabled: true });
        setIsEnabled(true);
      } else {
        setErrorMessage(
          "Couldn’t turn on notifications. Check your browser settings and try again."
        );
      }
    } catch {
      setErrorMessage("Couldn’t turn on notifications. Try again.");
    }
    setIsEnabling(false);
  };
  return {
    dismissNotifications: dismissal.dismissNotifications,
    enableNotifications,
    errorMessage,
    isDismissed: isEnabled || dismissal.isDismissed,
    isEnabling,
  };
}

function useDismissPushPrompt(
  setErrorMessage: (message: string | undefined) => void
) {
  const dismissPrompt = useMutation(
    api.notifications.preferences.dismissPushPrompt
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const dismissNotifications = async () => {
    setIsDismissed(true);
    setErrorMessage(undefined);
    try {
      await dismissPrompt();
    } catch {
      setIsDismissed(false);
      setErrorMessage("Couldn’t hide this prompt. Try again.");
    }
  };
  return { dismissNotifications, isDismissed };
}
