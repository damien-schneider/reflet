"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { CloudArrowUp, Eye } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";

interface RetroactiveDraftsBarProps {
  orgSlug: string;
  releases: Array<{
    _id: Id<"releases">;
    publishedAt?: number;
    retroactivelyGenerated?: boolean;
  }>;
}

export function RetroactiveDraftsBar({
  releases,
  orgSlug,
}: RetroactiveDraftsBarProps) {
  const publishDrafts = useMutation(
    api.changelog.retroactive.publishRetroactiveDrafts
  );
  const [isPublishing, setIsPublishing] = useState(false);

  const retroactiveDrafts = releases.filter(
    (r) => r.retroactivelyGenerated === true && r.publishedAt === undefined
  );

  if (retroactiveDrafts.length === 0) {
    return null;
  }

  const handlePublishAll = async () => {
    setIsPublishing(true);
    try {
      await publishDrafts({
        releaseIds: retroactiveDrafts.map((r) => r._id),
        useHistoricalDates: true,
      });
      toast.success(
        `Published ${retroactiveDrafts.length} release${retroactiveDrafts.length === 1 ? "" : "s"}`
      );
    } catch {
      toast.error("Couldn’t publish releases. Try again.");
    }
    setIsPublishing(false);
  };

  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 px-4 py-3 backdrop-blur">
      <span className="font-medium text-sm tabular-nums">
        {retroactiveDrafts.length} draft release
        {retroactiveDrafts.length === 1 ? "" : "s"} ready to publish
      </span>
      <div className="flex items-center gap-2">
        <ButtonLink
          render={
            <Link href={`/dashboard/${orgSlug}/changelog/review-drafts`} />
          }
          size="xs"
          variant="surface"
        >
          <Eye aria-hidden className="size-4" />
          Review first
        </ButtonLink>
        <Button
          disabled={isPublishing}
          onClick={handlePublishAll}
          size="xs"
          tone="primary"
          type="button"
          variant="solid"
        >
          <CloudArrowUp aria-hidden className="size-4" />
          {isPublishing ? "Publishing…" : "Publish all"}
        </Button>
      </div>
    </div>
  );
}
