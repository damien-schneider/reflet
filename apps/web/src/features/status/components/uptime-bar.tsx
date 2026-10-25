"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  Chart,
  ChartLegend,
  ChartLegendItem,
  ChartPlot,
} from "@ctrl-ui/react/ui/chart";
import { barChart } from "@ctrl-ui/react/ui/chart-cartesian";
import type { ChartColor } from "@ctrl-ui/react/ui/chart-colors";
import { Text } from "@ctrl-ui/react/ui/typography";
import { scaleBand } from "@tanstack/charts/scales/band";
import { useSyncExternalStore } from "react";
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

const UPTIME_BANDS = [
  {
    color: "var(--success)",
    key: "up",
    label: "Operational",
    range: `≥ ${UP_THRESHOLD}%`,
  },
  {
    color: "var(--warning)",
    key: "degraded",
    label: "Degraded",
    range: `≥ ${DEGRADED_THRESHOLD}%`,
  },
  {
    color: "color-mix(in oklab, var(--warning) 60%, var(--destructive))",
    key: "partial",
    label: "Partial outage",
    range: `≥ ${PARTIAL_THRESHOLD}%`,
  },
  {
    color: "var(--destructive)",
    key: "down",
    label: "Down",
    range: `< ${PARTIAL_THRESHOLD}%`,
  },
  {
    color: "var(--muted-foreground)",
    key: "no-data",
    label: "No data",
    range: "",
  },
] as const satisfies readonly {
  color: ChartColor;
  key: string;
  label: string;
  range: string;
}[];

type UptimeBand = (typeof UPTIME_BANDS)[number];

const getBand = (uptime: number | null): UptimeBand => {
  const [up, degraded, partial, down, noData] = UPTIME_BANDS;
  if (uptime === null) {
    return noData;
  }
  if (uptime >= UP_THRESHOLD) {
    return up;
  }
  if (uptime >= DEGRADED_THRESHOLD) {
    return degraded;
  }
  if (uptime >= PARTIAL_THRESHOLD) {
    return partial;
  }
  return down;
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
    <Chart>
      <ChartLegend aria-label="Uptime legend">
        {UPTIME_BANDS.map((band) => (
          <ChartLegendItem color={band.color} key={band.key}>
            {band.label}
            {band.range && <span className="tabular-nums">{band.range}</span>}
          </ChartLegendItem>
        ))}
      </ChartLegend>
    </Chart>
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
  const definition = barChart({
    data: chartData,
    fill: "solid",
    formatValue: (_uptime, day) =>
      day.raw === null ? "No data" : `${formatUptime(day.raw)} uptime`,
    formatX: formatDay,
    grid: false,
    radius: 3,
    series: [
      {
        color: (day) => getBand(day.raw).color,
        key: "uptime",
        label: "Uptime",
      },
    ],
    x: "date",
    xScale: {
      axis: false,
      scale: () => scaleBand().paddingInner(0.15).paddingOuter(0),
    },
    yScale: { axis: false },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uptime</CardTitle>
        <CardAction>
          <Text numeric weight="semibold">
            {computedUptime === null
              ? "No data yet"
              : formatUptime(computedUptime)}
          </Text>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Chart>
          <ChartPlot
            ariaDescription={summary}
            ariaLabel={`Daily uptime, last ${totalDays} days`}
            definition={definition}
            height={40}
          />
        </Chart>
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
