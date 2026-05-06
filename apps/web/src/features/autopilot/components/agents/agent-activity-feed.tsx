"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVITY_LEVEL_DOT_STYLES,
  type ActivityLevel,
} from "@/features/autopilot/components/activity/presentation";
import { cn } from "@/lib/utils";

import type { GridAgentId } from "./agent-grid-card";

const LEVEL_LABEL_COLORS: Record<ActivityLevel, string> = {
  info: "text-muted-foreground",
  action: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

const ALL_LEVELS: readonly ActivityLevel[] = [
  "info",
  "action",
  "success",
  "warning",
  "error",
] as const;

export function AgentActivityFeed({
  organizationId,
  agentId,
}: {
  organizationId: Id<"organizations">;
  agentId: GridAgentId;
}) {
  const [levelFilter, setLevelFilter] = useState<ActivityLevel | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);

  const activity = useQuery(
    api.autopilot.queries.agent_detail.listAgentActivity,
    {
      organizationId,
      agent: agentId,
      level: levelFilter ?? undefined,
      limit: 100,
    }
  );

  // Auto-scroll when new entries arrive
  const currentCount = activity?.length ?? 0;
  useEffect(
    function scrollOnNewActivity() {
      if (currentCount > previousCountRef.current && scrollBottomRef.current) {
        scrollBottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
      previousCountRef.current = currentCount;
    },
    [currentCount]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      {/* Header + filters */}
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Activity Log</h3>
        <div className="flex items-center gap-1">
          {ALL_LEVELS.map((level) => {
            const isActive = levelFilter === level;
            return (
              <Button
                className={cn(
                  "h-6 px-2 text-[10px]",
                  isActive && LEVEL_LABEL_COLORS[level]
                )}
                key={level}
                onClick={() => setLevelFilter(isActive ? null : level)}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
              >
                <span
                  className={cn(
                    "mr-1 inline-block size-1.5 rounded-full",
                    ACTIVITY_LEVEL_DOT_STYLES[level]
                  )}
                />
                {level}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <ScrollArea
        className="flex-1"
        classNameViewport="p-3"
        direction="vertical"
      >
        <ActivityFeedContent
          activity={activity}
          scrollBottomRef={scrollBottomRef}
        />
      </ScrollArea>
    </div>
  );
}

function ActivityFeedContent({
  activity,
  scrollBottomRef,
}: {
  activity: ActivityEntryData[] | undefined;
  scrollBottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (activity === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton
            className="h-12 w-full rounded-lg"
            key={`feed-skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground/50 text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {/* Activity is desc from Convex — reverse to show oldest first */}
        {[...activity].reverse().map((entry) => (
          <ActivityEntry entry={entry} key={entry._id} />
        ))}
      </AnimatePresence>
      <div ref={scrollBottomRef} />
    </div>
  );
}

interface ActivityEntryData {
  _id: string;
  action?: string;
  createdAt: number;
  details?: string;
  level: ActivityLevel;
  message: string;
  targetAgent?: string;
}

function ActivityEntry({ entry }: { entry: ActivityEntryData }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(entry.details);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border/50 hover:bg-muted/30"
      initial={{ opacity: 0, y: 4 }}
      layout
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-block size-2 shrink-0 rounded-full",
            ACTIVITY_LEVEL_DOT_STYLES[entry.level]
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">{entry.message}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40">
              {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
            </span>
            {entry.action && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/50">
                {entry.action}
              </span>
            )}
          </div>
        </div>

        {hasDetails && (
          <Button
            className="size-6 shrink-0"
            onClick={() => setExpanded((prev) => !prev)}
            size="icon"
            variant="ghost"
          >
            <IconChevronDown
              className={cn(
                "size-3 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {expanded && entry.details && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground leading-relaxed">
              {entry.details}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
