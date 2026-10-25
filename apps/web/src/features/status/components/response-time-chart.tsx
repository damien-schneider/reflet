"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Chart, ChartPlot } from "@ctrl-ui/react/ui/chart";
import { lineChart } from "@ctrl-ui/react/ui/chart-cartesian";
import { Text } from "@ctrl-ui/react/ui/typography";
import { format } from "date-fns";
import { formatLatency } from "../lib/status-meta";

interface ResponseTimeChartProps {
  lastResponseTimeMs?: number;
  latencyByHour: Array<{ hourStart: number; responseTimeMs: number }>;
}

export function ResponseTimeChart({
  latencyByHour,
  lastResponseTimeMs,
}: ResponseTimeChartProps) {
  if (latencyByHour.length === 0) {
    return null;
  }

  const chartData = latencyByHour.map((hour) => ({
    date: format(hour.hourStart, "MMM d, h a"),
    responseTime: hour.responseTimeMs,
  }));
  const definition = lineChart({
    data: chartData,
    formatValue: formatLatency,
    series: [
      {
        color: "var(--chart-1)",
        key: "responseTime",
        label: "Response time",
      },
    ],
    x: "date",
    xScale: { axis: false },
    yScale: { axis: false },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response time</CardTitle>
        <CardAction>
          <Text numeric weight="semibold">
            {lastResponseTimeMs === undefined
              ? "No data yet"
              : formatLatency(lastResponseTimeMs)}
          </Text>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Chart>
          <ChartPlot
            ariaLabel="Response time, last 24 hours"
            definition={definition}
            height={80}
          />
        </Chart>
        <div className="mt-2 flex items-center justify-between text-caption text-muted-foreground">
          <span>24 h ago</span>
          <span>Now</span>
        </div>
      </CardContent>
    </Card>
  );
}
