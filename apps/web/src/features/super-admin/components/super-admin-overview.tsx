"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
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
import { format, formatDistanceToNow } from "date-fns";
import dynamic from "next/dynamic";
import { useState } from "react";
import { StatCard } from "./stat-card";
import { TrendChartsSkeleton } from "./trend-charts-skeleton";

const SuperAdminTrendCharts = dynamic(
  () =>
    import("./super-admin-trend-charts").then((module) => ({
      default: module.SuperAdminTrendCharts,
    })),
  { loading: () => <TrendChartsSkeleton />, ssr: false }
);

const TIME_RANGE_DAYS = { "7d": 7, "30d": 30 } as const;
type TimeRange = keyof typeof TIME_RANGE_DAYS;

const isTimeRange = (value: string): value is TimeRange =>
  value in TIME_RANGE_DAYS;

const STAT_SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;
const ACTIVITY_SKELETON_KEYS = ["a", "b", "c", "d", "e"] as const;

function RecentActivity() {
  const recentActivity = useQuery(
    api.organizations.super_admin_metrics.getRecentActivity,
    { limit: 15 }
  );

  return (
    <section aria-labelledby="recent-activity" className="space-y-3">
      <h2 className="text-heading-4" id="recent-activity">
        Recent activity
      </h2>
      {recentActivity === undefined ? (
        <div aria-busy="true" className="space-y-2">
          {ACTIVITY_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-9" key={key} />
          ))}
        </div>
      ) : null}
      {recentActivity?.length === 0 ? (
        <p className="text-body text-muted-foreground">No activity yet.</p>
      ) : null}
      {recentActivity && recentActivity.length > 0 ? (
        <ol className="divide-y rounded-(--radius-panel) border">
          {recentActivity.map((activity) => (
            <li
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-body"
              key={activity._id}
            >
              <p className="min-w-0 truncate">
                <span className="font-medium">{activity.userName}</span>{" "}
                <span className="text-muted-foreground">
                  {activity.action} in {activity.organizationName}
                </span>
              </p>
              <time
                className="shrink-0 text-caption text-muted-foreground tabular-nums"
                dateTime={new Date(activity.createdAt).toISOString()}
                title={format(activity.createdAt, "PPpp")}
              >
                {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function SuperAdminOverview() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const stats = useQuery(api.organizations.super_admin.getDashboardStats);
  const trends = useQuery(api.organizations.super_admin_metrics.getTrends, {
    days: TIME_RANGE_DAYS[timeRange],
  });

  if (stats === undefined) {
    return (
      <div aria-busy="true" className="space-y-6">
        <p className="sr-only" role="status">
          Loading overview…
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STAT_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-22 rounded-(--radius-panel)" key={key} />
          ))}
        </div>
        <Skeleton className="h-80 rounded-(--radius-panel)" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Users" value={stats.totalUsers} />
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
          label="Pro subscriptions"
          value={stats.activeProSubscriptions}
        />
        <StatCard icon={ThumbsUp} label="Votes" value={stats.totalVotes} />
        <StatCard
          icon={UserCircle}
          label="Comments"
          value={stats.totalComments}
        />
      </div>

      <section aria-labelledby="trends" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-heading-4" id="trends">
            Trends
          </h2>
          <Tabs
            onValueChange={(value) => {
              if (isTimeRange(value)) {
                setTimeRange(value);
              }
            }}
            value={timeRange}
          >
            <TabsList aria-label="Trend range" size="sm">
              <TabsTab value="7d">7 days</TabsTab>
              <TabsTab value="30d">30 days</TabsTab>
            </TabsList>
          </Tabs>
        </div>
        <SuperAdminTrendCharts trends={trends} />
      </section>

      <RecentActivity />
    </div>
  );
}
