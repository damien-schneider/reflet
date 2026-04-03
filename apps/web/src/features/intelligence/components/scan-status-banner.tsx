"use client";

import { ArrowsClockwise, MagnifyingGlass, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "just now";
};

/** Non-fatal error swallower for fire-and-forget mutations */
const noop = () => {
  // Intentionally empty — dismiss/cancel failures are non-critical
};

const getProgressText = (
  status: string,
  elapsedSeconds: number,
  currentStep?: string,
  stats?: { itemsProcessed: number; errors: number }
): string => {
  if (currentStep) {
    return currentStep;
  }
  if (status === "pending" && elapsedSeconds < 10) {
    return "Starting scan...";
  }
  if (stats) {
    const parts = [`${stats.itemsProcessed} steps completed`];
    if (stats.errors > 0) {
      parts.push(`${stats.errors} errors`);
    }
    return parts.join(", ");
  }
  return `Scanning... (${elapsedSeconds}s)`;
};

interface ScanStatusBannerProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export const ScanStatusBanner = ({
  organizationId,
  orgSlug,
}: ScanStatusBannerProps) => {
  const prevJobStatusRef = useRef<string | null>(null);

  const config = useQuery(api.autopilot.intelligence.config.get, {
    organizationId,
  });

  const job = useQuery(api.autopilot.intelligence.config.getActiveScan, {
    organizationId,
  });

  const keywords = useQuery(api.autopilot.intelligence.keywords.list, {
    organizationId,
  });

  const competitors = useQuery(api.autopilot.intelligence.competitors.list, {
    organizationId,
  });

  const hasKeywords = keywords && keywords.length > 0;
  const hasCompetitors = competitors && competitors.length > 0;
  const canScan = hasKeywords || hasCompetitors;

  const startManualScan = useMutation(
    api.autopilot.intelligence.config.startManualScan
  );
  const dismissScan = useMutation(
    api.autopilot.intelligence.config.dismissScan
  );
  const cancelScan = useMutation(api.autopilot.intelligence.config.cancelScan);

  const jobStatus = job?.status ?? null;
  const isStale = job !== null && job !== undefined && "_stale" in job;

  // Auto-cancel stale jobs (stuck >2min)
  useEffect(
    function autoCancelStaleJobs() {
      if (!(isStale && job)) {
        return;
      }
      toast.error("Intelligence scan timed out", {
        description: "The scan took too long and was cancelled automatically.",
      });
      cancelScan({ organizationId }).catch(noop);
    },
    [isStale, job, cancelScan, organizationId]
  );

  // Fire toast on status transitions
  useEffect(
    function notifyOnScanStatusTransition() {
      const prevStatus = prevJobStatusRef.current;
      if (prevStatus === jobStatus) {
        return;
      }
      prevJobStatusRef.current = jobStatus;

      const wasActive = prevStatus === "pending" || prevStatus === "processing";
      if (!wasActive) {
        return;
      }

      if (jobStatus === "completed") {
        const stats = job?.stats;
        if (stats && stats.itemsProcessed > 0) {
          toast.success("Intelligence scan complete", {
            description: `${stats.itemsProcessed} steps completed, ${stats.errors} errors`,
          });
        } else {
          toast.info("Scan complete — no new signals found", {
            description:
              "Try adding more keywords or competitors for better results.",
          });
        }
        if (job) {
          dismissScan({ jobId: job._id }).catch(noop);
        }
      } else if (jobStatus === "failed") {
        toast.error("Intelligence scan failed", {
          description:
            job?.errorMessage ??
            "Check your OpenRouter API key and intelligence settings.",
        });
        if (job) {
          dismissScan({ jobId: job._id }).catch(noop);
        }
      }
    },
    [jobStatus, job, dismissScan]
  );

  const handleStartScan = async () => {
    try {
      await startManualScan({ organizationId });
      toast.success("Intelligence scan started");
    } catch (error) {
      toast.error("Failed to start scan", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleCancelScan = async () => {
    try {
      await cancelScan({ organizationId });
      toast.success("Scan cancelled");
    } catch (error) {
      toast.error("Failed to cancel scan", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const isProcessing = jobStatus === "pending" || jobStatus === "processing";

  if (isProcessing && !isStale) {
    const elapsedSeconds = job
      ? Math.floor((Date.now() - job.startedAt) / 1000)
      : 0;

    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 py-3">
          <ArrowsClockwise className="h-5 w-5 animate-spin text-primary" />
          <div className="flex flex-1 flex-col">
            <span className="font-medium text-sm">
              Intelligence scan in progress...
            </span>
            <span className="text-muted-foreground text-xs">
              {getProgressText(
                job?.status ?? "pending",
                elapsedSeconds,
                job?.currentStep ?? undefined,
                job?.stats ?? undefined
              )}
            </span>
          </div>
          <Button
            className="shrink-0"
            onClick={handleCancelScan}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <Button
        className="shrink-0 gap-1.5"
        disabled={!canScan}
        onClick={handleStartScan}
        size="sm"
        variant="outline"
      >
        <MagnifyingGlass className="h-4 w-4" />
        <span>Run Scan Now</span>
      </Button>
      {!canScan && (
        <span className="text-muted-foreground text-xs">
          Add{" "}
          <Link
            className="underline hover:text-foreground"
            href={`/dashboard/${orgSlug}/autopilot/intelligence`}
          >
            keywords
          </Link>{" "}
          or{" "}
          <Link
            className="underline hover:text-foreground"
            href={`/dashboard/${orgSlug}/autopilot/intelligence`}
          >
            competitors
          </Link>{" "}
          first to run a scan
        </span>
      )}
      {canScan && config?.lastScanAt && (
        <span className="text-muted-foreground text-xs">
          Last scan: {formatRelativeTime(config.lastScanAt)}
        </span>
      )}
    </div>
  );
};
