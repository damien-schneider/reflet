"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function DashboardStats({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const stats = useQuery(api.autopilot.queries.getDashboardStats, {
    organizationId,
  });

  if (stats === undefined) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton
            className="h-20 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const costCapLabel = stats.dailyCostCapUsd
    ? `/${formatCost(stats.dailyCostCapUsd)}`
    : "";
  const costRatio = stats.dailyCostCapUsd
    ? stats.costUsedTodayUsd / stats.dailyCostCapUsd
    : 0;
  const taskRatio =
    stats.maxTasksPerDay > 0 ? stats.tasksUsedToday / stats.maxTasksPerDay : 0;

  const cards = [
    {
      label: "Tasks Today",
      value: `${stats.tasksUsedToday}/${stats.maxTasksPerDay}`,
      warn: taskRatio > 0.8,
    },
    {
      label: "Cost Today",
      value: `${formatCost(stats.costUsedTodayUsd)}${costCapLabel}`,
      warn: costRatio > 0.8,
    },
    {
      label: "Pending",
      value: String(stats.pendingTaskCount),
      warn: false,
    },
    {
      label: "In Progress",
      value: String(stats.inProgressTaskCount),
      warn: false,
    },
    {
      label: "Completed",
      value: String(stats.completedTaskCount),
      warn: false,
    },
    {
      label: "Inbox",
      value: String(stats.pendingInboxCount),
      warn: stats.pendingInboxCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          className={cn(
            "rounded-lg border p-4",
            card.warn && "border-amber-500/30 bg-amber-500/5"
          )}
          key={card.label}
        >
          <p className="text-muted-foreground text-sm">{card.label}</p>
          <p className="mt-1 font-semibold text-2xl">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
