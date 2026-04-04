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

  const totalPending = stats.pendingTaskCount;
  const totalCap = stats.maxPendingTasksTotal ?? 5;
  const totalCapRatio = totalCap > 0 ? totalPending / totalCap : 0;

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
      value: `${totalPending}/${totalCap}`,
      warn: totalCapRatio > 0.8,
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

  const pendingTasksByAgent = stats.pendingTasksByAgent ?? {};
  const agentEntries = Object.entries(pendingTasksByAgent);
  const perAgentCap = stats.maxPendingTasksPerAgent ?? 2;

  return (
    <div className="space-y-4">
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

      {agentEntries.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="mb-3 font-medium text-sm">Pending Tasks by Agent</p>
          <div className="space-y-2">
            {agentEntries.map(([agent, count]) => {
              const ratio = perAgentCap > 0 ? count / perAgentCap : 0;
              const atCap = ratio >= 1;
              const nearCap = ratio > 0.5 && !atCap;

              return (
                <div className="flex items-center gap-3" key={agent}>
                  <span className="w-24 truncate text-muted-foreground text-sm capitalize">
                    {agent}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all",
                        atCap && "bg-red-500",
                        nearCap && "bg-amber-500",
                        !(atCap || nearCap) && "bg-emerald-500"
                      )}
                      style={{
                        width: `${String(Math.min(ratio * 100, 100))}%`,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "w-12 text-right font-mono text-xs",
                      atCap && "text-red-500",
                      nearCap && "text-amber-500"
                    )}
                  >
                    {count}/{perAgentCap}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
