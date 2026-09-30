"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowsClockwise, MagnifyingGlass, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

const noop = () => undefined;

const MS_PER_SECOND = 1000;

const subscribeToSecondTick = (onTick: () => void) => {
  const intervalId = setInterval(onTick, MS_PER_SECOND);
  return () => clearInterval(intervalId);
};

const readNowInSeconds = () => Math.floor(Date.now() / MS_PER_SECOND);

type ActiveScan = FunctionReturnType<
  typeof api.intelligence.scan_control.getActiveScan
>;

const getProgressText = (
  job: ActiveScan | undefined,
  elapsedSeconds: number
): string => {
  if (job?.currentStep) {
    return job.currentStep;
  }
  if ((job?.status ?? "pending") === "pending" && elapsedSeconds < 10) {
    return "Starting scan…";
  }
  if (job?.stats) {
    const { errors, itemsProcessed } = job.stats;
    const parts = [`${itemsProcessed} steps done`];
    if (errors > 0) {
      parts.push(`${errors} ${errors === 1 ? "error" : "errors"}`);
    }
    return parts.join(", ");
  }
  return `Scanning… ${elapsedSeconds}s`;
};

const showScanOutcomeToast = (
  status: string | null,
  job: ActiveScan | undefined
): boolean => {
  if (status === "completed") {
    const stats = job?.stats;
    if (stats && stats.itemsProcessed > 0) {
      toast.success("Scan complete", {
        description: `${stats.itemsProcessed} steps done, ${stats.errors} ${stats.errors === 1 ? "error" : "errors"}`,
      });
    } else {
      toast.info("Scan complete, no new signals", {
        description: "Add more keywords or competitors to widen the scan.",
      });
    }
    return true;
  }
  if (status === "failed") {
    toast.error("Scan failed", {
      description:
        job?.errorMessage ??
        "Check your OpenRouter API key in intelligence settings, then run it again.",
    });
    return true;
  }
  return false;
};

function useScanOutcomeNotifications(
  organizationId: Id<"organizations">,
  job: ActiveScan | undefined
) {
  const prevJobStatusRef = useRef<string | null>(null);
  const dismissScan = useMutation(api.intelligence.scan_control.dismissScan);
  const cancelScan = useMutation(api.intelligence.scan_control.cancelScan);

  const jobStatus = job?.status ?? null;
  const isStale = job !== null && job !== undefined && "_stale" in job;

  useEffect(() => {
    if (!(isStale && job)) {
      return;
    }
    toast.error("Scan timed out", {
      description: "It ran for over 2 minutes and was stopped. Run it again.",
    });
    cancelScan({ organizationId }).catch(noop);
  }, [isStale, job, cancelScan, organizationId]);

  useEffect(() => {
    const prevStatus = prevJobStatusRef.current;
    if (prevStatus === jobStatus) {
      return;
    }
    prevJobStatusRef.current = jobStatus;

    const wasActive = prevStatus === "pending" || prevStatus === "processing";
    if (!wasActive) {
      return;
    }

    const finished = showScanOutcomeToast(jobStatus, job);
    if (finished && job) {
      dismissScan({ jobId: job._id }).catch(noop);
    }
  }, [jobStatus, job, dismissScan]);

  const isProcessing = jobStatus === "pending" || jobStatus === "processing";
  return isProcessing && !isStale;
}

function ScanProgressCard({
  job,
  organizationId,
}: {
  job: ActiveScan | undefined;
  organizationId: Id<"organizations">;
}) {
  const cancelScan = useMutation(api.intelligence.scan_control.cancelScan);
  const nowInSeconds = useSyncExternalStore(
    subscribeToSecondTick,
    readNowInSeconds,
    () => null
  );
  const elapsedSeconds =
    job && nowInSeconds !== null
      ? Math.max(0, nowInSeconds - Math.floor(job.startedAt / MS_PER_SECOND))
      : 0;

  const handleCancelScan = async () => {
    try {
      await cancelScan({ organizationId });
    } catch (error) {
      toast.error("Couldn’t cancel the scan", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="flex items-center gap-3 py-3">
        <ArrowsClockwise
          aria-hidden
          className="size-5 shrink-0 text-primary motion-safe:animate-spin"
        />
        <div
          aria-live="polite"
          className="flex min-w-0 flex-1 flex-col"
          role="status"
        >
          <span className="font-medium text-sm">Scan in progress</span>
          <span className="truncate text-muted-foreground text-xs tabular-nums">
            {getProgressText(job, elapsedSeconds)}
          </span>
        </div>
        <Button
          className="shrink-0"
          onClick={handleCancelScan}
          size="xs"
          variant="ghost"
        >
          <X data-icon="inline-start" />
          Cancel scan
        </Button>
      </CardContent>
    </Card>
  );
}

function ScanSourcesHint({ orgSlug }: { orgSlug: string }) {
  return (
    <span className="text-muted-foreground text-xs">
      Add{" "}
      <Link
        className="underline underline-offset-2 hover:text-foreground"
        href={`/dashboard/${orgSlug}/intelligence?tab=community`}
      >
        keywords
      </Link>{" "}
      or{" "}
      <Link
        className="underline underline-offset-2 hover:text-foreground"
        href={`/dashboard/${orgSlug}/intelligence?tab=competitors`}
      >
        competitors
      </Link>{" "}
      to run a scan.
    </span>
  );
}

function LastScanTime({ lastScanAt }: { lastScanAt: number }) {
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      Last scan{" "}
      <time
        dateTime={new Date(lastScanAt).toISOString()}
        title={format(lastScanAt, "PPpp")}
      >
        {formatDistanceToNow(lastScanAt, { addSuffix: true })}
      </time>
    </span>
  );
}

function ScanIdleActions({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const config = useQuery(api.intelligence.config.get, { organizationId });
  const keywords = useQuery(api.intelligence.keywords.list, { organizationId });
  const competitors = useQuery(api.intelligence.competitors.list, {
    organizationId,
  });
  const startManualScan = useMutation(
    api.intelligence.scan_control.startManualScan
  );

  const canScan = Boolean(keywords?.length || competitors?.length);
  const sourcesLoaded = keywords !== undefined && competitors !== undefined;

  const handleStartScan = async () => {
    try {
      await startManualScan({ organizationId });
    } catch (error) {
      toast.error("Couldn’t start the scan", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button
        className="shrink-0"
        disabled={!canScan}
        onClick={handleStartScan}
        size="xs"
        variant="surface"
      >
        <MagnifyingGlass data-icon="inline-start" />
        Run scan
      </Button>
      {sourcesLoaded && !canScan && <ScanSourcesHint orgSlug={orgSlug} />}
      {canScan && config?.lastScanAt && (
        <LastScanTime lastScanAt={config.lastScanAt} />
      )}
    </div>
  );
}

interface ScanStatusBannerProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export const ScanStatusBanner = ({
  organizationId,
  orgSlug,
}: ScanStatusBannerProps) => {
  const job = useQuery(api.intelligence.scan_control.getActiveScan, {
    organizationId,
  });
  const isScanning = useScanOutcomeNotifications(organizationId, job);

  if (isScanning) {
    return <ScanProgressCard job={job} organizationId={organizationId} />;
  }

  return <ScanIdleActions organizationId={organizationId} orgSlug={orgSlug} />;
};
