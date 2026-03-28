"use client";

import { ArrowSquareOut, Heartbeat, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { H1, Muted, Text } from "@/components/ui/typography";
import { AddMonitorInput } from "@/features/status/components/add-monitor-input";
import { IncidentCard } from "@/features/status/components/incident-card";
import { IncidentComposer } from "@/features/status/components/incident-composer";
import { MonitorCard } from "@/features/status/components/monitor-card";
import { StatusDot } from "@/features/status/components/status-dot";
import { GitHubConnectHint } from "@/shared/components/github-connect-hint";

const statusLabels = {
  operational: "All Systems Operational",
  degraded: "Degraded Performance",
  major_outage: "Major Outage",
  no_monitors: "No Monitors",
} as const;

const getStatusBannerClass = (status: string): string => {
  if (status === "operational") {
    return "bg-emerald-50 dark:bg-emerald-950/30";
  }
  if (status === "degraded") {
    return "bg-amber-50 dark:bg-amber-950/30";
  }
  if (status === "major_outage") {
    return "bg-red-50 dark:bg-red-950/30";
  }
  return "bg-muted";
};

export default function StatusDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const monitors = useQuery(
    api.status.monitors.listMonitors,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const aggregateStatus = useQuery(
    api.status.monitors.getAggregateStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const uptimeBars = useQuery(
    api.status.monitors.getMonitorsUptimeBars,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const activeIncidents = useQuery(
    api.status.incidents.getActiveIncidents,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const billingStatus = useQuery(
    api.billing.queries.getStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isPro = billingStatus?.tier === "pro";

  const createMonitor = useMutation(api.status.monitors.createMonitor);
  const updateMonitor = useMutation(api.status.monitors.updateMonitor);
  const deleteMonitor = useMutation(api.status.monitors.deleteMonitor);
  const createIncident = useMutation(api.status.incidents.createIncident);
  const postIncidentUpdate = useMutation(
    api.status.incidents.postIncidentUpdate
  );

  const [showComposer, setShowComposer] = useState(false);

  if (!org) {
    return null;
  }

  const handleAddMonitor = async (url: string, name: string) => {
    await createMonitor({
      organizationId: org._id,
      name,
      url,
    });
  };

  const handlePauseMonitor = async (monitorId: Id<"statusMonitors">) => {
    await updateMonitor({ monitorId, status: "paused" });
  };

  const handleResumeMonitor = async (monitorId: Id<"statusMonitors">) => {
    await updateMonitor({ monitorId, status: "operational" });
  };

  const handleDeleteMonitor = async (monitorId: Id<"statusMonitors">) => {
    await deleteMonitor({ monitorId });
  };

  const handleUpdateInterval = async (
    monitorId: Id<"statusMonitors">,
    checkIntervalMinutes: number
  ) => {
    await updateMonitor({ monitorId, checkIntervalMinutes });
  };

  const handleCreateIncident = async (data: {
    title: string;
    severity: "minor" | "major" | "critical";
    affectedMonitorIds: Id<"statusMonitors">[];
    message: string;
  }) => {
    await createIncident({
      organizationId: org._id,
      ...data,
    });
    setShowComposer(false);
  };

  const handlePostUpdate = async (
    incidentId: Id<"statusIncidents">,
    status: "investigating" | "identified" | "monitoring" | "resolved",
    message: string
  ) => {
    await postIncidentUpdate({ incidentId, status, message });
  };

  const hasMonitors = monitors && monitors.length > 0;
  const status = aggregateStatus?.status ?? "no_monitors";

  // Empty state
  if (!hasMonitors && monitors !== undefined) {
    return (
      <div className="admin-container">
        <div className="mb-8">
          <H1>Status</H1>
          <Text variant="bodySmall">
            Monitor your services and show real-time health to your users
          </Text>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Heartbeat className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="font-semibold text-lg">
            Your users shouldn't have to guess if things are working
          </h2>
          <Muted className="mt-1 mb-6">
            Add your first monitor to start tracking uptime
          </Muted>
          <div className="w-full max-w-md space-y-4">
            <GitHubConnectHint
              description="endpoints and services from your codebase"
              organizationId={org._id}
              orgSlug={orgSlug}
            />
            <AddMonitorInput
              onAdd={handleAddMonitor}
              organizationId={org._id}
            />
          </div>
        </div>
      </div>
    );
  }

  // Group monitors by groupName
  const grouped = new Map<string, NonNullable<typeof monitors>>();
  for (const m of monitors ?? []) {
    const group = m.groupName ?? "Ungrouped";
    const existing = grouped.get(group) ?? [];
    existing.push(m);
    grouped.set(group, existing);
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <H1>Status</H1>
          <Text variant="bodySmall">
            Monitor your services and show real-time health to your users
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/status`} target="_blank">
            <Button size="sm" variant="outline">
              <ArrowSquareOut className="mr-1.5 h-4 w-4" />
              Public Page
            </Button>
          </Link>
          <Button
            onClick={() => setShowComposer(!showComposer)}
            size="sm"
            variant={showComposer ? "outline" : "destructive"}
          >
            <Warning className="mr-1.5 h-4 w-4" />
            {showComposer ? "Cancel" : "Report Incident"}
          </Button>
        </div>
      </div>

      {/* Overall status banner */}
      <div
        className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${getStatusBannerClass(status)}`}
      >
        <StatusDot pulse size="lg" status={status} />
        <span className="font-medium text-sm">{statusLabels[status]}</span>
        {aggregateStatus?.monitorCount !== undefined && (
          <span className="text-muted-foreground text-xs">
            {aggregateStatus.monitorCount} monitors
          </span>
        )}
      </div>

      {/* Incident composer */}
      {showComposer && (
        <div className="mb-6">
          <IncidentComposer
            monitors={
              monitors?.map((m) => ({ _id: m._id, name: m.name })) ?? []
            }
            onCancel={() => setShowComposer(false)}
            onSubmit={handleCreateIncident}
          />
        </div>
      )}

      {/* Active incidents */}
      {activeIncidents && activeIncidents.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="font-semibold text-sm">Active Incidents</h2>
          {activeIncidents.map((incident) => (
            <IncidentCard
              incident={incident}
              key={incident._id}
              onPostUpdate={handlePostUpdate}
            />
          ))}
        </div>
      )}

      {/* Monitor groups */}
      <div className="space-y-6">
        {[...grouped.entries()].map(([groupName, groupMonitors]) => (
          <div key={groupName}>
            {grouped.size > 1 && (
              <h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {groupName}
              </h2>
            )}
            <div className="space-y-2">
              {groupMonitors.map((monitor) => (
                <MonitorCard
                  isPro={isPro}
                  key={monitor._id}
                  monitor={monitor}
                  onDelete={handleDeleteMonitor}
                  onPause={handlePauseMonitor}
                  onResume={handleResumeMonitor}
                  onUpdateInterval={handleUpdateInterval}
                  uptimeData={uptimeBars?.[monitor._id]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add monitor */}
      <div className="mt-4">
        <AddMonitorInput onAdd={handleAddMonitor} organizationId={org._id} />
      </div>
    </div>
  );
}
