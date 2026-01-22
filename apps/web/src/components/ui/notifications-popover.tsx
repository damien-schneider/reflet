"use client";

import { Bell, Chat, TrendUp } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type NotificationType = "status_change" | "new_comment" | "vote_milestone";

const notificationIcons: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  status_change: TrendUp,
  new_comment: Chat,
  vote_milestone: TrendUp,
};

const notificationColors: Record<NotificationType, string> = {
  status_change: "text-blue-500",
  new_comment: "text-green-500",
  vote_milestone: "text-amber-500",
};

interface NotificationItemProps {
  notification: {
    _id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
  };
}

function NotificationItem({ notification }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type];
  const iconColor = notificationColors[notification.type];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md p-3 transition-colors hover:bg-accent",
        !notification.isRead && "bg-accent/50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
          iconColor
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm leading-tight">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
          {notification.message}
        </p>
        <p className="mt-1 text-muted-foreground text-[10px]">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-olive-500" />
      )}
    </div>
  );
}

export function NotificationsPopover({ className }: { className?: string }) {
  const notifications = useQuery(api.notifications.list, { limit: 10 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount && unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-olive-500 px-1 font-medium text-[10px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">Notifications</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" side="right">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount && unreadCount > 0 ? (
            <p className="text-muted-foreground text-xs">
              {unreadCount} unread notification{unreadCount !== 1 && "s"}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              You're all caught up
            </p>
          )}
        </div>
        <ScrollArea className="h-75">
          {notifications && notifications.length > 0 ? (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={
                    notification as NotificationItemProps["notification"]
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground text-sm">
                  No notifications yet
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  You'll be notified about new feedback, comments, and updates
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
