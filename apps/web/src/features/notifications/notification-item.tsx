"use client";

import {
  Binoculars,
  Chat,
  Envelope,
  Package,
  ShieldWarning,
  TrendUp,
  UserPlus,
} from "@phosphor-icons/react";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NotificationType = Doc<"notifications">["type"];

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
  notification: Pick<
    Doc<"notifications">,
    "type" | "title" | "message" | "isRead" | "createdAt" | "invitationToken"
  >;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const isInvitation =
    notification.type === "invitation" && notification.invitationToken;

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
          <NotificationContent notification={notification} />
        </Link>
      </li>
    );
  }

  return (
    <li className={rowClassName}>
      <NotificationContent notification={notification} />
    </li>
  );
}

function NotificationContent({ notification }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type];
  return (
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
}
