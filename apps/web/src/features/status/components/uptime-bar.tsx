"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { useMemo } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DayData {
  date: string;
  uptimePercentage: number;
}

interface UptimeBarProps {
  days: DayData[];
  label?: string;
  overallUptime?: number;
  totalDays?: number;
  variant?: "inline" | "card";
}

const getBarFill = (uptime: number | null): string => {
  if (uptime === null) {
    return "var(--color-no-data)";
  }
  if (uptime >= 99.5) {
    return "var(--color-up)";
  }
  if (uptime >= 95) {
    return "var(--color-degraded)";
  }
  if (uptime >= 90) {
    return "var(--color-warning)";
  }
  return "var(--color-down)";
};

const chartConfig = {
  degraded: { color: "var(--warning)", label: "Degraded" },
  down: { color: "var(--destructive)", label: "Down" },
  "no-data": { color: "var(--muted-foreground)", label: "No data" },
  up: { color: "var(--success)", label: "Operational" },
  uptime: { label: "Uptime" },
  warning: {
    color: "color-mix(in oklab, var(--warning) 60%, var(--destructive))",
    label: "Warning",
  },
} satisfies ChartConfig;

export function UptimeBar({
  days,
  label,
  overallUptime,
  totalDays = 90,
  variant = "inline",
}: UptimeBarProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const chartData = useMemo(() => {
    const result: Array<{ date: string; uptime: number; raw: number | null }> =
      [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const data = dayMap.get(date);
      result.push({
        date,
        raw: data?.uptimePercentage ?? null,
        uptime: 100,
      });
    }
    return result;
  }, [dayMap, totalDays]);

  const hasData = days.length > 0;
  let totalUp = 0;
  let totalWithData = 0;
  for (const d of days) {
    totalUp += d.uptimePercentage;
    totalWithData++;
  }
  const computedUptime =
    overallUptime ??
    (hasData ? Math.round((totalUp / totalWithData) * 100) / 100 : null);

  const barsEl = (
    <ChartContainer className="h-8 w-full" config={chartConfig}>
      <BarChart
        barCategoryGap={1}
        data={chartData}
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
      >
        <XAxis dataKey="date" hide />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, _name, item) => {
                const raw = item.payload.raw as number | null;
                return raw === null ? "No data" : `${raw}% uptime`;
              }}
              hideIndicator
              labelFormatter={(value) => {
                if (typeof value !== "string" && typeof value !== "number") {
                  return "";
                }
                return new Date(value).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
              }}
              nameKey="uptime"
            />
          }
          cursor={false}
        />
        <Bar dataKey="uptime" radius={[4, 4, 4, 4]}>
          {chartData.map((entry) => (
            <Cell fill={getBarFill(entry.raw)} key={entry.date} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );

  const footerEl = (
    <div className="mt-2 flex items-center justify-between text-caption text-muted-foreground sm:text-label">
      <span>
        <span className="tabular-nums">{totalDays}</span> days ago
      </span>
      {variant === "inline" && (
        <span>
          {computedUptime === null ? (
            "No data yet"
          ) : (
            <>
              <span className="tabular-nums">{computedUptime.toFixed(1)}</span>%
              uptime
            </>
          )}
        </span>
      )}
      <span>Today</span>
    </div>
  );

  if (variant === "card") {
    return (
      <Card className="py-4 sm:py-6">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-0 sm:px-6">
          <CardTitle className="font-medium text-muted-foreground text-sm sm:text-base">
            {label ?? "Uptime"}
          </CardTitle>
          <span className="font-semibold text-base tabular-nums sm:text-lg">
            {computedUptime === null ? "—" : `${computedUptime.toFixed(1)}%`}
          </span>
        </CardHeader>
        <CardContent className="px-4 pt-4 pb-0 sm:px-6">
          {barsEl}
          {footerEl}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {barsEl}
      {footerEl}
    </div>
  );
}
