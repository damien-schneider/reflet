"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const growthChartConfig = {
  organizations: { color: "var(--chart-2)", label: "New organizations" },
  subscriptions: { color: "var(--chart-3)", label: "Subscriptions" },
  users: { color: "var(--chart-1)", label: "New users" },
} satisfies ChartConfig;

const engagementChartConfig = {
  comments: { color: "var(--chart-5)", label: "Comments" },
  feedback: { color: "var(--chart-1)", label: "Feedback" },
  votes: { color: "var(--chart-4)", label: "Votes" },
} satisfies ChartConfig;

const GROWTH_SERIES = ["users", "organizations", "subscriptions"] as const;

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export interface TrendPoint {
  comments: number;
  date: string;
  feedback: number;
  organizations: number;
  subscriptions: number;
  users: number;
  votes: number;
}

const AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
} as const;

function TrendCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function SuperAdminTrendCharts({
  trends,
}: {
  trends: TrendPoint[] | undefined;
}) {
  if (!trends) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-(--radius-panel)" />
        <Skeleton className="h-80 rounded-(--radius-panel)" />
      </div>
    );
  }

  const chartData = trends.map((point) => ({
    ...point,
    label: chartDateFormatter.format(new Date(point.date)),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TrendCard title="Growth">
        <ChartContainer className="min-h-55 w-full" config={growthChartConfig}>
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <title>New users, organizations, and subscriptions per day</title>
            <defs>
              {GROWTH_SERIES.map((series) => (
                <linearGradient
                  id={`fill-${series}`}
                  key={series}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${series})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${series})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis {...AXIS_PROPS} dataKey="label" tickMargin={8} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={30} />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dot" />}
              cursor={false}
            />
            {GROWTH_SERIES.map((series) => (
              <Area
                dataKey={series}
                fill={`url(#fill-${series})`}
                fillOpacity={0.4}
                isAnimationActive={false}
                key={series}
                stroke={`var(--color-${series})`}
                type="monotone"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </TrendCard>

      <TrendCard title="Engagement">
        <ChartContainer
          className="min-h-55 w-full"
          config={engagementChartConfig}
        >
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <title>Feedback, votes, and comments per day</title>
            <CartesianGrid vertical={false} />
            <XAxis {...AXIS_PROPS} dataKey="label" tickMargin={8} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <Bar
              dataKey="feedback"
              fill="var(--color-feedback)"
              isAnimationActive={false}
              stackId="engagement"
            />
            <Bar
              dataKey="votes"
              fill="var(--color-votes)"
              isAnimationActive={false}
              stackId="engagement"
            />
            <Bar
              dataKey="comments"
              fill="var(--color-comments)"
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
              stackId="engagement"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </TrendCard>
    </div>
  );
}
