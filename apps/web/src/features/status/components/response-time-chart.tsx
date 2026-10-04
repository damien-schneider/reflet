"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatLatency } from "../lib/status-meta";

interface ResponseTimeChartProps {
  lastResponseTimeMs?: number;
  latencyByHour: Array<{ hourStart: number; responseTimeMs: number }>;
}

const chartConfig = {
  responseTime: {
    color: "var(--chart-1)",
    label: "Response time",
  },
} satisfies ChartConfig;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response time</CardTitle>
        <CardAction className="font-semibold tabular-nums">
          {lastResponseTimeMs === undefined
            ? "No data yet"
            : formatLatency(lastResponseTimeMs)}
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-20 w-full" config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{ bottom: 0, left: 4, right: 4, top: 4 }}
            title="Response time, last 24 hours"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? formatLatency(value) : value
                  }
                  nameKey="responseTime"
                />
              }
            />
            <Line
              dataKey="responseTime"
              dot={false}
              isAnimationActive={false}
              stroke="var(--color-responseTime)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-2 flex items-center justify-between text-caption text-muted-foreground">
          <span>24 h ago</span>
          <span>Now</span>
        </div>
      </CardContent>
    </Card>
  );
}
