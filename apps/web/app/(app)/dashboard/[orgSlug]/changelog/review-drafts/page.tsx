"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { RetroactiveDraftItem } from "@/features/changelog/components/retroactive-draft-item";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";

const SORT_ORDERS = ["newest", "oldest"] as const;

type SortOrder = (typeof SORT_ORDERS)[number];

const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

const SKELETON_ROWS = ["first", "second", "third"] as const;

interface DraftRelease {
  _id: Id<"releases">;
  commitCount: number;
  createdAt: number;
  description?: string;
  publishedAt?: number;
  retroactivelyGenerated?: boolean;
  title: string;
  version?: string;
}

function DraftsSkeleton() {
  return (
    <div className="space-y-4">
      {SKELETON_ROWS.map((row) => (
        <div className="flex items-start gap-4 rounded-lg border p-4" key={row}>
          <Skeleton className="mt-1 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-6 w-64 max-w-full" />
            <Skeleton className="mt-1 h-5 w-full" />
            <Skeleton className="mt-2 h-4 w-44" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Skeleton className="size-7" />
            <Skeleton className="size-7" />
            <Skeleton className="size-7" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DraftsList({
  drafts,
  orgSlug,
  selectedIds,
  onSelect,
}: {
  drafts: DraftRelease[];
  orgSlug: string;
  selectedIds: Set<Id<"releases">>;
  onSelect: (id: Id<"releases">, selected: boolean) => void;
}) {
  if (drafts.length === 0) {
    return (
      <Empty className="min-h-[40vh] rounded-lg border border-dashed">
        <EmptyHeader>
          <EmptyTitle>No drafts to review</EmptyTitle>
          <EmptyDescription>
            Generated releases show up here once the import finishes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink
            render={<Link href={`/dashboard/${orgSlug}/changelog`} />}
            variant="surface"
          >
            Back to changelog
          </ButtonLink>
        </EmptyContent>
      </Empty>
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

function sortDrafts(
  releases: DraftRelease[] | undefined,
  sortOrder: SortOrder
): DraftRelease[] {
  if (!releases) {
    return [];
  }

  return releases
    .filter(
      (r) => r.retroactivelyGenerated === true && r.publishedAt === undefined
    )
    .sort((a, b) =>
      sortOrder === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
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
    api.changelog.queries.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const publishDrafts = useMutation(
    api.changelog.retroactive.publishRetroactiveDrafts
  );
  const discardDrafts = useMutation(
    api.changelog.retroactive.discardRetroactiveDrafts
  );

  const [selectedIds, setSelectedIds] = useState<Set<Id<"releases">>>(
    new Set()
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "publish" | "discard" | null
  >(null);

  const drafts = sortDrafts(releases, sortOrder);
  const allSelected = drafts.length > 0 && selectedIds.size === drafts.length;

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(drafts.map((d) => d._id)));
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

    const count = selectedIds.size;
    setPendingAction("publish");
    try {
      await publishDrafts({
        releaseIds: Array.from(selectedIds),
        useHistoricalDates: true,
      });
      toast.success(`Published ${count} release${count === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Couldn’t publish releases. Try again.");
    }
    setPendingAction(null);
  };

  const handleConfirmDiscard = async () => {
    setPendingAction("discard");
    try {
      await discardDrafts({ releaseIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
    } catch {
      toast.error("Couldn’t discard drafts. Try again.");
    }
    setPendingAction(null);
  };

  if (org === null) {
    return <OrgNotFound />;
  }

  if (org === undefined) {
    return (
      <PageLayout scroll="page" width="content">
        <PageHeader className="flex flex-col items-start">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-5 w-52" />
        </PageHeader>
        <PageBody>
          <DraftsSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader className="flex flex-col items-start">
        <Link
          className="inline-flex min-h-10 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}/changelog`}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to changelog
        </Link>
        <PageTitle>Review generated releases</PageTitle>
        <PageDescription>
          {releases === undefined ? (
            "Loading drafts…"
          ) : (
            <>
              <span className="tabular-nums">{drafts.length}</span> draft
              {drafts.length === 1 ? "" : "s"} ready for review
            </>
          )}
        </PageDescription>
      </PageHeader>
      <PageBody>
        {drafts.length > 0 && (
          <div className="sticky top-(--sticky-header-height) z-20 mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3">
            <Button onClick={handleToggleSelectAll} size="xs" variant="surface">
              {allSelected ? "Deselect all" : "Select all"}
            </Button>

            <Button
              disabled={selectedIds.size === 0 || pendingAction !== null}
              onClick={handleBulkPublish}
              size="xs"
              tone="primary"
              variant="solid"
            >
              {pendingAction === "publish" ? "Publishing…" : "Publish selected"}{" "}
              <span className="tabular-nums">({selectedIds.size})</span>
            </Button>

            <Button
              disabled={selectedIds.size === 0 || pendingAction !== null}
              onClick={() => setDiscardDialogOpen(true)}
              size="xs"
              tone="danger"
              variant="surface"
            >
              {pendingAction === "discard" ? "Discarding…" : "Discard selected"}
            </Button>

            <div className="ml-auto">
              <Select
                onValueChange={(value) =>
                  setSortOrder(
                    SORT_ORDERS.find((order) => order === value) ?? "newest"
                  )
                }
                value={sortOrder}
              >
                <SelectTrigger
                  aria-label="Sort drafts"
                  className="w-40"
                  size="xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_ORDERS.map((order) => (
                    <SelectItem key={order} value={order}>
                      {SORT_ORDER_LABELS[order]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {releases === undefined ? (
          <DraftsSkeleton />
        ) : (
          <DraftsList
            drafts={drafts}
            onSelect={handleSelect}
            orgSlug={orgSlug}
            selectedIds={selectedIds}
          />
        )}

        <DestructiveConfirmDialog
          confirmLabel="Discard"
          description="Discarded drafts are removed permanently. You can’t undo this."
          onConfirm={handleConfirmDiscard}
          onOpenChange={setDiscardDialogOpen}
          open={discardDialogOpen}
          title={`Discard ${selectedIds.size} draft${selectedIds.size === 1 ? "" : "s"}?`}
        />
      </PageBody>
    </PageLayout>
  );
}
