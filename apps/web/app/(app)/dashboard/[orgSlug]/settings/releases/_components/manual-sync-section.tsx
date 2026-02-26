"use client";

import {
  ArrowSquareOut,
  ArrowsClockwise,
  CheckCircle,
  CloudArrowDown,
  CloudArrowUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface ManualSyncSectionProps {
  isAdmin: boolean;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  organizationId: Id<"organizations">;
}

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

function SyncStatusIndicator({
  lastSyncAt,
  lastSyncStatus,
}: {
  lastSyncAt?: number;
  lastSyncStatus?: string;
}) {
  if (lastSyncStatus === "syncing") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <ArrowsClockwise className="h-3 w-3 animate-spin" />
        Syncing…
      </span>
    );
  }

  if (lastSyncStatus === "error") {
    return (
      <span className="flex items-center gap-1.5 text-destructive text-xs">
        <WarningCircle className="h-3 w-3" />
        Sync failed
      </span>
    );
  }

  if (lastSyncAt) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <CheckCircle className="h-3 w-3" />
        Synced {formatRelativeTime(lastSyncAt)}
      </span>
    );
  }

  return <span className="text-muted-foreground text-xs">Never synced</span>;
}

function LoadingSkeleton() {
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

export const ManualSyncSection = ({
  isAdmin,
  lastSyncAt,
  lastSyncStatus,
  organizationId,
}: ManualSyncSectionProps) => {
  const syncStatus = useQuery(api.github.getReleaseSyncStatus, {
    organizationId,
  });
  const triggerSync = useMutation(api.changelog_actions.triggerGithubSync);
  const importRelease = useMutation(api.github.importGithubRelease);
  const pushToGithub = useMutation(api.changelog_actions.pushToGithub);

  const [importingId, setImportingId] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const isSyncing = lastSyncStatus === "syncing";

  const handleSync = async () => {
    try {
      await triggerSync({ organizationId });
      toast.success("Sync started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start sync"
      );
    }
  };

  const handleImport = async (githubReleaseId: Id<"githubReleases">) => {
    setImportingId(githubReleaseId);
    try {
      await importRelease({ githubReleaseId, autoPublish: true });
      toast.success("Release imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import");
    } finally {
      setImportingId(null);
    }
  };

  const handlePush = async (releaseId: Id<"releases">) => {
    setPushingId(releaseId);
    try {
      await pushToGithub({ releaseId });
      toast.success("Push scheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to push");
    } finally {
      setPushingId(null);
    }
  };

  if (!syncStatus) {
    return <LoadingSkeleton />;
  }

  const { githubOnly, refletOnly, synced } = syncStatus;
  const totalCount = githubOnly.length + refletOnly.length + synced.length;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Release Sync</p>
            {totalCount > 0 && (
              <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
                {totalCount}
              </Badge>
            )}
          </div>
          <SyncStatusIndicator
            lastSyncAt={lastSyncAt}
            lastSyncStatus={lastSyncStatus}
          />
        </div>
        <Button
          disabled={!isAdmin || isSyncing}
          onClick={handleSync}
          size="sm"
          variant="outline"
        >
          <ArrowsClockwise
            className={`mr-1.5 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          />
          {isSyncing ? "Syncing…" : "Sync with GitHub"}
        </Button>
      </div>

      {totalCount > 0 ? (
        <div className="space-y-3 border-t pt-3">
          {githubOnly.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                <CloudArrowDown className="mr-1 inline h-3.5 w-3.5" />
                Available to import ({githubOnly.length})
              </Label>
              {githubOnly.map((gr) => (
                <div
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                  key={gr._id}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Badge
                      className="shrink-0 font-mono text-[11px]"
                      variant="outline"
                    >
                      {gr.tagName}
                    </Badge>
                    <span className="truncate text-sm">
                      {gr.name ?? gr.tagName}
                    </span>
                  </div>
                  <Button
                    className="ml-2 shrink-0"
                    disabled={!isAdmin || importingId === gr._id}
                    onClick={() => handleImport(gr._id)}
                    size="sm"
                    variant="ghost"
                  >
                    {importingId === gr._id ? (
                      <ArrowsClockwise className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <CloudArrowDown className="mr-1 h-3 w-3" />
                    )}
                    {importingId === gr._id ? "Importing…" : "Import"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {refletOnly.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                <CloudArrowUp className="mr-1 inline h-3.5 w-3.5" />
                Not on GitHub ({refletOnly.length})
              </Label>
              {refletOnly.map((r) => (
                <div
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                  key={r._id}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {r.version && (
                      <Badge
                        className="shrink-0 font-mono text-[11px]"
                        variant="outline"
                      >
                        {r.version}
                      </Badge>
                    )}
                    <span className="truncate text-sm">{r.title}</span>
                  </div>
                  <Button
                    className="ml-2 shrink-0"
                    disabled={!isAdmin || pushingId === r._id}
                    onClick={() => handlePush(r._id)}
                    size="sm"
                    variant="ghost"
                  >
                    {pushingId === r._id ? (
                      <ArrowsClockwise className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <CloudArrowUp className="mr-1 h-3 w-3" />
                    )}
                    {pushingId === r._id ? "Pushing…" : "Push"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {synced.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                Linked ({synced.length})
              </Label>
              {synced.map((r) => (
                <div
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                  key={r._id}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {r.version && (
                      <Badge
                        className="shrink-0 font-mono text-[11px]"
                        variant="secondary"
                      >
                        {r.version}
                      </Badge>
                    )}
                    <span className="truncate text-sm">{r.title}</span>
                  </div>
                  {r.githubHtmlUrl && (
                    <a
                      className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      href={r.githubHtmlUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ArrowSquareOut className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="border-t pt-3 text-center text-muted-foreground text-xs">
          No releases found. Click "Sync with GitHub" to fetch releases from
          your repository.
        </p>
      )}
    </div>
  );
};
