"use client";

import { Bell, Chat, Envelope, TrendUp, UserPlus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type NotificationType =
  | "status_change"
  | "new_comment"
  | "vote_milestone"
  | "new_support_message"
  | "invitation";

const notificationIcons: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  status_change: TrendUp,
  new_comment: Chat,
  vote_milestone: TrendUp,
  new_support_message: Envelope,
  invitation: UserPlus,
};

const notificationColors: Record<NotificationType, string> = {
  status_change: "text-blue-500",
  new_comment: "text-green-500",
  vote_milestone: "text-amber-500",
  new_support_message: "text-purple-500",
  invitation: "text-olive-500",
};

interface NotificationItemProps {
  notification: {
    _id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    invitationToken?: string;
  };
}

function NotificationItem({ notification }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type];
  const iconColor = notificationColors[notification.type];

  const content = (
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

  // Make invitation notifications clickable
  if (notification.type === "invitation" && notification.invitationToken) {
    return (
      <Link href={`/invite/${notification.invitationToken}`}>{content}</Link>
    );
  }

  return content;
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
              {unreadCount} notification{unreadCount !== 1 && "s"} non lue
              {unreadCount !== 1 && "s"}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Vous êtes à jour</p>
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
                  Aucune notification
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Vous serez notifié des nouveaux feedbacks, commentaires et
                  mises à jour
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
