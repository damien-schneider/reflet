"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const AGENT_COLORS: Record<string, string> = {
  pm: "bg-blue-500/10 text-blue-500",
  cto: "bg-purple-500/10 text-purple-500",
  dev: "bg-green-500/10 text-green-500",
  security: "bg-red-500/10 text-red-500",
  architect: "bg-amber-500/10 text-amber-500",
  growth: "bg-pink-500/10 text-pink-500",
  support: "bg-teal-500/10 text-teal-500",
  analytics: "bg-indigo-500/10 text-indigo-500",
  docs: "bg-emerald-500/10 text-emerald-500",
  qa: "bg-violet-500/10 text-violet-500",
  ops: "bg-orange-500/10 text-orange-500",
  sales: "bg-rose-500/10 text-rose-500",
  orchestrator: "bg-cyan-500/10 text-cyan-500",
  system: "bg-muted-foreground/10 text-muted-foreground",
};

const LEVEL_ICONS = {
  info: IconInfoCircle,
  action: IconPlayerPlay,
  success: IconCheck,
  warning: IconAlertTriangle,
  error: IconX,
} as const;

export function ActivityFeed({
  limit = 30,
  organizationId,
}: {
  limit?: number;
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.listActivity, {
    organizationId,
    limit,
  });

  if (activity === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-12 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        No activity yet. Enable autopilot to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activity.map((entry: (typeof activity)[number]) => {
        const LevelIcon =
          LEVEL_ICONS[entry.level as keyof typeof LEVEL_ICONS] ??
          IconInfoCircle;
        const agentColor = AGENT_COLORS[entry.agent] ?? AGENT_COLORS.system;

        return (
          <div className="relative rounded-lg bg-card p-3" key={entry._id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "mt-0.5 inline-flex rounded-full p-1",
                  agentColor
                )}
              >
                <LevelIcon className="size-3.5" />
              </div>
              <Badge
                className={cn("absolute top-2 right-2 text-xs", agentColor)}
                variant="outline"
              >
                {entry.agent}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 font-medium text-muted-foreground text-sm">
              {entry.message}
            </p>
            {entry.details && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                {entry.details}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
