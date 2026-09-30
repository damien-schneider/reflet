"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AddCompetitorDialog } from "@/features/intelligence/components/add-competitor-dialog";
import { CompetitorCard } from "@/features/intelligence/components/competitor-card";

export function CompetitorsTab({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const competitors = useQuery(api.intelligence.competitors.list, {
    organizationId,
  });

  const removeCompetitor = useMutation(api.intelligence.competitors.remove);

  const handleRemove = async (competitorId: Id<"competitors">) => {
    try {
      await removeCompetitor({ id: competitorId });
    } catch {
      toast.error("Couldn’t remove the competitor. Try again.");
    }
  };

  if (competitors === undefined) {
    return (
      <div
        aria-label="Loading competitors"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
      >
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-48 w-full rounded-lg" key={id} />
        ))}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyTitle>No competitors tracked yet</EmptyTitle>
          <EmptyDescription>
            Add a competitor to get SWOT analysis and feature gap detection.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AddCompetitorDialog organizationId={organizationId} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddCompetitorDialog organizationId={organizationId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitors.map((competitor) => (
          <CompetitorCard
            competitor={competitor}
            key={competitor._id}
            onRemove={() => handleRemove(competitor._id)}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </div>
  );
}
