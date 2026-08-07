"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type * as React from "react";
import { H3, Muted } from "@/components/ui/typography";
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
      <div className="py-12 text-center">
        <H3 variant="card">No releases</H3>
        {isAdmin ? null : <Muted className="mt-2">Check back soon.</Muted>}
        {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
      </div>
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
