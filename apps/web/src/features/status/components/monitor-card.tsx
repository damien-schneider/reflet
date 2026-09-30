"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { DotsThree, Pause, Play, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { cn } from "@/lib/utils";
import {
  formatLatency,
  MONITOR_STATUS_LABEL,
  MONITOR_STATUS_TEXT_CLASS,
  type MonitorStatus,
} from "../lib/status-meta";
import { ResponseTimeChart } from "./response-time-chart";
import { StatusDot } from "./status-dot";
import { UptimeBar } from "./uptime-bar";

interface UptimeData {
  days: Array<{ date: string; uptimePercentage: number }>;
  overallUptime: number;
}

const CHECK_INTERVALS = [
  { label: "Every minute", value: 1 },
  { label: "Every 5 minutes", value: 5 },
  { label: "Every 10 minutes", value: 10 },
  { label: "Every 30 minutes", value: 30 },
] as const;

interface MonitorCardProps {
  isPro?: boolean;
  monitor: {
    _id: Id<"statusMonitors">;
    name: string;
    url: string;
    status: MonitorStatus;
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

export function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
  onUpdateInterval,
  isPro,
  uptimeData,
}: MonitorCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const canChangeInterval = isPro && onUpdateInterval;

  return (
    <section aria-label={monitor.name} className="space-y-3">
      <Card>
        <CardContent className="flex items-center gap-3">
          <StatusDot status={monitor.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate font-medium text-sm" title={monitor.name}>
                {monitor.name}
              </h3>
              <span
                className={cn(
                  "shrink-0 font-medium text-xs",
                  MONITOR_STATUS_TEXT_CLASS[monitor.status]
                )}
              >
                {MONITOR_STATUS_LABEL[monitor.status]}
              </span>
            </div>
            <p
              className="truncate text-muted-foreground text-xs"
              title={monitor.url}
            >
              {monitor.url}
            </p>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {monitor.lastResponseTimeMs !== undefined && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatLatency(monitor.lastResponseTimeMs)}
              </span>
            )}
            <Badge size="sm" variant="outline">
              <span className="tabular-nums">
                {monitor.checkIntervalMinutes}
              </span>{" "}
              min
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${monitor.name}`}
              iconOnly
              size="sm"
              variant="ghost"
            >
              <DotsThree />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {monitor.status === "paused" ? (
                <DropdownMenuItem onClick={() => onResume(monitor._id)}>
                  <Play className="size-4" />
                  Resume checks
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPause(monitor._id)}>
                  <Pause className="size-4" />
                  Pause checks
                </DropdownMenuItem>
              )}
              {canChangeInterval && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Check interval</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      onValueChange={(value: unknown) => {
                        if (typeof value === "number") {
                          onUpdateInterval(monitor._id, value);
                        }
                      }}
                      value={monitor.checkIntervalMinutes}
                    >
                      {CHECK_INTERVALS.map((interval) => (
                        <DropdownMenuRadioItem
                          key={interval.value}
                          value={interval.value}
                        >
                          {interval.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="menu-item-danger"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash className="size-4" />
                Delete monitor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {uptimeData && (
        <UptimeBar
          days={uptimeData.days}
          overallUptime={uptimeData.overallUptime}
        />
      )}
      {monitor.recentChecks.length > 0 && (
        <ResponseTimeChart
          lastResponseTimeMs={monitor.lastResponseTimeMs}
          recentChecks={monitor.recentChecks}
        />
      )}

      <DestructiveConfirmDialog
        confirmLabel="Delete monitor"
        description="Checks stop and the monitor disappears from your public status page. This can’t be undone."
        onConfirm={() => onDelete(monitor._id)}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title={`Delete ${monitor.name}?`}
      />
    </section>
  );
}
