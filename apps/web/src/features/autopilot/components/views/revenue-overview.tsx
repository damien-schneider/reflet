"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return USD_FORMATTER.format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function RevenueOverview({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const history = useQuery(api.autopilot.queries.revenue.getRevenueHistory, {
    organizationId,
    limit: 12,
  });
  const latest = useQuery(api.autopilot.queries.revenue.getLatestRevenue, {
    organizationId,
  });

  if (history === undefined || latest === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!latest) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No revenue data yet
      </p>
    );
  }

  const prevSnapshot = history.length > 1 ? history[1] : undefined;
  const mrrDelta = prevSnapshot ? latest.mrr - prevSnapshot.mrr : 0;
  const mrrDeltaPercent = prevSnapshot?.mrr
    ? (mrrDelta / prevSnapshot.mrr) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">MRR</p>
          <p className="mt-0.5 font-semibold text-lg">
            {formatCurrency(latest.mrr)}
          </p>
          {mrrDelta !== 0 && (
            <p
              className={cn(
                "text-xs",
                mrrDelta > 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {mrrDelta > 0 ? "+" : ""}
              {formatCurrency(mrrDelta)} ({formatPercent(mrrDeltaPercent)})
            </p>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">ARR</p>
          <p className="mt-0.5 font-semibold text-lg">
            {formatCurrency(latest.arr)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Active Subs</p>
          <p className="mt-0.5 font-semibold text-lg">
            {latest.activeSubscriptions}
          </p>
        </div>
        {latest.churnRate !== undefined && (
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Churn Rate</p>
            <p className="mt-0.5 font-semibold text-lg">
              {formatPercent(latest.churnRate)}
            </p>
          </div>
        )}
      </div>

      {/* History (simple list) */}
      {history.length > 1 && (
        <div className="rounded-lg border">
          <div className="border-b px-3 py-2">
            <p className="font-medium text-muted-foreground text-xs">
              Revenue History
            </p>
          </div>
          <div className="divide-y">
            {history.map((snapshot) => (
              <div
                className="flex items-center justify-between px-3 py-2"
                key={snapshot._id}
              >
                <span className="text-sm">{snapshot.snapshotDate}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span>{formatCurrency(snapshot.mrr)} MRR</span>
                  <span className="text-muted-foreground">
                    {snapshot.activeSubscriptions} subs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
