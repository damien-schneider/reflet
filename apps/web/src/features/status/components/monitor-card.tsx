"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  DotsThree,
  ListChecks,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  formatLatency,
  MONITOR_STATUS_LABEL,
  MONITOR_STATUS_TEXT_CLASS,
  type MonitorStatus,
} from "../lib/status-meta";
import { ResponseChecksDialog } from "./response-checks";
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

const SLOW_RESPONSE_THRESHOLD_OFF = 0;

const SLOW_RESPONSE_THRESHOLDS = [
  { label: "Never", value: SLOW_RESPONSE_THRESHOLD_OFF },
  { label: "Slower than 500 ms", value: 500 },
  { label: "Slower than 1 s", value: 1000 },
  { label: "Slower than 2 s", value: 2000 },
  { label: "Slower than 5 s", value: 5000 },
] as const;

interface MonitorChanges {
  bodyKeyword?: string | null;
  checkIntervalMinutes?: number;
  degradedResponseTimeMs?: number | null;
  expectedStatusCodes?: number[] | null;
  isPublic?: boolean;
}

interface MonitorCardProps {
  isPro?: boolean;
  monitor: {
    _id: Id<"statusMonitors">;
    name: string;
    url: string;
    status: MonitorStatus;
    isPublic: boolean;
    degradedResponseTimeMs?: number;
    bodyKeyword?: string;
    expectedStatusCodes?: number[];
    lastResponseTimeMs?: number;
    checkIntervalMinutes: number;
    latencyByHour: Array<{ hourStart: number; responseTimeMs: number }>;
  };
  onDelete: (id: Id<"statusMonitors">) => void;
  onPausedChange: (id: Id<"statusMonitors">, paused: boolean) => void;
  onUpdate: (
    id: Id<"statusMonitors">,
    changes: MonitorChanges
  ) => Promise<unknown>;
  uptimeData?: UptimeData;
}

export function MonitorCard({
  monitor,
  onPausedChange,
  onUpdate,
  onDelete,
  isPro,
  uptimeData,
}: MonitorCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isChecksOpen, setIsChecksOpen] = useState(false);

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
                <DropdownMenuItem
                  onClick={() => onPausedChange(monitor._id, false)}
                >
                  <Play className="size-4" />
                  Resume checks
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onPausedChange(monitor._id, true)}
                >
                  <Pause className="size-4" />
                  Pause checks
                </DropdownMenuItem>
              )}
              <DropdownMenuCheckboxItem
                checked={monitor.isPublic}
                onCheckedChange={(isPublic) =>
                  onUpdate(monitor._id, { isPublic })
                }
              >
                Show on status page
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem onClick={() => setIsChecksOpen(true)}>
                <ListChecks className="size-4" />
                Edit response checks…
              </DropdownMenuItem>
              {isPro && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Check interval</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      onValueChange={(value: unknown) => {
                        if (typeof value === "number") {
                          onUpdate(monitor._id, {
                            checkIntervalMinutes: value,
                          });
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
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mark as degraded</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  onValueChange={(value: unknown) => {
                    if (typeof value === "number") {
                      onUpdate(monitor._id, {
                        degradedResponseTimeMs:
                          value === SLOW_RESPONSE_THRESHOLD_OFF ? null : value,
                      });
                    }
                  }}
                  value={
                    monitor.degradedResponseTimeMs ??
                    SLOW_RESPONSE_THRESHOLD_OFF
                  }
                >
                  {SLOW_RESPONSE_THRESHOLDS.map((threshold) => (
                    <DropdownMenuRadioItem
                      key={threshold.value}
                      value={threshold.value}
                    >
                      {threshold.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
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
      <ResponseTimeChart
        lastResponseTimeMs={monitor.lastResponseTimeMs}
        latencyByHour={monitor.latencyByHour}
      />

      <DestructiveConfirmDialog
        confirmLabel="Delete monitor"
        description="Checks stop and the monitor disappears from your public status page. This can’t be undone."
        onConfirm={() => onDelete(monitor._id)}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title={`Delete ${monitor.name}?`}
      />
      <ResponseChecksDialog
        monitor={monitor}
        onOpenChange={setIsChecksOpen}
        onSave={(changes) => onUpdate(monitor._id, changes)}
        open={isChecksOpen}
      />
    </section>
  );
}
