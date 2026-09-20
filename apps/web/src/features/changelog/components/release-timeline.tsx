"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
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
  releases: T[];
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
  if (!releases || releases.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No releases</EmptyTitle>
          {isAdmin ? null : (
            <EmptyDescription>Check back soon.</EmptyDescription>
          )}
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
