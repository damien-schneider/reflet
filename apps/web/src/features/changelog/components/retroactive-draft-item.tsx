"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CloudArrowUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { cn } from "@/lib/utils";

interface RetroactiveDraftItemProps {
  onSelect: (id: Id<"releases">, selected: boolean) => void;
  orgSlug: string;
  release: {
    _id: Id<"releases">;
    title: string;
    description?: string;
    version?: string;
    createdAt: number;
    publishedAt?: number;
    commitCount: number;
  };
  selected: boolean;
}

export function RetroactiveDraftItem({
  release,
  orgSlug,
  selected,
  onSelect,
}: RetroactiveDraftItemProps) {
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const publishDrafts = useMutation(
    api.changelog.retroactive.publishRetroactiveDrafts
  );
  const discardDrafts = useMutation(
    api.changelog.retroactive.discardRetroactiveDrafts
  );

  const handlePublish = async () => {
    try {
      await publishDrafts({
        releaseIds: [release._id],
        useHistoricalDates: true,
      });
    } catch {
      toast.error("Couldn’t publish this release. Try again.");
    }
  };

  const handleDiscard = async () => {
    try {
      await discardDrafts({ releaseIds: [release._id] });
    } catch {
      toast.error("Couldn’t discard this draft. Try again.");
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4 transition-colors",
        selected && "border-primary bg-primary/5"
      )}
    >
      <Checkbox
        aria-label={`Select ${release.title}`}
        checked={selected}
        className="mt-1"
        onCheckedChange={(checked) => onSelect(release._id, checked)}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {release.version && (
            <Badge className="font-mono tabular-nums" size="sm">
              {release.version}
            </Badge>
          )}
          <span className="truncate font-medium" title={release.title}>
            {release.title}
          </span>
        </div>

        {release.description && (
          <p className="mt-1 line-clamp-2 text-pretty text-muted-foreground text-sm">
            {release.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
          <span className="tabular-nums">
            {release.commitCount} commit{release.commitCount === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums">
            {format(new Date(release.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            aria-label="Edit release"
            render={
              <ButtonLink
                iconOnly
                render={
                  <Link
                    href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}
                  />
                }
                size="md"
                variant="ghost"
              />
            }
          >
            <PencilSimple aria-hidden className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Edit release</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Publish release"
            render={
              <Button
                iconOnly
                onClick={handlePublish}
                size="md"
                variant="ghost"
              />
            }
          >
            <CloudArrowUp aria-hidden className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Publish release</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            aria-label="Discard release"
            render={
              <Button
                iconOnly
                onClick={() => setIsDiscardOpen(true)}
                size="md"
                tone="danger"
                variant="ghost"
              />
            }
          >
            <Trash aria-hidden className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Discard release</TooltipContent>
        </Tooltip>
      </div>

      <DestructiveConfirmDialog
        confirmLabel="Discard"
        description="This draft release will be deleted permanently. You can’t undo this."
        onConfirm={handleDiscard}
        onOpenChange={setIsDiscardOpen}
        open={isDiscardOpen}
        title="Discard draft"
      />
    </div>
  );
}
