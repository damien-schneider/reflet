"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { ElementType, ReactNode } from "react";
import { Label } from "@/components/ui/label";

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function pushButtonLabel(status?: string): string {
  if (status === "failed") {
    return "Retry";
  }
  return "Push";
}

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
        <WarningCircle className="h-3 w-3" />
        Sync failed
      </span>
    );
  }

  if (lastSyncAt) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
        <CheckCircle className="h-3 w-3" />
        Synced {formatRelativeTime(lastSyncAt)}
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
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
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
      <Label className="text-muted-foreground text-xs tabular-nums">
        <Icon className="mr-1 inline h-3.5 w-3.5" />
        {label}
      </Label>
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
            className="shrink-0 font-mono text-caption tabular-nums"
            variant={outlined ? "outline" : "default"}
          >
            {label}
          </Badge>
        )}
        <span className="truncate text-sm">{title}</span>
        {children}
      </div>
      {action}
    </div>
  );
}
