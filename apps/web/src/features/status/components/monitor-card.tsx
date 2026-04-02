"use client";

import {
  DotsThree,
  Lightning,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ResponseTimeChart } from "./response-time-chart";
import { StatusDot } from "./status-dot";
import { UptimeBar } from "./uptime-bar";

interface UptimeData {
  days: Array<{ date: string; uptimePercentage: number }>;
  overallUptime: number;
}

const CHECK_INTERVALS = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
] as const;

interface MonitorCardProps {
  isPro?: boolean;
  monitor: {
    _id: Id<"statusMonitors">;
    name: string;
    url: string;
    status: "operational" | "degraded" | "major_outage" | "paused";
    lastResponseTimeMs?: number;
    checkIntervalMinutes: number;
    recentChecks: Array<{
      responseTimeMs?: number;
      checkedAt: number;
      isUp: boolean;
    }>;
  };
  onDelete: (id: Id<"statusMonitors">) => void;
  onPause: (id: Id<"statusMonitors">) => void;
  onResume: (id: Id<"statusMonitors">) => void;
  onUpdateInterval?: (id: Id<"statusMonitors">, minutes: number) => void;
  uptimeData?: UptimeData;
}

const statusLabels = {
  operational: "Operational",
  degraded: "Degraded",
  major_outage: "Major Outage",
  paused: "Paused",
} as const;

const statusLabelStyles = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded: "text-amber-600 dark:text-amber-400",
  major_outage: "text-red-600 dark:text-red-400",
  paused: "text-muted-foreground",
} as const;

export function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
  onUpdateInterval,
  isPro,
  uptimeData,
}: MonitorCardProps) {
  return (
    <div className="space-y-3">
      {/* Monitor header card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <StatusDot status={monitor.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-sm">
                {monitor.name}
              </span>
              <span
                className={cn(
                  "font-medium text-xs",
                  statusLabelStyles[monitor.status]
                )}
              >
                {statusLabels[monitor.status]}
              </span>
            </div>
            <p className="truncate text-muted-foreground text-xs">
              {monitor.url}
            </p>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {monitor.lastResponseTimeMs !== undefined && (
              <span className="font-mono text-muted-foreground text-xs">
                {monitor.lastResponseTimeMs}ms
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
              {monitor.checkIntervalMinutes}m
            </span>
          </div>

          <DropdownList>
            <DropdownListTrigger
              render={(props) => (
                <Button
                  {...props}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onClick?.(e);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <DotsThree className="h-4 w-4" />
                </Button>
              )}
            />
            <DropdownListContent align="end">
              {monitor.status === "paused" ? (
                <DropdownListItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume(monitor._id);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownListItem>
              ) : (
                <DropdownListItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPause(monitor._id);
                  }}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownListItem>
              )}
              {isPro && onUpdateInterval && (
                <>
                  <div className="px-2 py-1.5 text-muted-foreground text-xs">
                    <Lightning className="mr-1 inline h-3 w-3" />
                    Check interval
                  </div>
                  {CHECK_INTERVALS.map((interval) => (
                    <DropdownListItem
                      key={interval.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateInterval(monitor._id, interval.value);
                      }}
                    >
                      <span
                        className={
                          monitor.checkIntervalMinutes === interval.value
                            ? "font-semibold"
                            : ""
                        }
                      >
                        {interval.label}
                        {monitor.checkIntervalMinutes === interval.value &&
                          " (current)"}
                      </span>
                    </DropdownListItem>
                  ))}
                </>
              )}
              <DropdownListItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(monitor._id);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>

      {/* Metric cards: uptime + response time side by side */}
      <div className="grid grid-cols-1 gap-3">
        {uptimeData && (
          <UptimeBar
            days={uptimeData.days}
            label="Uptime"
            overallUptime={uptimeData.overallUptime}
            variant="card"
          />
        )}
        {monitor.recentChecks.length > 0 && (
          <ResponseTimeChart
            lastResponseTimeMs={monitor.lastResponseTimeMs}
            recentChecks={monitor.recentChecks}
          />
        )}
      </div>
    </div>
  );
}
