"use client";

import { DotsThree, Pause, Play, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponseSparkline } from "./response-sparkline";
import { StatusDot } from "./status-dot";

interface MonitorCardProps {
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
}

const statusLabels = {
  operational: "Operational",
  degraded: "Degraded",
  major_outage: "Major Outage",
  paused: "Paused",
} as const;

export function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
}: MonitorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      className="group w-full cursor-pointer rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50"
      onClick={() => setExpanded(!expanded)}
      type="button"
    >
      <div className="flex items-center gap-3">
        <StatusDot status={monitor.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">{monitor.name}</span>
            <span className="text-muted-foreground text-xs">
              {statusLabels[monitor.status]}
            </span>
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {monitor.url}
          </p>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <ResponseSparkline data={monitor.recentChecks} />
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

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Interval: {monitor.checkIntervalMinutes}m
            </span>
            <span className="text-muted-foreground">
              Checks (24h): {monitor.recentChecks.length}
            </span>
            {monitor.lastResponseTimeMs !== undefined && (
              <span className="text-muted-foreground">
                Last: {monitor.lastResponseTimeMs}ms
              </span>
            )}
          </div>
          <div className="sm:hidden">
            <ResponseSparkline
              className="w-full"
              data={monitor.recentChecks}
              height={32}
            />
          </div>
        </div>
      )}
    </button>
  );
}
