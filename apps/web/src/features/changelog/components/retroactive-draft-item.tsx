"use client";

import { CloudArrowUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
    // biome-ignore lint/suspicious/noAlert: Simple confirmation for destructive action
    const confirmed = window.confirm(
      "Are you sure you want to discard this draft? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

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
      <button
        aria-label={selected ? "Deselect release" : "Select release"}
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        onClick={() => onSelect(release._id, !selected)}
        type="button"
      >
        {selected && (
          <svg
            aria-hidden="true"
            className="h-3 w-3"
            fill="none"
            role="img"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <title>Selected</title>
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {release.version && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
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
          <span>
            {release.commitCount} commit{release.commitCount === 1 ? "" : "s"}
          </span>
          <span>{format(new Date(release.createdAt), "MMM d, yyyy")}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}>
          <Button aria-label="Edit release" size="sm" variant="ghost">
            <PencilSimple className="h-4 w-4" />
          </Button>
        </Link>

        <Button
          aria-label="Publish release"
          onClick={handlePublish}
          size="sm"
          variant="ghost"
        >
          <CloudArrowUp className="h-4 w-4" />
        </Button>

        <Button
          aria-label="Discard release"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDiscard}
          size="sm"
          variant="ghost"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
