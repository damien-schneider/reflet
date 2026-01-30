"use client";

import { Megaphone } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import type * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { H3, Muted } from "@/components/ui/typography";
import type { ReleaseData } from "./release-item";
import { ReleaseItem } from "./release-item";

interface ReleaseTimelineProps<T extends ReleaseData> {
  releases: T[];
  orgSlug: string;
  isAdmin?: boolean;
  onPublish?: (id: Id<"releases">) => void;
  onUnpublish?: (id: Id<"releases">) => void;
  onDelete?: (release: T) => void;
  emptyAction?: React.ReactNode;
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
      <Card>
        <CardContent className="py-12 text-center">
          <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <H3 className="mb-2" variant="card">
            No releases yet
          </H3>
          <Muted className="mb-4">
            {isAdmin
              ? "Create your first release to share product updates."
              : "Check back soon for product updates."}
          </Muted>
          {emptyAction}
        </CardContent>
      </Card>
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
