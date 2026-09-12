"use client";

import { Badge, type BadgeColor } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

const STATUS_LABELS = {
  degraded: "Degraded",
  major_outage: "Major Outage",
  no_monitors: "No Monitors",
  operational: "All Operational",
} as const;

type StatusKey = keyof typeof STATUS_LABELS;

const BADGE_COLORS: Record<StatusKey, BadgeColor> = {
  degraded: "orange",
  major_outage: "red",
  no_monitors: "neutral",
  operational: "green",
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
  const badgeColor = BADGE_COLORS[status];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Status</span>
            <Badge color={badgeColor}>{label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {monitorCount > 0
              ? `${monitorCount} monitor${monitorCount === 1 ? "" : "s"} configured`
              : "Add monitors to track your services"}
          </p>
        </div>
        <Link href={`/dashboard/${orgSlug}/status`}>
          <Button size="xs" variant="surface">
            <ArrowSquareOut className="mr-2 h-4 w-4" />
            View Status Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
