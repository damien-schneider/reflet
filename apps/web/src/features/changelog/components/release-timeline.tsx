"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type * as React from "react";
import type { ReleaseData } from "./release-item";
import { ReleaseItem } from "./release-item";

interface ReleaseTimelineProps<T extends ReleaseData> {
  emptyAction?: React.ReactNode;
  isAdmin?: boolean;
  onDelete?: (release: T) => void;
  onPublish?: (id: Id<"releases">) => void;
  onUnpublish?: (id: Id<"releases">) => void;
  orgSlug: string;
  releases: T[] | undefined;
}

const SKELETON_ROWS = ["first", "second"] as const;

export function ReleaseTimelineSkeleton() {
  return (
    <div aria-busy="true" className="divide-y divide-border">
      <span className="sr-only" role="status">
        Loading releases…
      </span>
      {SKELETON_ROWS.map((row) => (
        <div className="space-y-4 pt-3 pb-12" key={row}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mt-6 h-8 w-2/3" />
          <div className="max-w-prose space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReleaseTimeline<T extends ReleaseData>({
  releases,
  orgSlug,
  isAdmin = false,
  onPublish,
  onUnpublish,
  onDelete,
  emptyAction,
}: ReleaseTimelineProps<T>) {
  if (releases === undefined) {
    return <ReleaseTimelineSkeleton />;
  }

  if (releases.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No releases yet</EmptyTitle>
          <EmptyDescription>
            {isAdmin
              ? "Write your first release to tell users what shipped."
              : "Subscribe to hear about the first release."}
          </EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <div className="divide-y divide-border">
      {releases.map((release) => (
        <ReleaseItem
          isAdmin={isAdmin}
          key={release._id}
          onDelete={() => onDelete?.(release)}
          onPublish={() => onPublish?.(release._id)}
          onUnpublish={() => onUnpublish?.(release._id)}
          orgSlug={orgSlug}
          release={release}
        />
      ))}
    </div>
  );
}
