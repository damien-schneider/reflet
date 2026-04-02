"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/typography";
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
      toast.success("Competitor removed");
    } catch {
      toast.error("Failed to remove competitor");
    }
  };

  if (competitors === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-48 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Text variant="bodyLarge">No competitors tracked yet</Text>
        <Text className="mt-2 max-w-md" variant="bodySmall">
          Add your first competitor to start getting AI-powered competitive
          intelligence, SWOT analysis, and feature gap detection.
        </Text>
        <AddCompetitorDialog organizationId={organizationId} />
      </div>
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
