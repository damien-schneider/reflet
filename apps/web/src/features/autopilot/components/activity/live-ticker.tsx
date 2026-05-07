"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  ACTIVITY_AGENT_BADGE_STYLES,
  ACTIVITY_LEVEL_DOT_STYLES,
  type ActivityLogEntry,
  formatTickerEntry,
  getActivityAgentLabel,
} from "./presentation";

function TickerItem({ entry }: { entry: ActivityLogEntry }) {
  const entryLabel = formatTickerEntry(entry);

  return (
    <li
      aria-label={entryLabel}
      className="inline-flex shrink-0 items-center gap-2 border-border/40 border-r px-4"
      title={entryLabel}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          ACTIVITY_LEVEL_DOT_STYLES[entry.level]
        )}
      />
      <Badge
        className={cn(
          "h-6 shrink-0 rounded-full px-2 font-semibold text-[10px] uppercase tracking-[0.18em]",
          ACTIVITY_AGENT_BADGE_STYLES[entry.agent]
        )}
        variant="outline"
      >
        {getActivityAgentLabel(entry.agent)}
      </Badge>
      {entry.targetAgent ? (
        <>
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            to
          </span>
          <Badge
            className={cn(
              "h-6 shrink-0 rounded-full px-2 font-semibold text-[10px] uppercase tracking-[0.18em]",
              ACTIVITY_AGENT_BADGE_STYLES[entry.targetAgent]
            )}
            variant="outline"
          >
            {getActivityAgentLabel(entry.targetAgent)}
          </Badge>
        </>
      ) : null}
      <span className="font-medium text-foreground/80 text-sm">
        {entry.message}
      </span>
    </li>
  );
}

export function LiveTicker({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listTickerActivity, {
    organizationId,
  });

  if (!activity || activity.length === 0) {
    return null;
  }

  const repeatedActivity = [...activity, ...activity];

  return (
    <div
      aria-live="polite"
      className="relative mb-4 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r from-card via-card/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-card via-card/90 to-transparent" />

      <div className="flex items-center">
        <div className="flex shrink-0 items-center gap-2 border-border/60 border-r bg-background/50 px-3 py-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.35em]">
            Live
          </span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <ul className="flex min-w-max animate-[autopilot-ticker_36s_linear_infinite] list-none items-center whitespace-nowrap py-3 motion-reduce:animate-none">
            {repeatedActivity.map((entry, index) => (
              <TickerItem entry={entry} key={`${entry._id}-${String(index)}`} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
