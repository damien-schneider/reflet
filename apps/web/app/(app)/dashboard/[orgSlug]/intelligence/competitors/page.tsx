"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, Text } from "@/components/ui/typography";
import { AddCompetitorDialog } from "@/features/intelligence/components/add-competitor-dialog";
import { CompetitorCard } from "@/features/intelligence/components/competitor-card";

function CompetitorsList({
  competitors,
  orgSlug,
  orgId,
  onRemove,
}: {
  competitors:
    | {
        _id: Id<"competitors">;
        name: string;
        websiteUrl: string;
        description?: string;
        status: string;
        aiProfile?: string;
        lastScrapedAt?: number;
        featureList?: string[];
      }[]
    | undefined;
  orgSlug: string;
  orgId: Id<"organizations">;
  onRemove: (id: Id<"competitors">) => void;
}) {
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
        <AddCompetitorDialog organizationId={orgId} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitors.map((competitor) => (
        <CompetitorCard
          competitor={competitor}
          key={competitor._id}
          onRemove={() => onRemove(competitor._id)}
          orgSlug={orgSlug}
        />
      ))}
    </div>
  );
}

export default function CompetitorsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const competitors = useQuery(
    api.intelligence.competitors.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const removeCompetitor = useMutation(api.intelligence.competitors.remove);

  const handleRemove = async (competitorId: Id<"competitors">) => {
    try {
      await removeCompetitor({ id: competitorId });
      toast.success("Competitor removed");
    } catch {
      toast.error("Failed to remove competitor");
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Competitors</H1>
          <Text variant="bodySmall">
            Track competitors and get AI-generated profiles, battlecards, and
            feature comparisons
          </Text>
        </div>
        <AddCompetitorDialog organizationId={org._id} />
      </div>

      <CompetitorsList
        competitors={competitors}
        onRemove={handleRemove}
        orgId={org._id}
        orgSlug={orgSlug}
      />
    </div>
  );
}
