"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  backlog: "var(--chart-3)",
  todo: "var(--chart-4)",
  in_progress: "var(--chart-1)",
  in_review: "var(--chart-5)",
  done: "var(--chart-2)",
  cancelled: "var(--muted-foreground)",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const TYPE_COLORS: Record<string, string> = {
  initiative: "var(--chart-1)",
  story: "var(--chart-2)",
  task: "var(--chart-3)",
  spec: "var(--chart-4)",
  bug: "var(--chart-5)",
};

const TYPE_LABELS: Record<string, string> = {
  initiative: "Initiative",
  story: "Story",
  task: "Task",
  spec: "Spec",
  bug: "Bug",
};

const activityChartConfig = {
  actions: {
    label: "Actions",
    color: "var(--chart-1)",
  },
  successes: {
    label: "Successes",
    color: "var(--chart-2)",
  },
  errors: {
    label: "Errors",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const costChartConfig = {
  cost: {
    label: "Cost ($)",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityTimelineChart({
  data,
}: {
  data: Array<{
    date: string;
    actions: number;
    errors: number;
    successes: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Activity (7 days)</CardTitle>
        <CardDescription>Agent actions, successes, and errors</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="min-h-[200px] w-full"
          config={activityChartConfig}
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              tickFormatter={formatShortDate}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis axisLine={false} tickLine={false} width={30} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatShortDate(String(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillActions" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-actions)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-actions)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSuccesses" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-successes)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-successes)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="actions"
              fill="url(#fillActions)"
              fillOpacity={0.4}
              stroke="var(--color-actions)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="successes"
              fill="url(#fillSuccesses)"
              fillOpacity={0.4}
              stroke="var(--color-successes)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="errors"
              fill="var(--color-errors)"
              fillOpacity={0.2}
              stroke="var(--color-errors)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function CostTimelineChart({
  data,
}: {
  data: Array<{ date: string; cost: number }>;
}) {
  const totalCost = data.reduce((sum, d) => sum + d.cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cost (7 days)</CardTitle>
        <CardDescription>Total: ${totalCost.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="min-h-[200px] w-full"
          config={costChartConfig}
        >
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              tickFormatter={formatShortDate}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              tickLine={false}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [
                    `$${Number(value).toFixed(2)}`,
                    "Cost",
                  ]}
                  labelFormatter={(value) => formatShortDate(String(value))}
                />
              }
            />
            <Bar
              dataKey="cost"
              fill="var(--color-cost)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function WorkItemsByStatusChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
      fill: STATUS_COLORS[status] ?? "var(--chart-3)",
    }));

  if (chartData.length === 0) {
    return null;
  }

  const config: ChartConfig = Object.fromEntries(
    chartData.map(({ status }) => [
      status,
      {
        label: STATUS_LABELS[status] ?? status,
        color: STATUS_COLORS[status] ?? "var(--chart-3)",
      },
    ])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Work Items by Status</CardTitle>
        <CardDescription>Current distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="mx-auto aspect-square max-h-[200px]"
          config={config}
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="status" />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              innerRadius={40}
              nameKey="status"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell fill={entry.fill} key={entry.status} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function WorkItemsByTypeChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
      fill: TYPE_COLORS[type] ?? "var(--chart-3)",
    }));

  if (chartData.length === 0) {
    return null;
  }

  const config: ChartConfig = Object.fromEntries(
    chartData.map(({ type }) => [
      type,
      {
        label: TYPE_LABELS[type] ?? type,
        color: TYPE_COLORS[type] ?? "var(--chart-3)",
      },
    ])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Work Items by Type</CardTitle>
        <CardDescription>Task, bug, story, etc.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="min-h-[200px] w-full" config={config}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              axisLine={false}
              dataKey="type"
              tickFormatter={(v) => TYPE_LABELS[v] ?? v}
              tickLine={false}
              type="category"
              width={70}
            />
            <XAxis axisLine={false} tickLine={false} type="number" />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="type" />}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell fill={entry.fill} key={entry.type} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const chartData = useQuery(api.autopilot.queries.dashboard.getChartData, {
    organizationId,
  });

  if (chartData === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            className="h-[300px] w-full rounded-xl"
            key={`chart-skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const hasActivity = chartData.activityTimeline.some((d) => d.actions > 0);
  const hasCost = chartData.costTimeline.some((d) => d.cost > 0);
  const hasStatus = Object.values(chartData.statusCounts).some((c) => c > 0);
  const hasTypes = Object.values(chartData.typeCounts).some((c) => c > 0);

  if (!(hasActivity || hasCost || hasStatus || hasTypes)) {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Analytics
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {hasActivity && (
          <ActivityTimelineChart data={chartData.activityTimeline} />
        )}
        {hasCost && <CostTimelineChart data={chartData.costTimeline} />}
        {hasStatus && <WorkItemsByStatusChart data={chartData.statusCounts} />}
        {hasTypes && <WorkItemsByTypeChart data={chartData.typeCounts} />}
      </div>
    </section>
  );
}
