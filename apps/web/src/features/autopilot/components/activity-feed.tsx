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
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_AGENT_BADGE_STYLES,
  type ActivityLevel,
  getActivityAgentLabel,
} from "./activity/presentation";

const LEVEL_ICONS = {
  info: IconInfoCircle,
  action: IconPlayerPlay,
  success: IconCheck,
  warning: IconAlertTriangle,
  error: IconX,
} satisfies Record<ActivityLevel, ComponentType<{ className?: string }>>;

export function ActivityFeed({
  limit = 30,
  organizationId,
}: {
  limit?: number;
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listActivity, {
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
    <div className="space-y-1.5">
      {activity.map((entry: (typeof activity)[number]) => {
        const LevelIcon = LEVEL_ICONS[entry.level];
        const agentColor = ACTIVITY_AGENT_BADGE_STYLES[entry.agent];

        return (
          <div
            className="relative rounded-xl border bg-card px-4 py-3"
            key={entry._id}
          >
            <div className="flex items-center gap-2">
              <div className={cn("inline-flex rounded-full p-1", agentColor)}>
                <LevelIcon className="size-3" />
              </div>
              <Badge
                className={cn(
                  "absolute top-2.5 right-3 text-[10px]",
                  agentColor
                )}
                variant="outline"
              >
                {getActivityAgentLabel(entry.agent)}
              </Badge>
              <span className="text-[11px] text-muted-foreground/50">
                {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-foreground/80 leading-relaxed">
              {entry.message}
            </p>
            {entry.details && (
              <p className="mt-0.5 text-muted-foreground/60 text-xs">
                {entry.details}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
