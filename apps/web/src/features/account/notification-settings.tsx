"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { toast } from "@ctrl-ui/react/ui/toast";
import { BellSlash, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useId, useState } from "react";
import { SettingsSection } from "@/features/project/components/settings-page";
import { usePushNotifications } from "@/hooks/use-push-notifications";

type NotificationTypeKey =
  | "notifyOnStatusChange"
  | "notifyOnNewComment"
  | "notifyOnVoteMilestone"
  | "notifyOnNewSupportMessage"
  | "notifyOnInvitation";

const NOTIFICATION_TYPES: {
  key: NotificationTypeKey;
  label: string;
  description: string;
}[] = [
  {
    description: "When the status of your feedback changes",
    key: "notifyOnStatusChange",
    label: "Status changes",
  },
  {
    description: "When someone comments on your feedback",
    key: "notifyOnNewComment",
    label: "New comments",
  },
  {
    description: "When your feedback reaches a vote milestone",
    key: "notifyOnVoteMilestone",
    label: "Vote milestones",
  },
  {
    description: "When you receive a reply from support",
    key: "notifyOnNewSupportMessage",
    label: "Support messages",
  },
  {
    description: "When you’re invited to join an organization",
    key: "notifyOnInvitation",
    label: "Invitations",
  },
];

interface SwitchRowProps {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

function SwitchRow({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: SwitchRowProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label className="text-label" htmlFor={id}>
          {label}
        </label>
        <p className="text-caption text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      </div>
      <Switch
        aria-describedby={descriptionId}
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

interface PushSubscriptionInfo {
  _id: string;
  createdAt: number;
  endpoint: string;
  userAgent?: string;
}

export function NotificationSettings() {
  const preferences = useQuery(api.notifications.preferences.getPreferences);
  const updatePreferences = useMutation(
    api.notifications.preferences.updatePreferences
  );
  const subscriptions = useQuery(
    api.notifications.push_queries.getUserSubscriptions
  );
  const unsubscribeMutation = useMutation(
    api.notifications.push_queries.unsubscribe
  );
  const {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const [isToggling, setIsToggling] = useState(false);

  const isPrefsLoading = preferences === undefined;
  const pushEnabled = preferences?.pushEnabled ?? false;
  const isPushDenied = permissionState === "denied";

  const handlePushToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        const success = await subscribe();
        if (success) {
          await updatePreferences({ pushEnabled: true });
        } else if (!isPushDenied) {
          toast.error(
            "Couldn’t turn on push notifications. Check your browser settings and try again."
          );
        }
      } else {
        await unsubscribe();
        await updatePreferences({ pushEnabled: false });
      }
    } catch {
      toast.error("Couldn’t update push notifications. Try again.");
    }
    setIsToggling(false);
  };

  const handleTypeToggle = async (key: NotificationTypeKey, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
    } catch {
      toast.error("Couldn’t save that preference. Try again.");
    }
  };

  const handleRemoveDevice = async (endpoint: string) => {
    try {
      await unsubscribeMutation({ endpoint });
    } catch {
      toast.error("Couldn’t remove that device. Try again.");
    }
  };

  return (
    <>
      <SettingsSection
        description="Get notified on this device, even when Reflet isn’t open."
        title="Push notifications"
      >
        {isSupported ? null : (
          <div className="flex items-start gap-3 rounded-(--radius-panel) bg-warning-subtle p-3 text-body text-warning-text">
            <Warning aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p>
              Push notifications are not supported in this browser. Install
              Reflet as an app to get them.
            </p>
          </div>
        )}

        {isPushDenied ? (
          <div className="flex items-start gap-3 rounded-(--radius-panel) bg-destructive-subtle p-3 text-body text-destructive-text">
            <BellSlash aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p>
              Notifications are blocked by your browser. To turn them on, allow
              notifications for this site in your browser settings.
            </p>
          </div>
        ) : null}

        <SwitchRow
          checked={pushEnabled && isSubscribed}
          description={
            pushEnabled && isSubscribed
              ? "You’ll get push notifications on this device."
              : "Turn on to get push notifications on this device."
          }
          disabled={
            !isSupported ||
            isPushDenied ||
            isToggling ||
            isPushLoading ||
            isPrefsLoading
          }
          label="Enable push notifications"
          onCheckedChange={handlePushToggle}
        />
      </SettingsSection>

      <SettingsSection
        description={
          pushEnabled
            ? "Choose which activity sends you a notification."
            : "Turn on push notifications to choose which activity notifies you."
        }
        title="Notification types"
      >
        <div className="divide-y">
          {NOTIFICATION_TYPES.map((type) => (
            <SwitchRow
              checked={preferences?.[type.key] ?? true}
              description={type.description}
              disabled={!pushEnabled || isPrefsLoading}
              key={type.key}
              label={type.label}
              onCheckedChange={(value) => handleTypeToggle(type.key, value)}
            />
          ))}
        </div>
      </SettingsSection>

      {subscriptions && subscriptions.length > 0 ? (
        <SettingsSection
          description="Browsers and devices that receive your push notifications."
          title="Active devices"
        >
          <ul className="divide-y rounded-(--radius-panel) border">
            {subscriptions.map((sub: PushSubscriptionInfo) => {
              const deviceName = parseUserAgent(sub.userAgent);
              return (
                <li
                  className="flex items-center justify-between gap-4 p-4"
                  key={sub._id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-label">{deviceName}</p>
                    <p className="text-caption text-muted-foreground">
                      Added{" "}
                      {formatDistanceToNow(sub.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${deviceName}`}
                    onClick={() => handleRemoveDevice(sub.endpoint)}
                    size="sm"
                    tone="danger"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        </SettingsSection>
      ) : null}
    </>
  );
}

const MOBILE_REGEX = /mobile|android|iphone|ipad/i;
const EDGE_REGEX = /edg/i;
const CHROME_REGEX = /chrome/i;
const FIREFOX_REGEX = /firefox/i;
const SAFARI_REGEX = /safari/i;

function parseUserAgent(userAgent?: string): string {
  if (!userAgent) {
    return "Unknown device";
  }
  const device = MOBILE_REGEX.test(userAgent) ? "Mobile" : "Desktop";
  return `${detectBrowser(userAgent)} on ${device}`;
}

function detectBrowser(userAgent: string): string {
  if (EDGE_REGEX.test(userAgent)) {
    return "Edge";
  }
  if (CHROME_REGEX.test(userAgent)) {
    return "Chrome";
  }
  if (FIREFOX_REGEX.test(userAgent)) {
    return "Firefox";
  }
  if (SAFARI_REGEX.test(userAgent)) {
    return "Safari";
  }
  return "Browser";
}
