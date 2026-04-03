"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconChartBar,
  IconRefresh,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AnalyticsDashboardPage() {
  const { organizationId } = useAutopilotContext();

  const latestSnapshot = useQuery(
    api.autopilot.analytics_queries.getLatestAnalyticsSnapshot,
    { organizationId }
  );

  const snapshots = useQuery(
    api.autopilot.analytics_queries.listAnalyticsSnapshots,
    { organizationId, limit: 30 }
  );

  const insights = useQuery(
    api.autopilot.analytics_queries.getAnalyticsInsights,
    { organizationId }
  );

  if (
    latestSnapshot === undefined ||
    snapshots === undefined ||
    insights === undefined
  ) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-24 rounded-lg" key={`stat-${String(i)}`} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Analytics Dashboard</H2>
        <Button size="sm" variant="outline">
          <IconRefresh className="mr-1.5 size-4" />
          Pull Latest Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {latestSnapshot?.activeUsers ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-green-500">
              {latestSnapshot?.newUsers ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>7d Retention</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {latestSnapshot?.retention7d
                ? `${Math.round(latestSnapshot.retention7d * 100)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Errors</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-red-500">
              {latestSnapshot?.errorCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconChartBar className="size-5" />
            Recent Snapshots ({snapshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No analytics data yet. The Analytics Agent will start collecting
                metrics.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.slice(0, 10).map((snap) => (
                <div
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  key={snap._id}
                >
                  <span className="font-medium text-sm">
                    {snap.snapshotDate}
                  </span>
                  <div className="flex gap-4 text-muted-foreground text-xs">
                    <span>
                      <IconUsers className="mr-1 inline size-3" />
                      {snap.activeUsers} active
                    </span>
                    <span>+{snap.newUsers} new</span>
                    {snap.errorCount !== undefined && snap.errorCount > 0 && (
                      <span className="text-red-500">
                        {snap.errorCount} errors
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies & Insights */}
      {(insights.anomalyAlerts.length > 0 ||
        insights.insightAlerts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anomalies & Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.anomalyAlerts.map((alert) => (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                  key={alert._id}
                >
                  <IconTrendingDown className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {alert.summary}
                    </p>
                  </div>
                </div>
              ))}
              {insights.insightAlerts.map((alert) => (
                <div
                  className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"
                  key={alert._id}
                >
                  <IconTrendingUp className="mt-0.5 size-4 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {alert.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
