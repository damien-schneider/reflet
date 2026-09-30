"use client";

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
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
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
import { format, formatDistanceToNow } from "date-fns";
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

const SKELETON_ROWS = ["first", "second", "third"] as const;

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
  const isInvitation =
    notification.type === "invitation" && notification.invitationToken;

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted",
          notificationColors[notification.type]
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-pretty font-medium text-sm leading-tight">
          {notification.isRead ? null : (
            <span className="sr-only">Unread: </span>
          )}
          {notification.title}
        </span>
        <span className="mt-0.5 line-clamp-2 text-pretty text-muted-foreground text-xs">
          {notification.message}
        </span>
        <time
          className="mt-1 block text-caption text-muted-foreground"
          dateTime={new Date(notification.createdAt).toISOString()}
          title={format(notification.createdAt, "PPp")}
        >
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </time>
      </span>
      {notification.isRead ? null : (
        <span
          aria-hidden="true"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
        />
      )}
    </>
  );

  const rowClassName = cn(
    "flex gap-3 rounded-(--radius-popup-item) p-3",
    !notification.isRead && "bg-accent/50"
  );

  if (isInvitation) {
    return (
      <li>
        <Link
          className={cn(rowClassName, "hover:bg-accent")}
          href={`/invite/${notification.invitationToken}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return <li className={rowClassName}>{content}</li>;
}

function NotificationsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-1 p-2">
      {SKELETON_ROWS.map((row) => (
        <div className="flex gap-3 p-3" key={row}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsEmpty() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia>
          <Bell />
        </EmptyMedia>
        <EmptyTitle>No notifications yet</EmptyTitle>
        <EmptyDescription>
          New feedback, comments, and status changes will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

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

export function NotificationsPopover({
  render,
}: {
  render: React.ComponentProps<typeof PopoverTrigger>["render"];
}) {
  const notifications = useQuery(api.notifications.queries.list, { limit: 10 });
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);

  return (
    <Popover>
      <PopoverTrigger render={render} />
      <PopoverContent align="end" className="w-80" padding="none" side="right">
        <PopoverHeader className="border-b px-4 py-3">
          <PopoverTitle className="font-semibold text-sm">
            Notifications
          </PopoverTitle>
          <UnreadSummary unreadCount={unreadCount} />
        </PopoverHeader>
        <ScrollArea className="h-75">
          {notifications === undefined ? <NotificationsSkeleton /> : null}
          {notifications?.length === 0 ? <NotificationsEmpty /> : null}
          {notifications && notifications.length > 0 ? (
            <ul className="space-y-1 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                />
              ))}
            </ul>
          ) : null}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
