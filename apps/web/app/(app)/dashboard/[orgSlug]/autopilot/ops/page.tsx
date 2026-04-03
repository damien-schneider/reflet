"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconAlertTriangle,
  IconCloudUpload,
  IconRefresh,
  IconStatusChange,
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
import { cn } from "@/lib/utils";

const resolveUptimeStatus = (uptimePercent: number) => {
  if (uptimePercent >= 99.9) {
    return "green";
  }
  if (uptimePercent >= 99) {
    return "yellow";
  }
  return "red";
};

const UPTIME_LABELS = {
  green: "All Systems Operational",
  yellow: "Degraded Performance",
  red: "Service Disruption",
} as const;

const UPTIME_BANNER_STYLES = {
  green: "border-green-500/30 bg-green-500/5",
  yellow: "border-yellow-500/30 bg-yellow-500/5",
  red: "border-red-500/30 bg-red-500/5",
} as const;

const UPTIME_DOT_STYLES = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
} as const;

function OpsLoadingSkeleton() {
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

export default function OpsDashboardPage() {
  const { organizationId } = useAutopilotContext();

  const latestSnapshot = useQuery(
    api.autopilot.ops_queries.getLatestOpsSnapshot,
    { organizationId }
  );

  const snapshots = useQuery(api.autopilot.ops_queries.listOpsSnapshots, {
    organizationId,
    limit: 30,
  });

  const alerts = useQuery(api.autopilot.ops_queries.getOpsAlerts, {
    organizationId,
  });

  if (
    latestSnapshot === undefined ||
    snapshots === undefined ||
    alerts === undefined
  ) {
    return <OpsLoadingSkeleton />;
  }

  const uptimeStatus = resolveUptimeStatus(
    latestSnapshot?.uptimePercent ?? 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Ops Dashboard</H2>
        <Button size="sm" variant="outline">
          <IconRefresh className="mr-1.5 size-4" />
          Check Deployments
        </Button>
      </div>

      {/* Status Banner */}
      <Card className={cn("border-2", UPTIME_BANNER_STYLES[uptimeStatus])}>
        <CardContent className="flex items-center gap-4 pt-6">
          <div
            className={cn(
              "size-4 rounded-full",
              UPTIME_DOT_STYLES[uptimeStatus]
            )}
          />
          <div>
            <p className="font-bold text-lg">{UPTIME_LABELS[uptimeStatus]}</p>
            <p className="text-muted-foreground text-sm">
              Uptime: {latestSnapshot?.uptimePercent?.toFixed(2) ?? "100.00"}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deploys</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {latestSnapshot?.deployCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-red-500">
              {latestSnapshot?.failedDeploys ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Build Time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">
              {latestSnapshot?.avgBuildTime
                ? `${Math.round(latestSnapshot.avgBuildTime / 1000)}s`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-orange-500">
              {latestSnapshot?.incidentCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deployments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconCloudUpload className="size-5" />
            Recent Snapshots ({snapshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No deployment data yet. The Ops Agent will start monitoring.
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
                    <span>{snap.deployCount} deploys</span>
                    {snap.failedDeploys > 0 && (
                      <span className="text-red-500">
                        {snap.failedDeploys} failed
                      </span>
                    )}
                    <span>
                      {snap.uptimePercent?.toFixed(2) ?? "100.00"}% uptime
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {(alerts.deployFailures.length > 0 || alerts.errorSpikes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconAlertTriangle className="size-5 text-orange-500" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.deployFailures.map((alert) => (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                  key={alert._id}
                >
                  <IconStatusChange className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {alert.summary}
                    </p>
                  </div>
                </div>
              ))}
              {alerts.errorSpikes.map((alert) => (
                <div
                  className="flex items-start gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3"
                  key={alert._id}
                >
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />
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
