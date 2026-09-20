"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import {
  Bell,
  Binoculars,
  Chat,
  Envelope,
  Package,
  ShieldWarning,
  TrendUp,
  UserPlus,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NotificationType =
  | "status_change"
  | "new_comment"
  | "vote_milestone"
  | "new_support_message"
  | "invitation"
  | "feedback_shipped"
  | "intelligence_insight"
  | "incident_detected"
  | "incident_resolved";

const notificationIcons: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  feedback_shipped: Package,
  incident_detected: ShieldWarning,
  incident_resolved: ShieldWarning,
  intelligence_insight: Binoculars,
  invitation: UserPlus,
  new_comment: Chat,
  new_support_message: Envelope,
  status_change: TrendUp,
  vote_milestone: TrendUp,
};

const notificationColors: Record<NotificationType, string> = {
  feedback_shipped: "text-success-text",
  incident_detected: "text-destructive-text",
  incident_resolved: "text-success-text",
  intelligence_insight: "text-chart-2-text",
  invitation: "text-brand-text",
  new_comment: "text-chart-1-text",
  new_support_message: "text-chart-4-text",
  status_change: "text-brand-text",
  vote_milestone: "text-warning-text",
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
        <p className="mt-1 text-caption text-muted-foreground">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-brand" />
      )}
    </div>
  );

  if (notification.type === "invitation" && notification.invitationToken) {
    return (
      <Link href={`/invite/${notification.invitationToken}`}>{content}</Link>
    );
  }

  return content;
}

export function NotificationsPopover({
  className,
  render,
}: {
  className?: string;
  render?: React.ComponentProps<typeof PopoverTrigger>["render"];
}) {
  const notifications = useQuery(api.notifications.queries.list, { limit: 10 });
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const hasUnread = unreadCount !== undefined && unreadCount > 0;

  return (
    <Popover>
      {render ? (
        <PopoverTrigger render={render} />
      ) : (
        <PopoverTrigger
          render={
            <Button
              aria-label={
                hasUnread
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
              className={cn("relative size-8", className)}
              iconOnly
              size="sm"
              variant="ghost"
            >
              <Bell className="h-4 w-4" />
              {hasUnread ? (
                <span
                  aria-hidden="true"
                  className="-top-0.5 -right-0.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-micro font-medium text-brand-foreground tabular-nums"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          }
        />
      )}
      <PopoverContent align="end" className="w-80 p-0" side="right">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {hasUnread ? (
            <p className="text-muted-foreground text-xs">
              <span className="tabular-nums">{unreadCount}</span> notification
              {unreadCount !== 1 && "s"} non lue{unreadCount !== 1 && "s"}
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
                  notification={{
                    _id: notification._id,
                    createdAt: notification.createdAt,
                    invitationToken: notification.invitationToken,
                    isRead: notification.isRead,
                    message: notification.message,
                    title: notification.title,
                    type: notification.type,
                  }}
                />
              ))}
            </div>
          ) : (
            <Empty className="h-full p-8 text-center">
              <EmptyHeader>
                <EmptyMedia>
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </EmptyMedia>
                <EmptyTitle className="mt-2 text-muted-foreground text-sm">
                  Aucune notification
                </EmptyTitle>
                <EmptyDescription className="mt-1 text-muted-foreground/70 text-xs">
                  Vous serez notifié des nouveaux feedbacks, commentaires et
                  mises à jour
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
