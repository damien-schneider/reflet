"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
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
      toast.success("Release published");
    } catch {
      toast.error("Failed to publish release");
    }
  };

  const handleDiscard = async () => {
    try {
      await discardDrafts({ releaseIds: [release._id] });
      toast.success("Draft discarded");
    } catch {
      toast.error("Failed to discard draft");
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
        aria-label={selected ? "Deselect release" : "Select release"}
        checked={selected}
        className="mt-1"
        onCheckedChange={(checked) => onSelect(release._id, checked)}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {release.version && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs tabular-nums">
              {release.version}
            </span>
          )}
          <span className="truncate font-medium">{release.title}</span>
        </div>

        {release.description && (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
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
            <PencilSimple className="h-4 w-4" />
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
            <CloudArrowUp className="h-4 w-4" />
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
            <Trash className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>Discard release</TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog onOpenChange={setIsDiscardOpen} open={isDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft</AlertDialogTitle>
            <AlertDialogDescription>
              This draft release will be deleted permanently. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={handleDiscard}
              tone="danger"
              variant="surface"
            >
              Discard
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
