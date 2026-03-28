"use client";

import {
  ArrowRight,
  Check,
  Lightning,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RetroactiveDraftReviewProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function RetroactiveDraftReview({
  organizationId,
  orgSlug,
}: RetroactiveDraftReviewProps) {
  const job = useQuery(api.changelog.retroactive.getRetroactiveJob, {
    organizationId,
  });

  if (!job) {
    return null;
  }

  const createdReleases =
    job.groups?.filter(
      (g) => g.status === "created" || g.status === "generated"
    ) ?? [];
  const releaseCount = createdReleases.length;
  const hasError = job.status === "error";

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        {hasError ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <WarningCircle className="h-6 w-6 text-destructive" />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Lightning className="h-6 w-6 text-green-500" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-base">
            {hasError
              ? "Scan completed with errors"
              : `${releaseCount} draft release${releaseCount === 1 ? "" : "s"} generated`}
          </h3>
          {hasError && job.error && (
            <p className="text-destructive text-sm">{job.error}</p>
          )}
        </div>
      </div>

      {/* Release list */}
      {createdReleases.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Created drafts
          </span>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-md border">
            {createdReleases.map((group) => (
              <div
                className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                key={group.id}
              >
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-sm">
                    {group.version ?? group.id}
                  </span>
                  {group.generatedTitle && (
                    <span className="truncate text-muted-foreground text-xs">
                      {group.generatedTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {releaseCount > 0 && (
          <Button
            className="w-full"
            render={
              <Link href={`/dashboard/${orgSlug}/changelog/review-drafts`} />
            }
          >
            Review & Publish
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <p className="text-center text-muted-foreground text-xs">
          Drafts are saved and available in your changelog.
        </p>
      </div>
    </div>
  );
}
