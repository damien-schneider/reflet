"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ResponseTimeChartProps {
  lastResponseTimeMs?: number;
  recentChecks: Array<{
    responseTimeMs?: number;
    checkedAt: number;
    isUp: boolean;
  }>;
}

const chartConfig = {
  responseTime: {
    label: "Response Time",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ResponseTimeChart({
  recentChecks,
  lastResponseTimeMs,
}: ResponseTimeChartProps) {
  const chartData = useMemo(() => {
    return recentChecks
      .filter((c) => c.responseTimeMs !== undefined && c.responseTimeMs > 0)
      .map((c) => ({
        time: new Date(c.checkedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: new Date(c.checkedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        responseTime: c.responseTimeMs,
      }));
  }, [recentChecks]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="py-4 sm:py-6">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-0 sm:px-6">
        <CardTitle className="font-medium text-muted-foreground text-sm sm:text-base">
          Response Time
        </CardTitle>
        <span className="font-semibold text-base tabular-nums sm:text-lg">
          {lastResponseTimeMs === undefined ? "—" : `${lastResponseTimeMs}ms`}
        </span>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-0 sm:px-6">
        <ChartContainer className="h-[80px] w-full" config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="time" hide tickLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `${value}ms`}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.date) {
                      return payload[0].payload.date;
                    }
                    return "";
                  }}
                  nameKey="responseTime"
                />
              }
            />
            <Line
              dataKey="responseTime"
              dot={false}
              stroke="var(--color-responseTime)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
          <span>24h ago</span>
          <span>Now</span>
        </div>
      </CardContent>
    </Card>
  );
}
