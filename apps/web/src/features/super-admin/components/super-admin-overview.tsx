"use client";

import {
  Buildings,
  ChatCircle,
  CreditCard,
  ThumbsUp,
  UserCircle,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "./stat-card";

type TimeRange = "7d" | "30d";

const growthChartConfig = {
  users: {
    label: "New Users",
    color: "var(--chart-1)",
  },
  organizations: {
    label: "New Orgs",
    color: "var(--chart-2)",
  },
  subscriptions: {
    label: "Subscriptions",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const engagementChartConfig = {
  feedback: {
    label: "Feedback",
    color: "var(--chart-1)",
  },
  votes: {
    label: "Votes",
    color: "var(--chart-4)",
  },
  comments: {
    label: "Comments",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SuperAdminOverview() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const stats = useQuery(api.super_admin.getDashboardStats);
  const recentActivity = useQuery(api.super_admin.getRecentActivity, {
    limit: 15,
  });

  const days = timeRange === "7d" ? 7 : 30;
  const trends = useQuery(api.super_admin.getTrends, { days });

  const chartData = useMemo(() => {
    if (!trends) {
      return [];
    }
    return trends.map((d) => ({
      ...d,
      label: formatChartDate(d.date),
    }));
  }, [trends]);

  if (stats === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
          <Skeleton className="h-[88px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const timeRangeButtons = (
    <div className="flex gap-1">
      <Button
        onClick={() => setTimeRange("7d")}
        size="sm"
        variant={timeRange === "7d" ? "default" : "ghost"}
      >
        7 days
      </Button>
      <Button
        onClick={() => setTimeRange("30d")}
        size="sm"
        variant={timeRange === "30d" ? "default" : "ghost"}
      >
        30 days
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
        <StatCard
          icon={Buildings}
          label="Organizations"
          value={stats.totalOrganizations}
        />
        <StatCard
          icon={ChatCircle}
          label="Feedback"
          value={stats.totalFeedback}
        />
        <StatCard
          icon={CreditCard}
          label="Pro Subscriptions"
          value={stats.activeProSubscriptions}
        />
        <StatCard
          icon={ThumbsUp}
          label="Total Votes"
          value={stats.totalVotes}
        />
        <StatCard
          icon={UserCircle}
          label="Total Comments"
          value={stats.totalComments}
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Trends</h3>
        {timeRangeButtons}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h4 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Growth
          </h4>
          {trends ? (
            <ChartContainer
              className="min-h-[220px] w-full"
              config={growthChartConfig}
            >
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 12, right: 12 }}
              >
                <defs>
                  <linearGradient id="fillUsers" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-users)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-users)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillOrganizations"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-organizations)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-organizations)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillSubscriptions"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-subscriptions)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-subscriptions)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tickFormatter={(value) => value.slice(0, 6)}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                  cursor={false}
                />
                <Area
                  dataKey="users"
                  fill="url(#fillUsers)"
                  fillOpacity={0.4}
                  stroke="var(--color-users)"
                  type="natural"
                />
                <Area
                  dataKey="organizations"
                  fill="url(#fillOrganizations)"
                  fillOpacity={0.4}
                  stroke="var(--color-organizations)"
                  type="natural"
                />
                <Area
                  dataKey="subscriptions"
                  fill="url(#fillSubscriptions)"
                  fillOpacity={0.4}
                  stroke="var(--color-subscriptions)"
                  type="natural"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <Skeleton className="h-[220px] rounded" />
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h4 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Engagement
          </h4>
          {trends ? (
            <ChartContainer
              className="min-h-[220px] w-full"
              config={engagementChartConfig}
            >
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tickFormatter={(value) => value.slice(0, 6)}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={false}
                />
                <Bar
                  dataKey="feedback"
                  fill="var(--color-feedback)"
                  radius={[4, 4, 0, 0]}
                  stackId="engagement"
                />
                <Bar
                  dataKey="votes"
                  fill="var(--color-votes)"
                  radius={[0, 0, 0, 0]}
                  stackId="engagement"
                />
                <Bar
                  dataKey="comments"
                  fill="var(--color-comments)"
                  radius={[0, 0, 0, 0]}
                  stackId="engagement"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          ) : (
            <Skeleton className="h-[220px] rounded" />
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="mb-4 font-medium text-sm">Recent Activity</h3>
        {recentActivity === undefined && (
          <div className="space-y-3">
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
          </div>
        )}
        {recentActivity?.length === 0 && (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        )}
        {recentActivity && recentActivity.length > 0 && (
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div
                className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
                key={activity._id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-medium">{activity.userName}</span>
                  <span className="text-muted-foreground">
                    {activity.action}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    in {activity.organizationName}
                  </span>
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
