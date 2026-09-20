"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
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
import Link from "next/link";
import { useState } from "react";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  pushButtonLabel,
  SyncGroup,
  SyncLoadingSkeleton,
  SyncRow,
  SyncStatusIndicator,
} from "./manual-sync-parts";

interface ManualSyncSectionProps {
  isAdmin: boolean;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export const ManualSyncSection = ({
  isAdmin,
  lastSyncAt,
  lastSyncStatus,
  organizationId,
  orgSlug,
}: ManualSyncSectionProps) => {
  const { data: session } = authClient.useSession();
  const syncStatus = useQuery(
    api.integrations.github.queries.getReleaseSyncStatus,
    {
      organizationId,
    }
  );
  const triggerSync = useMutation(api.changelog.actions.triggerGithubSync);
  const importRelease = useMutation(
    api.integrations.github.release_mutations.importGithubRelease
  );
  const pushToGithub = useMutation(api.changelog.actions.pushToGithub);

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
      await importRelease({ autoPublish: true, githubReleaseId });
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
    return <SyncLoadingSkeleton />;
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
              <Badge className="px-1.5 py-0 text-micro tabular-nums">
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
          size="xs"
          variant="surface"
        >
          <ArrowsClockwise
            className={cn("mr-1.5 h-4 w-4", isSyncing && "animate-spin")}
          />
          {isSyncing ? "Syncing…" : "Sync with GitHub"}
        </Button>
      </div>

      {totalCount > 0 ? (
        <div className="space-y-3 border-t pt-3">
          {githubOnly.length > 0 && (
            <SyncGroup
              icon={CloudArrowDown}
              label={`Available to import (${githubOnly.length})`}
            >
              {githubOnly.map((gr) => (
                <SyncRow
                  action={
                    <Button
                      className="ml-2 shrink-0"
                      disabled={!isAdmin || importingId === gr._id}
                      onClick={() => handleImport(gr._id)}
                      size="xs"
                      variant="ghost"
                    >
                      {importingId === gr._id ? (
                        <Spinner className="mr-1" size="xs" />
                      ) : (
                        <CloudArrowDown className="mr-1 h-3 w-3" />
                      )}
                      {importingId === gr._id ? "Importing…" : "Import"}
                    </Button>
                  }
                  key={gr._id}
                  label={gr.tagName}
                  outlined
                  title={gr.name ?? gr.tagName}
                />
              ))}
            </SyncGroup>
          )}

          {refletOnly.length > 0 && (
            <SyncGroup
              icon={CloudArrowUp}
              label={`Not on GitHub (${refletOnly.length})`}
            >
              {refletOnly.map((r) => (
                <SyncRow
                  action={
                    <Button
                      className="ml-2 shrink-0"
                      disabled={!isAdmin || pushingId === r._id}
                      onClick={() => handlePush(r._id)}
                      size="xs"
                      variant="ghost"
                    >
                      {pushingId === r._id ? (
                        <Spinner className="mr-1" size="xs" />
                      ) : (
                        <CloudArrowUp className="mr-1 h-3 w-3" />
                      )}
                      {pushingId === r._id
                        ? "Pushing…"
                        : pushButtonLabel(r.githubPushStatus)}
                    </Button>
                  }
                  key={r._id}
                  label={r.version}
                  outlined
                  title={r.title}
                >
                  {r.githubPushStatus === "failed" && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            className="h-auto shrink-0 gap-1 px-1 py-0 text-destructive-text text-xs"
                            size="xs"
                            type="button"
                            variant="quiet"
                          >
                            <WarningCircle className="h-3 w-3" />
                            Failed
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {r.githubPushErrorType === "permission_denied"
                          ? "GitHub App lacks permission to create releases. Reconnect to update permissions."
                          : (r.githubPushError ?? "Push to GitHub failed")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {r.githubPushStatus === "failed" &&
                    r.githubPushErrorType === "permission_denied" && (
                      <Link
                        className="shrink-0 font-medium text-primary text-xs hover:underline"
                        href={
                          buildGitHubInstallUrl({
                            organizationId,
                            orgSlug,
                            userId: session?.user?.id,
                          }) ?? "#"
                        }
                      >
                        Reconnect
                      </Link>
                    )}
                  {r.githubPushStatus === "pending" && (
                    <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                      <Spinner size="xs" />
                      Pending
                    </span>
                  )}
                </SyncRow>
              ))}
            </SyncGroup>
          )}

          {synced.length > 0 && (
            <SyncGroup icon={CheckCircle} label={`Linked (${synced.length})`}>
              {synced.map((r) => (
                <SyncRow
                  action={
                    r.githubHtmlUrl && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <a
                              aria-label={`View ${r.title} on GitHub`}
                              className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                              href={r.githubHtmlUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <ArrowSquareOut className="h-4 w-4" />
                            </a>
                          }
                        />
                        <TooltipContent>View on GitHub</TooltipContent>
                      </Tooltip>
                    )
                  }
                  key={r._id}
                  label={r.version}
                  title={r.title}
                />
              ))}
            </SyncGroup>
          )}
        </div>
      ) : (
        <Empty className="border-t pt-3">
          <EmptyHeader>
            <EmptyMedia>
              <CloudArrowDown className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No releases found</EmptyTitle>
            <EmptyDescription>
              Click "Sync with GitHub" to fetch releases from your repository.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
};
