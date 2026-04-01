"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, Muted, Text } from "@/components/ui/typography";
import { RetroactiveDraftItem } from "@/features/changelog/components/retroactive-draft-item";

function DraftsList({
  drafts,
  orgSlug,
  selectedIds,
  onSelect,
}: {
  drafts: Array<{
    _id: Id<"releases">;
    title: string;
    description?: string;
    version?: string;
    createdAt: number;
    publishedAt?: number;
    commitCount: number;
    retroactivelyGenerated?: boolean;
  }>;
  orgSlug: string;
  selectedIds: Set<string>;
  onSelect: (id: Id<"releases">, selected: boolean) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Text variant="bodyLarge">No draft releases to review</Text>
        <Muted className="mt-2">
          Generated changelogs will appear here once the retroactive job
          completes.
        </Muted>
        <Link href={`/dashboard/${orgSlug}/changelog`}>
          <Button className="mt-6" variant="outline">
            Back to Changelog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((release) => (
        <RetroactiveDraftItem
          key={release._id}
          onSelect={onSelect}
          orgSlug={orgSlug}
          release={release}
          selected={selectedIds.has(release._id)}
        />
      ))}
    </div>
  );
}

export default function ReviewDraftsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.releases.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const publishDrafts = useMutation(
    api.changelog.retroactive.publishRetroactiveDrafts
  );
  const discardDrafts = useMutation(
    api.changelog.retroactive.discardRetroactiveDrafts
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const drafts = (() => {
    if (!releases) {
      return [];
    }

    const filtered = releases.filter(
      (r) => r.retroactivelyGenerated === true && r.publishedAt === undefined
    );

    return filtered.sort((a, b) =>
      sortOrder === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
    );
  })();

  const allSelected = drafts.length > 0 && selectedIds.size === drafts.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(drafts.map((d) => d._id)));
    }
  };

  const handleSelect = (id: Id<"releases">, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      await publishDrafts({
        releaseIds: Array.from(selectedIds) as Id<"releases">[],
        useHistoricalDates: true,
      });
      toast.success(
        `Published ${selectedIds.size} release${selectedIds.size === 1 ? "" : "s"}`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to publish releases");
    }
  };

  const handleBulkDiscard = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    // biome-ignore lint/suspicious/noAlert: Simple confirmation for destructive bulk action
    const confirmed = window.confirm(
      `Are you sure you want to discard ${selectedIds.size} draft release${selectedIds.size === 1 ? "" : "s"}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await discardDrafts({
        releaseIds: Array.from(selectedIds) as Id<"releases">[],
      });
      toast.success(
        `Discarded ${selectedIds.size} draft${selectedIds.size === 1 ? "" : "s"}`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to discard releases");
    }
  };

  if (!org) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <Link
        className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href={`/dashboard/${orgSlug}/changelog`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Changelog
      </Link>

      <div className="mb-8">
        <H1>Review Generated Changelogs</H1>
        <Text variant="bodySmall">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"} ready for review
        </Text>
      </div>

      {drafts.length > 0 && (
        <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3">
          <Button onClick={handleToggleSelectAll} size="sm" variant="outline">
            {allSelected ? "Deselect All" : "Select All"}
          </Button>

          <Button
            disabled={selectedIds.size === 0}
            onClick={handleBulkPublish}
            size="sm"
          >
            Publish Selected ({selectedIds.size})
          </Button>

          <Button
            className="text-destructive hover:bg-destructive/10"
            disabled={selectedIds.size === 0}
            onClick={handleBulkDiscard}
            size="sm"
            variant="outline"
          >
            Discard Selected
          </Button>

          <div className="ml-auto">
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest")
              }
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      )}

      {releases === undefined ? (
        <div className="space-y-4">
          {["a", "b", "c"].map((id) => (
            <Skeleton className="h-32 w-full" key={id} />
          ))}
        </div>
      ) : (
        <DraftsList
          drafts={drafts}
          onSelect={handleSelect}
          orgSlug={orgSlug}
          selectedIds={selectedIds}
        />
      )}
    </div>
  );
}
