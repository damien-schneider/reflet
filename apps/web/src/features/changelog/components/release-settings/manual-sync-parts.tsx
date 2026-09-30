"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import type { ElementType, ReactNode } from "react";

export function SyncStatusIndicator({
  lastSyncAt,
  lastSyncStatus,
}: {
  lastSyncAt?: number;
  lastSyncStatus?: string;
}) {
  if (lastSyncStatus === "syncing") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Spinner size="xs" />
        Syncing…
      </span>
    );
  }

  if (lastSyncStatus === "error") {
    return (
      <span className="flex items-center gap-1.5 text-destructive-text text-xs">
        <WarningCircle aria-hidden className="size-3" />
        Sync failed
      </span>
    );
  }

  if (lastSyncAt) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
        <CheckCircle aria-hidden className="size-3" />
        Synced{" "}
        <time
          dateTime={new Date(lastSyncAt).toISOString()}
          title={format(lastSyncAt, "MMM d, yyyy, h:mm a")}
        >
          {formatDistanceToNow(lastSyncAt, { addSuffix: true })}
        </time>
      </span>
    );
  }

  return <span className="text-muted-foreground text-xs">Never synced</span>;
}

export function SyncLoadingSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function SyncGroup({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  icon: ElementType;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-muted-foreground text-xs">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </p>
      {children}
    </div>
  );
}

export function SyncRow({
  action,
  children,
  label,
  outlined,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  label?: string;
  outlined?: boolean;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2 overflow-hidden">
        {label && (
          <Badge
            className="shrink-0 font-mono tabular-nums"
            size="sm"
            variant={outlined ? "outline" : "default"}
          >
            {label}
          </Badge>
        )}
        <span className="truncate text-sm" title={title}>
          {title}
        </span>
        {children}
      </div>
      {action}
    </div>
  );
}
