"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { H1, H2, Large, Lead, Muted, Text } from "@/components/ui/typography";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";
import { ResponseTimeChart } from "@/features/status/components/response-time-chart";
import { StatusDot } from "@/features/status/components/status-dot";
import { StatusSubscribe } from "@/features/status/components/status-subscribe";
import { UptimeBar } from "@/features/status/components/uptime-bar";
import { cn } from "@/lib/utils";

const statusMessages = {
  operational: "All Systems Operational",
  degraded: "Some Systems Experiencing Issues",
  major_outage: "Major Service Disruption",
} as const;

const statusBannerStyles = {
  operational:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  degraded:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  major_outage: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
} as const;

const statusLabelStyles = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded: "text-amber-600 dark:text-amber-400",
  major_outage: "text-red-600 dark:text-red-400",
} as const;

const statusLabelText = {
  operational: "Operational",
  degraded: "Degraded",
  major_outage: "Major Outage",
} as const;

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  return `${Math.floor(diffHr / 24)}d ago`;
};

const formatDuration = (startMs: number, endMs?: number): string => {
  const duration = (endMs ?? Date.now()) - startMs;
  const mins = Math.floor(duration / 60_000);
  if (mins < 60) {
    return `${mins}min`;
  }
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}min`;
};

export default function CustomDomainStatusPage() {
  const org = useCustomDomainOrg();

  const statusData = useQuery(
    api.status.publicQueries.getPublicStatus,
    org ? { orgSlug: org.slug } : "skip"
  );

  const uptimeBars = useQuery(
    api.status.publicQueries.getPublicUptimeBars,
    org ? { orgSlug: org.slug } : "skip"
  );

  const incidentHistory = useQuery(
    api.status.publicQueries.getPublicIncidentHistory,
    org ? { orgSlug: org.slug } : "skip"
  );

  if (!org || statusData === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (statusData === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <Muted>Status page not available.</Muted>
      </div>
    );
  }

  const overallStatus = statusData.overallStatus as keyof typeof statusMessages;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <H1 variant="page">System Status</H1>
          <Lead className="mt-2">
            Current status and uptime for all services.
          </Lead>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusSubscribe organizationId={org._id} />
        </div>
      </div>

      <div
        className={cn(
          "mb-8 rounded-xl p-6 text-center",
          statusBannerStyles[overallStatus]
        )}
      >
        <div className="flex items-center justify-center gap-3">
          <StatusDot pulse size="lg" status={overallStatus} />
          <Large>{statusMessages[overallStatus]}</Large>
        </div>
      </div>

      {statusData.activeIncidents.length > 0 && (
        <div className="mb-8 space-y-4">
          <H2 variant="card">Active Incidents</H2>
          {statusData.activeIncidents.map((incident) => (
            <div
              className="rounded-lg border border-red-200 p-4 dark:border-red-900"
              key={incident._id}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{incident.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 capitalize dark:bg-red-950 dark:text-red-300">
                      {incident.severity}
                    </span>
                    <span className="text-muted-foreground capitalize">
                      {incident.status}
                    </span>
                    <span className="text-muted-foreground">
                      Started {formatRelativeTime(incident.startedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {incident.affectedMonitors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {incident.affectedMonitors.map((name) => (
                    <span
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-2 border-t pt-3">
                {incident.updates.map((update) => (
                  <div
                    className="flex gap-3 text-xs"
                    key={`${update.createdAt}-${update.status}`}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {formatTime(update.createdAt)}
                    </span>
                    <div>
                      <span className="font-medium capitalize">
                        {update.status}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        &mdash; {update.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {statusData.monitorGroups.map((group) => (
          <div key={group.name}>
            <Text className="mb-3" variant="overline">
              {group.name}
            </Text>
            <div className="space-y-4">
              {group.monitors.map((monitor) => {
                const monitorStatus = monitor.status as
                  | "operational"
                  | "degraded"
                  | "major_outage";
                const uptimeData = uptimeBars?.[monitor._id];

                return (
                  <div key={monitor._id}>
                    <div className="mb-2 flex items-center gap-3 rounded-lg border bg-card p-3">
                      <StatusDot status={monitorStatus} />
                      <span className="min-w-0 flex-1 truncate font-medium text-sm">
                        {monitor.name}
                      </span>
                      <div className="hidden items-center gap-3 sm:flex">
                        {monitor.lastResponseTimeMs !== undefined && (
                          <span className="font-mono text-muted-foreground text-xs">
                            {monitor.lastResponseTimeMs}ms
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-medium text-sm",
                          statusLabelStyles[monitorStatus]
                        )}
                      >
                        {statusLabelText[monitorStatus]}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <UptimeBar
                        days={uptimeData?.days ?? []}
                        label="Uptime"
                        overallUptime={uptimeData?.overallUptime}
                        variant="card"
                      />
                      {monitor.recentChecks.length > 0 && (
                        <ResponseTimeChart
                          lastResponseTimeMs={monitor.lastResponseTimeMs}
                          recentChecks={monitor.recentChecks}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {incidentHistory && incidentHistory.length > 0 && (
        <div className="mt-8">
          <H2 className="mb-4" variant="card">
            Past Incidents
          </H2>
          <div className="space-y-3">
            {incidentHistory.map((incident) => (
              <details className="group rounded-lg border" key={incident._id}>
                <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{incident.title}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
                      {incident.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span>
                      {formatDuration(
                        incident.startedAt,
                        incident.resolvedAt ?? undefined
                      )}
                    </span>
                    <span>{formatTime(incident.startedAt)}</span>
                  </div>
                </summary>
                <div className="space-y-2 border-t px-3 pt-3 pb-3">
                  {incident.updates.map((update) => (
                    <div
                      className="flex gap-3 text-xs"
                      key={`${update.createdAt}-${update.status}`}
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {formatTime(update.createdAt)}
                      </span>
                      <div>
                        <span className="font-medium capitalize">
                          {update.status}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          &mdash; {update.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
