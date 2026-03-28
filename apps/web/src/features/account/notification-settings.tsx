"use client";

import {
  Bell,
  BellRinging,
  BellSlash,
  ChatCircle,
  Devices,
  Envelope,
  Trash,
  TrendUp,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { H3, Muted, Text } from "@/components/ui/typography";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface NotificationTypeToggleProps {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onToggle: (checked: boolean) => void;
}

function NotificationTypeToggle({
  label,
  description,
  icon,
  checked,
  disabled,
  onToggle,
}: NotificationTypeToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          {icon}
        </div>
        <div>
          <Text variant="label">{label}</Text>
          <Muted className="text-xs">{description}</Muted>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
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

  const handlePushToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        const success = await subscribe();
        if (success) {
          await updatePreferences({ pushEnabled: true });
          toast.success("Push notifications enabled");
        } else if (permissionState === "denied") {
          toast.error(
            "Notifications are blocked by your browser. Please allow them in your browser settings."
          );
        } else {
          toast.error("Failed to enable push notifications");
        }
      } else {
        await unsubscribe();
        await updatePreferences({ pushEnabled: false });
        toast.success("Push notifications disabled");
      }
    } catch {
      toast.error("Failed to update notification settings");
    } finally {
      setIsToggling(false);
    }
  };

  const handleTypeToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
    } catch {
      toast.error("Failed to update preference");
    }
  };

  const handleRemoveDevice = async (endpoint: string) => {
    try {
      await unsubscribeMutation({ endpoint });
      toast.success("Device removed");
    } catch {
      toast.error("Failed to remove device");
    }
  };

  const pushEnabled = preferences?.pushEnabled ?? false;
  const isPushDenied = permissionState === "denied";

  return (
    <div className="space-y-8">
      {/* Push Notifications Master Toggle */}
      <section className="space-y-4">
        <div>
          <H3 variant="section">Push Notifications</H3>
          <Muted>
            Receive real-time notifications on this device, even when the app is
            in the background.
          </Muted>
        </div>

        <div className="space-y-4">
          {!isSupported && (
            <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <Warning className="size-5 shrink-0" />
              <Text variant="bodySmall">
                Push notifications are not supported in this browser. Try
                installing the app as a PWA for the best experience.
              </Text>
            </div>
          )}

          {isPushDenied && (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-200">
              <BellSlash className="size-5 shrink-0" />
              <Text variant="bodySmall">
                Notifications are blocked by your browser. To enable them, open
                your browser settings and allow notifications for this site.
              </Text>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-olive-100 dark:bg-olive-800/30">
                {pushEnabled ? (
                  <BellRinging className="size-5 text-olive-600 dark:text-olive-400" />
                ) : (
                  <Bell className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Text variant="label">Enable push notifications</Text>
                <Muted className="text-xs">
                  {pushEnabled && isSubscribed
                    ? "You will receive push notifications on this device"
                    : "Turn on to receive push notifications"}
                </Muted>
              </div>
            </div>
            <Switch
              checked={pushEnabled && isSubscribed}
              disabled={
                !isSupported ||
                isPushDenied ||
                isToggling ||
                isPushLoading ||
                isPrefsLoading
              }
              onCheckedChange={handlePushToggle}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Per-type Notification Preferences */}
      <section className="space-y-4">
        <div>
          <H3 variant="section">Notification Types</H3>
          <Muted>
            Choose which types of notifications you want to receive via push.
          </Muted>
        </div>

        <div className="divide-y">
          <NotificationTypeToggle
            checked={preferences?.notifyOnStatusChange ?? true}
            description="When the status of your feedback changes"
            disabled={!pushEnabled || isPrefsLoading}
            icon={<TrendUp className="size-4 text-olive-500" />}
            label="Status changes"
            onToggle={(v) => handleTypeToggle("notifyOnStatusChange", v)}
          />
          <NotificationTypeToggle
            checked={preferences?.notifyOnNewComment ?? true}
            description="When someone comments on your feedback"
            disabled={!pushEnabled || isPrefsLoading}
            icon={<ChatCircle className="size-4 text-emerald-500" />}
            label="New comments"
            onToggle={(v) => handleTypeToggle("notifyOnNewComment", v)}
          />
          <NotificationTypeToggle
            checked={preferences?.notifyOnVoteMilestone ?? true}
            description="When your feedback reaches a vote milestone"
            disabled={!pushEnabled || isPrefsLoading}
            icon={<TrendUp className="size-4 text-amber-500" />}
            label="Vote milestones"
            onToggle={(v) => handleTypeToggle("notifyOnVoteMilestone", v)}
          />
          <NotificationTypeToggle
            checked={preferences?.notifyOnNewSupportMessage ?? true}
            description="When you receive a reply from support"
            disabled={!pushEnabled || isPrefsLoading}
            icon={<Envelope className="size-4 text-purple-500" />}
            label="Support messages"
            onToggle={(v) => handleTypeToggle("notifyOnNewSupportMessage", v)}
          />
          <NotificationTypeToggle
            checked={preferences?.notifyOnInvitation ?? true}
            description="When you're invited to join an organization"
            disabled={!pushEnabled || isPrefsLoading}
            icon={<Bell className="size-4 text-olive-500" />}
            label="Invitations"
            onToggle={(v) => handleTypeToggle("notifyOnInvitation", v)}
          />
        </div>
      </section>

      {/* Active Devices */}
      {subscriptions && subscriptions.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <div>
              <H3 variant="section">Active Devices</H3>
              <Muted>Devices currently receiving push notifications.</Muted>
            </div>

            <div className="divide-y">
              {subscriptions.map((sub: PushSubscriptionInfo) => (
                <div
                  className="flex items-center justify-between gap-4 py-3"
                  key={sub._id}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Devices className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <Text className="truncate" variant="label">
                        {parseUserAgent(sub.userAgent)}
                      </Text>
                      <Muted className="text-xs">
                        Registered{" "}
                        {formatDistanceToNow(sub.createdAt, {
                          addSuffix: true,
                        })}
                      </Muted>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemoveDevice(sub.endpoint)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <Muted className="text-xs">
              Each device where you enable notifications is listed here. Remove
              devices you no longer use.
            </Muted>
          </section>
        </>
      )}
    </div>
  );
}

const MOBILE_REGEX = /mobile|android|iphone|ipad/i;
const EDGE_REGEX = /edg/i;
const CHROME_REGEX = /chrome/i;
const FIREFOX_REGEX = /firefox/i;
const SAFARI_REGEX = /safari/i;

/**
 * Parse user agent string into a human-readable device name.
 */
function parseUserAgent(userAgent?: string): string {
  if (!userAgent) {
    return "Unknown device";
  }

  const isMobile = MOBILE_REGEX.test(userAgent);
  const browser = detectBrowser(userAgent);
  const device = isMobile ? "Mobile" : "Desktop";

  return `${browser} on ${device}`;
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
