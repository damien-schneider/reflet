"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Bell } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { NotificationItem } from "@/features/notifications/notification-item";

const SKELETON_ROWS = ["first", "second", "third"] as const;

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
    <Empty className="h-75 [--cui-empty-background:transparent] [--cui-empty-border-width:0px] [--cui-empty-radius:0px]">
      <EmptyHeader>
        <EmptyMedia>
          <Bell aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No notifications yet</EmptyTitle>
        <EmptyDescription>
          New feedback, comments, and status changes will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function NotificationsContent() {
  const notifications = useQuery(api.notifications.queries.list, { limit: 10 });
  if (notifications === undefined) {
    return (
      <div aria-busy="true" className="h-75">
        <span className="sr-only" role="status">
          Loading notifications…
        </span>
        <NotificationsSkeleton />
      </div>
    );
  }
  if (notifications.length === 0) {
    return <NotificationsEmpty />;
  }
  return (
    <ScrollArea className="h-75" mask={false} viewportClassName="p-2">
      <ul className="space-y-1">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}
