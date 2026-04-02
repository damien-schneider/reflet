"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";

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
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            className="h-20 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Tasks Today",
      value: `${stats.tasksUsedToday}/${stats.maxTasksPerDay}`,
    },
    {
      label: "Pending",
      value: String(stats.pendingTaskCount),
    },
    {
      label: "In Progress",
      value: String(stats.inProgressTaskCount),
    },
    {
      label: "Inbox",
      value: String(stats.pendingInboxCount),
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div className="rounded-lg border p-4" key={card.label}>
          <p className="text-muted-foreground text-sm">{card.label}</p>
          <p className="mt-1 font-semibold text-2xl">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
