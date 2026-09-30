"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { useSyncExternalStore } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatUptime } from "../lib/status-meta";

interface DayData {
  date: string;
  uptimePercentage: number;
}

interface UptimeBarProps {
  days: DayData[];
  overallUptime?: number;
  totalDays?: number;
}

const MS_PER_DAY = 86_400_000;
const UP_THRESHOLD = 99.5;
const DEGRADED_THRESHOLD = 95;
const PARTIAL_THRESHOLD = 90;

const chartConfig = {
  degraded: { color: "var(--warning)", label: "Degraded" },
  down: { color: "var(--destructive)", label: "Down" },
  "no-data": { color: "var(--muted-foreground)", label: "No data" },
  partial: {
    color: "color-mix(in oklab, var(--warning) 60%, var(--destructive))",
    label: "Partial outage",
  },
  up: { color: "var(--success)", label: "Operational" },
  uptime: { label: "Uptime" },
} satisfies ChartConfig;

const UPTIME_BANDS = [
  { className: "bg-success", key: "up", range: `≥ ${UP_THRESHOLD}%` },
  {
    className: "bg-warning",
    key: "degraded",
    range: `≥ ${DEGRADED_THRESHOLD}%`,
  },
  {
    className: "bg-[color-mix(in_oklab,var(--warning)_60%,var(--destructive))]",
    key: "partial",
    range: `≥ ${PARTIAL_THRESHOLD}%`,
  },
  {
    className: "bg-destructive",
    key: "down",
    range: `< ${PARTIAL_THRESHOLD}%`,
  },
  { className: "bg-muted-foreground", key: "no-data", range: "" },
] as const;

type UptimeBand = (typeof UPTIME_BANDS)[number]["key"];

const getBand = (uptime: number | null): UptimeBand => {
  if (uptime === null) {
    return "no-data";
  }
  if (uptime >= UP_THRESHOLD) {
    return "up";
  }
  if (uptime >= DEGRADED_THRESHOLD) {
    return "degraded";
  }
  if (uptime >= PARTIAL_THRESHOLD) {
    return "partial";
  }
  return "down";
};

const formatDay = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const toIsoDay = (timestamp: number): string =>
  new Date(timestamp).toISOString().split("T")[0];

const subscribeToNothing = () => () => undefined;

const readUtcToday = () => toIsoDay(Date.now());

export function UptimeLegend() {
  return (
    <ul
      aria-label="Uptime legend"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground"
    >
      {UPTIME_BANDS.map((band) => (
        <li className="flex items-center gap-1.5" key={band.key}>
          <span
            aria-hidden
            className={cn("size-2.5 rounded-[3px]", band.className)}
          />
          <span>{chartConfig[band.key].label}</span>
          {band.range && <span className="tabular-nums">{band.range}</span>}
        </li>
      ))}
    </ul>
  );
}

export function UptimeBar({
  days,
  overallUptime,
  totalDays = 90,
}: UptimeBarProps) {
  const today = useSyncExternalStore(
    subscribeToNothing,
    readUtcToday,
    readUtcToday
  );
  const dayMap = new Map(days.map((d) => [d.date, d.uptimePercentage]));
  const chartData = Array.from({ length: totalDays }, (_, index) => {
    const date = toIsoDay(
      Date.parse(today) - (totalDays - 1 - index) * MS_PER_DAY
    );
    return { date, raw: dayMap.get(date) ?? null, uptime: 100 };
  });

  const averageUptime =
    days.length > 0
      ? days.reduce((sum, d) => sum + d.uptimePercentage, 0) / days.length
      : null;
  const computedUptime = overallUptime ?? averageUptime;
  const summary =
    computedUptime === null
      ? `No uptime data in the last ${totalDays} days.`
      : `${formatUptime(computedUptime)} uptime over the last ${totalDays} days. Use the arrow keys to inspect each day.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uptime</CardTitle>
        <CardAction className="font-semibold tabular-nums">
          {computedUptime === null
            ? "No data yet"
            : formatUptime(computedUptime)}
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-8 w-full" config={chartConfig}>
          <BarChart
            barCategoryGap={1}
            data={chartData}
            desc={summary}
            margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
            title={`Daily uptime, last ${totalDays} days`}
          >
            <XAxis dataKey="date" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(_value, _name, item) => {
                    const raw: unknown = item.payload?.raw;
                    return typeof raw === "number"
                      ? `${formatUptime(raw)} uptime`
                      : "No data";
                  }}
                  hideIndicator
                  labelFormatter={formatDay}
                  nameKey="uptime"
                />
              }
              cursor={false}
            />
            <Bar dataKey="uptime" radius={[3, 3, 3, 3]}>
              {chartData.map((entry) => (
                <Cell
                  fill={`var(--color-${getBand(entry.raw)})`}
                  key={entry.date}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-2 flex items-center justify-between text-caption text-muted-foreground">
          <span>
            <span className="tabular-nums">{totalDays}</span> days ago
          </span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
}
