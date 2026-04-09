"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconExternalLink, IconSearch, IconTarget } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitorSheet } from "@/features/autopilot/components/competitor-sheet";
import { cn } from "@/lib/utils";

const STALENESS_7D = 7 * 24 * 60 * 60 * 1000;
const STALENESS_30D = 30 * 24 * 60 * 60 * 1000;

function getStaleness(lastResearchedAt?: number) {
  if (!lastResearchedAt) {
    return null;
  }
  const age = Date.now() - lastResearchedAt;
  if (age > STALENESS_30D) {
    return "stale";
  }
  if (age > STALENESS_7D) {
    return "aging";
  }
  return "fresh";
}

const STALENESS_DOT: Record<string, string> = {
  fresh: "bg-green-500",
  aging: "bg-yellow-500",
  stale: "bg-red-500",
};

const STALENESS_TITLE: Record<string, string> = {
  stale: "Outdated (>30d)",
  aging: "Aging (>7d)",
  fresh: "Recently researched",
};

export function CompetitorsTab({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const competitors = useQuery(
    api.autopilot.queries.competitors.listCompetitors,
    { organizationId }
  );

  if (competitors === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              className="h-12 w-full border-border border-b last:border-b-0"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const filtered = competitors.filter((comp) => {
    if (!searchQuery) {
      return true;
    }
    const q = searchQuery.toLowerCase();
    return (
      comp.name.toLowerCase().includes(q) ||
      comp.description?.toLowerCase().includes(q) ||
      comp.url?.toLowerCase().includes(q)
    );
  });

  const selectedCompetitor =
    competitors.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      {competitors.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitors..."
              value={searchQuery}
            />
          </div>
          <span className="ml-auto text-muted-foreground text-sm">
            {filtered.length} competitor{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {competitors.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconTarget className="mx-auto mb-2 size-8" />
            <p>
              No competitors tracked yet. The Growth Agent will discover them
              during market research.
            </p>
          </div>
        </div>
      )}
      {competitors.length > 0 && filtered.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
          No competitors match your search.
        </div>
      )}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((comp) => (
            <CompetitorRow
              competitor={comp}
              key={comp._id}
              onClick={() => setSelectedId(comp._id)}
              selected={selectedId === comp._id}
            />
          ))}
        </div>
      )}

      <CompetitorSheet
        competitor={selectedCompetitor}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        open={selectedId !== null}
      />
    </div>
  );
}

function getScoreClassName(score: number | undefined): string | null {
  if (score === undefined) {
    return null;
  }
  if (score >= 7) {
    return "text-red-500";
  }
  if (score >= 4) {
    return "text-yellow-500";
  }
  return "text-muted-foreground";
}

function CompetitorRow({
  competitor,
  onClick,
  selected,
}: {
  competitor: Doc<"autopilotCompetitors">;
  onClick: () => void;
  selected: boolean;
}) {
  const staleness = getStaleness(competitor.lastResearchedAt);
  const scoreClass = getScoreClassName(competitor.competitivityScore);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 border-border border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50",
        selected && "bg-muted"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {competitor.name}
          </span>
          {staleness && (
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                STALENESS_DOT[staleness]
              )}
              title={STALENESS_TITLE[staleness]}
            />
          )}
        </div>
        {competitor.description && (
          <p className="mt-0.5 truncate text-muted-foreground text-xs">
            {competitor.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {competitor.featureGaps && competitor.featureGaps.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {competitor.featureGaps.length} gaps
          </span>
        )}
        {competitor.competitivityScore !== undefined && (
          <span className={cn("font-mono text-xs", scoreClass)}>
            {competitor.competitivityScore}/10
          </span>
        )}
        {competitor.pricingTier && (
          <Badge variant="outline">{competitor.pricingTier}</Badge>
        )}
        {competitor.url && (
          <IconExternalLink className="size-3.5 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}
