"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageActions,
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Pulse } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  formatLatency,
  MONITOR_STATUS_LABEL,
  MONITOR_STATUS_TEXT_CLASS,
  OVERALL_STATUS_BANNER_CLASS,
  OVERALL_STATUS_MESSAGE,
} from "../lib/status-meta";
import { MaintenanceList } from "./maintenance-list";
import { ActiveIncidents, PastIncidents } from "./public-incidents";
import { ResponseTimeChart } from "./response-time-chart";
import { StatusDot } from "./status-dot";
import { StatusSubscribe } from "./status-subscribe";
import { UptimeBar, UptimeLegend } from "./uptime-bar";

const SKELETON_MONITOR_KEYS = ["first", "second"] as const;

export function PublicStatusSkeleton() {
  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
      </PageHeader>
      <PageBody>
        <div aria-busy className="space-y-8">
          <Skeleton className="h-16 w-full rounded-(--radius-panel)" />
          {SKELETON_MONITOR_KEYS.map((key) => (
            <div className="space-y-3" key={key}>
              <Skeleton className="h-12 w-full rounded-(--radius-panel)" />
              <Skeleton className="h-36 w-full rounded-(--radius-panel)" />
            </div>
          ))}
        </div>
      </PageBody>
    </PageLayout>
  );
}

export function PublicStatusUnavailable() {
  return (
    <PageLayout scroll="page" width="content">
      <PageBody>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Pulse aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Status page unavailable</EmptyTitle>
            <EmptyDescription>
              This organization hasn’t published a status page.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageBody>
    </PageLayout>
  );
}

export function PublicStatusView({ orgSlug }: { orgSlug: string }) {
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
    return <PublicStatusSkeleton />;
  }

  if (statusData === null) {
    return <PublicStatusUnavailable />;
  }

  const { overallStatus } = statusData;

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>{statusData.orgName} status</PageTitle>
        <PageDescription>
          Live status and 90-day uptime for every service.
        </PageDescription>
        {org && (
          <PageActions>
            <StatusSubscribe organizationId={org._id} />
          </PageActions>
        )}
      </PageHeader>
      <PageBody>
        <div className="space-y-10">
          <output
            className={cn(
              "flex items-center justify-center gap-3 rounded-(--radius-panel) p-5 font-medium text-body-lg",
              OVERALL_STATUS_BANNER_CLASS[overallStatus]
            )}
          >
            <StatusDot pulse size="lg" status={overallStatus} />
            {OVERALL_STATUS_MESSAGE[overallStatus]}
          </output>

          <ActiveIncidents incidents={statusData.activeIncidents} />

          <MaintenanceList maintenances={statusData.maintenances} />

          <section aria-label="Services" className="space-y-8">
            {statusData.monitorGroups.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No services are being monitored yet.
              </p>
            ) : (
              <UptimeLegend />
            )}
            {statusData.monitorGroups.map((group) => (
              <div className="space-y-4" key={group.name}>
                <h2 className="font-semibold text-heading-4">{group.name}</h2>
                {group.monitors.map((monitor) => {
                  const uptimeData = uptimeBars?.[monitor._id];

                  return (
                    <div className="space-y-3" key={monitor._id}>
                      <div className="flex items-center gap-3 px-1">
                        <StatusDot status={monitor.status} />
                        <h3
                          className="min-w-0 flex-1 truncate font-medium text-sm"
                          title={monitor.name}
                        >
                          {monitor.name}
                        </h3>
                        {monitor.lastResponseTimeMs !== undefined && (
                          <span className="hidden text-muted-foreground text-xs tabular-nums sm:inline">
                            {formatLatency(monitor.lastResponseTimeMs)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-medium text-sm",
                            MONITOR_STATUS_TEXT_CLASS[monitor.status]
                          )}
                        >
                          {MONITOR_STATUS_LABEL[monitor.status]}
                        </span>
                      </div>
                      {uptimeBars === undefined ? (
                        <Skeleton className="h-36 w-full rounded-(--radius-panel)" />
                      ) : (
                        <UptimeBar
                          days={uptimeData?.days ?? []}
                          overallUptime={uptimeData?.overallUptime}
                        />
                      )}
                      <ResponseTimeChart
                        lastResponseTimeMs={monitor.lastResponseTimeMs}
                        latencyByHour={monitor.latencyByHour}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          {incidentHistory && <PastIncidents incidents={incidentHistory} />}
        </div>
      </PageBody>
    </PageLayout>
  );
}
