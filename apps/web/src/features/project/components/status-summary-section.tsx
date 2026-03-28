"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABELS = {
  operational: "All Operational",
  degraded: "Degraded",
  major_outage: "Major Outage",
  no_monitors: "No Monitors",
} as const;

type StatusKey = keyof typeof STATUS_LABELS;

const BADGE_VARIANTS: Record<
  StatusKey,
  "secondary" | "outline" | "destructive"
> = {
  operational: "secondary",
  degraded: "destructive",
  major_outage: "destructive",
  no_monitors: "outline",
} as const;

interface StatusSummarySectionProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function StatusSummarySection({
  organizationId,
  orgSlug,
}: StatusSummarySectionProps) {
  const aggregateStatus = useQuery(api.status.monitors.getAggregateStatus, {
    organizationId,
  });

  const status = aggregateStatus?.status ?? "no_monitors";
  const monitorCount = aggregateStatus?.monitorCount ?? 0;

  const label = monitorCount > 0 ? STATUS_LABELS[status] : "No monitors";
  const badgeVariant = BADGE_VARIANTS[status];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Status</span>
            <Badge variant={badgeVariant}>{label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {monitorCount > 0
              ? `${monitorCount} monitor${monitorCount === 1 ? "" : "s"} configured`
              : "Add monitors to track your services"}
          </p>
        </div>
        <Link href={`/dashboard/${orgSlug}/status`}>
          <Button size="sm" variant="outline">
            <ArrowSquareOut className="mr-2 h-4 w-4" />
            View Status Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
