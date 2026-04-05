"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { IconExternalLink, IconSearch, IconTarget } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
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

export default function CompetitorsPage() {
  const { organizationId } = useAutopilotContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const competitors = useQuery(
    api.autopilot.queries.competitors.listCompetitors,
    { organizationId }
  );

  if (competitors === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <H2 variant="card">Competitors</H2>
          <Skeleton className="h-9 w-36" />
        </div>
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
      <div className="flex items-center justify-between">
        <H2 variant="card">Competitors</H2>
      </div>

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

      <CompetitorList
        competitors={competitors}
        filtered={filtered}
        onSelect={setSelectedId}
        selectedId={selectedId}
      />

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

function CompetitorList({
  competitors,
  filtered,
  onSelect,
  selectedId,
}: {
  competitors: Doc<"autopilotCompetitors">[];
  filtered: Doc<"autopilotCompetitors">[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  if (competitors.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
        <div className="text-center">
          <IconTarget className="mx-auto mb-2 size-8" />
          <p>
            No competitors tracked yet. The Growth Agent will discover them
            during market research.
          </p>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
        No competitors match your search.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {filtered.map((comp) => (
        <CompetitorRow
          competitor={comp}
          key={comp._id}
          onClick={() => onSelect(comp._id)}
          selected={selectedId === comp._id}
        />
      ))}
    </div>
  );
}

const STALENESS_TITLE: Record<string, string> = {
  stale: "Outdated (>30d)",
  aging: "Aging (>7d)",
  fresh: "Recently researched",
};

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
  const featureCount = competitor.features
    ? competitor.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean).length
    : 0;

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 border-border border-b px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/50",
        selected && "bg-muted"
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          staleness ? STALENESS_DOT[staleness] : "bg-muted-foreground"
        )}
        title={staleness ? STALENESS_TITLE[staleness] : "Not yet researched"}
      />

      <span className="min-w-0 flex-1 truncate font-medium">
        {competitor.name}
      </span>

      {competitor.url && (
        <a
          className="hidden shrink-0 items-center gap-1 text-muted-foreground text-xs hover:text-foreground sm:flex"
          href={competitor.url}
          onClick={(e) => e.stopPropagation()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <IconExternalLink className="size-3" />
          {new URL(competitor.url).hostname.replace("www.", "")}
        </a>
      )}

      {competitor.pricingTier && (
        <Badge className="hidden shrink-0 sm:inline-flex" variant="secondary">
          {competitor.pricingTier}
        </Badge>
      )}

      {featureCount > 0 && (
        <span className="hidden shrink-0 text-muted-foreground text-xs md:inline">
          {featureCount} feature{featureCount === 1 ? "" : "s"}
        </span>
      )}

      {competitor.lastResearchedAt && (
        <span className="shrink-0 text-muted-foreground text-xs">
          {formatDistanceToNow(competitor.lastResearchedAt, {
            addSuffix: true,
          })}
        </span>
      )}
    </button>
  );
}
