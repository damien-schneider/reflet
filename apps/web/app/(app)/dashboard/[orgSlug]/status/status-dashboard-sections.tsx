"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { IncidentCard } from "@/features/status/components/incident-card";
import { MonitorCard } from "@/features/status/components/monitor-card";
import { StatusDot } from "@/features/status/components/status-dot";
import {
  OVERALL_STATUS_BANNER_CLASS,
  OVERALL_STATUS_MESSAGE,
} from "@/features/status/lib/status-meta";
import { cn } from "@/lib/utils";

type Monitor = FunctionReturnType<
  typeof api.status.monitors.listMonitors
>[number];

export function OverallStatusBanner({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const aggregateStatus = useQuery(api.status.monitors.getAggregateStatus, {
    organizationId,
  });
  const status = aggregateStatus?.status ?? "no_monitors";

  return (
    <output
      className={cn(
        "flex items-center gap-3 rounded-(--radius-panel) p-4 font-medium text-sm",
        OVERALL_STATUS_BANNER_CLASS[status]
      )}
    >
      <StatusDot pulse size="lg" status={status} />
      {aggregateStatus === undefined ? (
        <Skeleton className="h-4 w-40" />
      ) : (
        OVERALL_STATUS_MESSAGE[status]
      )}
      {aggregateStatus && (
        <span className="ml-auto font-normal text-xs tabular-nums opacity-80">
          {aggregateStatus.monitorCount}{" "}
          {aggregateStatus.monitorCount === 1 ? "monitor" : "monitors"}
        </span>
      )}
    </output>
  );
}

export function ActiveIncidents({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activeIncidents = useQuery(api.status.incidents.getActiveIncidents, {
    organizationId,
  });
  const postIncidentUpdate = useMutation(
    api.status.incidents.postIncidentUpdate
  );

  if (!activeIncidents || activeIncidents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="active-incidents" className="space-y-3">
      <h2 className="font-semibold text-heading-4" id="active-incidents">
        Active incidents
      </h2>
      {activeIncidents.map((incident) => (
        <IncidentCard
          incident={incident}
          key={incident._id}
          onPostUpdate={async (incidentId, status, message) => {
            await postIncidentUpdate({ incidentId, message, status });
          }}
        />
      ))}
    </section>
  );
}

export function MonitorGroups({
  monitors,
  organizationId,
}: {
  monitors: Monitor[];
  organizationId: Id<"organizations">;
}) {
  const uptimeBars = useQuery(api.status.monitors.getMonitorsUptimeBars, {
    organizationId,
  });
  const billingStatus = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  const updateMonitor = useMutation(api.status.monitors.updateMonitor);
  const deleteMonitor = useMutation(api.status.monitors.deleteMonitor);
  const isPro = billingStatus?.tier === "pro";

  const grouped = new Map<string, Monitor[]>();
  for (const m of monitors) {
    const group = m.groupName ?? "Ungrouped";
    const existing = grouped.get(group);
    if (existing) {
      existing.push(m);
    } else {
      grouped.set(group, [m]);
    }
  }
  const hasGroups = grouped.size > 1;

  return [...grouped.entries()].map(([groupName, groupMonitors]) => (
    <section
      aria-label={hasGroups ? undefined : "Monitors"}
      className="space-y-4"
      key={groupName}
    >
      {hasGroups && (
        <h2 className="font-semibold text-heading-4">{groupName}</h2>
      )}
      {groupMonitors.map((monitor) => (
        <MonitorCard
          isPro={isPro}
          key={monitor._id}
          monitor={monitor}
          onDelete={(monitorId) => deleteMonitor({ monitorId })}
          onPause={(monitorId) =>
            updateMonitor({ monitorId, status: "paused" })
          }
          onResume={(monitorId) =>
            updateMonitor({ monitorId, status: "operational" })
          }
          onUpdateInterval={(monitorId, checkIntervalMinutes) =>
            updateMonitor({ checkIntervalMinutes, monitorId })
          }
          uptimeData={uptimeBars?.[monitor._id]}
        />
      ))}
    </section>
  ));
}
