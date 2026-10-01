"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { GearSix } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { NotificationsContent } from "@/features/notifications/notifications-content";
import { PushNotificationPrompt } from "@/features/notifications/push-notification-prompt";

function UnreadSummary({ unreadCount }: { unreadCount: number | undefined }) {
  if (unreadCount === undefined) {
    return <Skeleton aria-hidden="true" className="mt-1 h-3 w-20" />;
  }
  return (
    <PopoverDescription className="text-muted-foreground text-xs">
      {unreadCount === 0 ? (
        "You’re all caught up"
      ) : (
        <>
          <span className="tabular-nums">{unreadCount}</span> unread
        </>
      )}
    </PopoverDescription>
  );
}

function NotificationsHeader({
  onSettingsNavigate,
}: {
  onSettingsNavigate: () => void;
}) {
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  return (
    <PopoverHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0 space-y-1">
        <PopoverTitle className="font-semibold text-sm">
          Notifications
        </PopoverTitle>
        <UnreadSummary unreadCount={unreadCount} />
      </div>
      <ButtonLink
        aria-label="Notification settings"
        className="min-h-11 min-w-11"
        iconOnly
        render={
          <Link
            href="/dashboard/account?tab=notifications"
            onNavigate={onSettingsNavigate}
          />
        }
        variant="ghost"
      >
        <GearSix aria-hidden="true" className="size-4" />
      </ButtonLink>
    </PopoverHeader>
  );
}

export function NotificationsPopover({
  onSettingsNavigate,
  render,
}: {
  onSettingsNavigate: () => void;
  render: React.ComponentProps<typeof PopoverTrigger>["render"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger render={render} />
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden"
        padding="none"
        side="right"
      >
        <NotificationsHeader
          onSettingsNavigate={() => {
            setIsOpen(false);
            onSettingsNavigate();
          }}
        />
        <NotificationsContent />
        <PushNotificationPrompt />
      </PopoverContent>
    </Popover>
  );
}
