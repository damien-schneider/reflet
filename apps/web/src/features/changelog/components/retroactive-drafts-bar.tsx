"use client";

import { CloudArrowUp, Eye } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

  const retroactiveDrafts = releases.filter(
    (r) => r.retroactivelyGenerated === true && r.publishedAt === undefined
  );

  if (retroactiveDrafts.length === 0) {
    return null;
  }

  const handlePublishAll = async () => {
    try {
      await publishDrafts({
        releaseIds: retroactiveDrafts.map((r) => r._id),
        useHistoricalDates: true,
      });
      toast.success(
        `Published ${retroactiveDrafts.length} release${retroactiveDrafts.length === 1 ? "" : "s"}`
      );
    } catch {
      toast.error("Failed to publish releases");
    }
  };

  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 px-4 py-3 backdrop-blur">
      <span className="font-medium text-sm">
        {retroactiveDrafts.length} draft release
        {retroactiveDrafts.length === 1 ? "" : "s"} ready to publish
      </span>
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/${orgSlug}/changelog/review-drafts`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" />
            Review First
          </Button>
        </Link>
        <Button onClick={handlePublishAll} size="sm" type="button">
          <CloudArrowUp className="h-4 w-4" />
          Publish All
        </Button>
      </div>
    </div>
  );
}
