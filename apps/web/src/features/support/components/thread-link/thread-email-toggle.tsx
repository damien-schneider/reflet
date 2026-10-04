"use client";

import { Switch } from "@ctrl-ui/react/ui/switch";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";

export function ThreadEmailToggle({ token }: { token: string }) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const notifications = useQuery(
    api.support.email.contacts.getThreadNotifications,
    { token }
  );
  const setThreadNotifications = useMutation(
    api.support.email.contacts.setThreadNotifications
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!notifications) {
    return null;
  }

  const handleChange = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      await setThreadNotifications({ enabled, token });
    } catch {
      toast.error("Couldn’t update email notifications. Try again.");
    }
    setIsSaving(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-(--radius-panel) border p-3">
      <div className="min-w-0">
        <label className="text-label" htmlFor={id}>
          Email notifications
        </label>
        <p
          className="truncate text-caption text-muted-foreground"
          id={descriptionId}
        >
          {notifications.enabled
            ? `We email ${notifications.email} when the team replies.`
            : `Replies aren’t emailed to ${notifications.email}.`}
        </p>
      </div>
      <Switch
        aria-describedby={descriptionId}
        checked={notifications.enabled}
        disabled={isSaving}
        id={id}
        onCheckedChange={handleChange}
      />
    </div>
  );
}
