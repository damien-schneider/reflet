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
    <div className="space-y-0.5 overflow-hidden rounded-2xl">
      {activity.map((entry: (typeof activity)[number]) => {
        const LevelIcon = LEVEL_ICONS[entry.level];
        const agentColor = ACTIVITY_AGENT_BADGE_STYLES[entry.agent];

        return (
          <div
            className="relative rounded-md bg-card px-3 py-3"
            key={entry._id}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center justify-center rounded-full p-1",
                  agentColor
                )}
              >
                <LevelIcon className="size-3" />
              </div>

              <span className="absolute right-1 bottom-px inline-flex gap-1 text-[11px] text-muted-foreground/50">
                {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
              </span>
              <Badge
                className={cn(
                  "absolute top-1 right-1 inline-flex gap-1 rounded-full border-none text-[10px]",
                  agentColor
                )}
                variant="outline"
              >
                {getActivityAgentLabel(entry.agent)}
              </Badge>

              <p className="truncate font-medium text-foreground/80 text-xs leading-relaxed">
                {entry.message}
              </p>
            </div>
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
