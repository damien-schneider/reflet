"use client";

import {
  PageActions,
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { H2, Large, Muted, Text } from "@/components/ui/typography";
import { ResponseTimeChart } from "@/features/status/components/response-time-chart";
import { StatusDot } from "@/features/status/components/status-dot";
import { StatusSubscribe } from "@/features/status/components/status-subscribe";
import { UptimeBar } from "@/features/status/components/uptime-bar";

const statusMessages = {
  degraded: "Some Systems Experiencing Issues",
  major_outage: "Major Service Disruption",
  operational: "All Systems Operational",
} as const;

const statusBannerStyles = {
  degraded: "bg-warning-subtle text-warning-text",
  major_outage: "bg-destructive-subtle text-destructive-text",
  operational: "bg-success-subtle text-success-text",
} as const;

const statusLabelStyles = {
  degraded: "text-warning-text",
  major_outage: "text-destructive-text",
  operational: "text-success-text",
} as const;

const statusLabelText = {
  degraded: "Degraded",
  major_outage: "Major Outage",
  operational: "Operational",
} as const;

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

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

export default function PublicStatusPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const statusData = useQuery(api.status.publicQueries.getPublicStatus, {
    orgSlug,
  });

  const uptimeBars = useQuery(api.status.publicQueries.getPublicUptimeBars, {
    orgSlug,
  });

  const incidentHistory = useQuery(
    api.status.publicQueries.getPublicIncidentHistory,
    { orgSlug }
  );

  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (statusData === undefined) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody>
          <div className="animate-pulse space-y-4">
            <div className="h-16 rounded-lg bg-muted" />
            <div className="h-24 rounded-lg bg-muted" />
            <div className="h-24 rounded-lg bg-muted" />
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (statusData === null) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody contentClassName="text-center">
          <Muted>Status page not available.</Muted>
        </PageBody>
      </PageLayout>
    );
  }

  const overallStatus = statusData.overallStatus as keyof typeof statusMessages;

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>System Status</PageTitle>
        <PageDescription>
          Current status and uptime for all services.
        </PageDescription>
        {org && (
          <PageActions>
            <StatusSubscribe organizationId={org._id} />
          </PageActions>
        )}
      </PageHeader>
      <PageBody>
        <div
          className={`mb-8 rounded-xl p-6 text-center ${statusBannerStyles[overallStatus]}`}
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
                className="rounded-lg border border-destructive/30 p-4"
                key={incident._id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{incident.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-destructive-subtle px-2 py-0.5 text-destructive-text capitalize">
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
                          className={`font-medium text-sm ${statusLabelStyles[monitorStatus]}`}
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
      </PageBody>
    </PageLayout>
  );
}
