"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowSquareOut, Pulse, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { use, useState } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { AddMonitorInput } from "@/features/status/components/add-monitor-input";
import { IncidentComposer } from "@/features/status/components/incident-composer";
import { GitHubConnectHint } from "@/shared/components/github-connect-hint";
import {
  ActiveIncidents,
  MonitorGroups,
  OverallStatusBanner,
} from "./status-dashboard-sections";

type Monitor = FunctionReturnType<
  typeof api.status.monitors.listMonitors
>[number];

const SKELETON_MONITOR_KEYS = ["first", "second", "third"] as const;

function StatusDashboardSkeleton() {
  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>Status</PageTitle>
      </PageHeader>
      <PageBody>
        <div aria-busy className="space-y-6">
          <Skeleton className="h-14 w-full rounded-(--radius-panel)" />
          {SKELETON_MONITOR_KEYS.map((key) => (
            <div className="space-y-3" key={key}>
              <Skeleton className="h-18 w-full rounded-(--radius-panel)" />
              <Skeleton className="h-36 w-full rounded-(--radius-panel)" />
            </div>
          ))}
        </div>
      </PageBody>
    </PageLayout>
  );
}

export default function StatusDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === null) {
    return <OrgNotFound />;
  }

  if (org === undefined) {
    return <StatusDashboardSkeleton />;
  }

  return <StatusDashboard organizationId={org._id} orgSlug={orgSlug} />;
}

function StatusDashboard({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const monitors = useQuery(api.status.monitors.listMonitors, {
    organizationId,
  });
  const createMonitor = useMutation(api.status.monitors.createMonitor);

  if (monitors === undefined) {
    return <StatusDashboardSkeleton />;
  }

  const handleAddMonitor = async (url: string, name: string) => {
    await createMonitor({ name, organizationId, url });
  };

  if (monitors.length === 0) {
    return (
      <NoMonitorsState
        onAddMonitor={handleAddMonitor}
        organizationId={organizationId}
        orgSlug={orgSlug}
      />
    );
  }

  return (
    <MonitorsDashboard
      monitors={monitors}
      onAddMonitor={handleAddMonitor}
      scope={{ organizationId, orgSlug }}
    />
  );
}

function NoMonitorsState({
  onAddMonitor,
  organizationId,
  orgSlug,
}: {
  onAddMonitor: (url: string, name: string) => Promise<void>;
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>Status</PageTitle>
      </PageHeader>
      <PageBody>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Pulse aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No monitors yet</EmptyTitle>
            <EmptyDescription>
              Add a URL and we’ll check it around the clock, then publish its
              uptime on your status page.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="w-full max-w-md space-y-4">
            <AddMonitorInput onAdd={onAddMonitor} />
            <GitHubConnectHint
              description="Reflet suggests endpoints to monitor from your codebase."
              organizationId={organizationId}
              orgSlug={orgSlug}
            />
          </EmptyContent>
        </Empty>
      </PageBody>
    </PageLayout>
  );
}

function MonitorsDashboard({
  monitors,
  onAddMonitor,
  scope,
}: {
  monitors: Monitor[];
  onAddMonitor: (url: string, name: string) => Promise<void>;
  scope: { organizationId: Id<"organizations">; orgSlug: string };
}) {
  const { organizationId, orgSlug } = scope;
  const createIncident = useMutation(api.status.incidents.createIncident);
  const [showComposer, setShowComposer] = useState(false);

  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>Status</PageTitle>
        <PageActions className="flex-wrap">
          <ButtonLink
            href={`/${orgSlug}/status`}
            rel="noopener"
            size="sm"
            target="_blank"
            variant="surface"
          >
            <ArrowSquareOut />
            View public page
          </ButtonLink>
          <Button
            aria-expanded={showComposer}
            onClick={() => setShowComposer(!showComposer)}
            size="sm"
            variant="surface"
          >
            <Warning />
            Report incident
          </Button>
        </PageActions>
      </PageHeader>
      <PageBody>
        <div className="space-y-8">
          <OverallStatusBanner organizationId={organizationId} />
          {showComposer && (
            <IncidentComposer
              monitors={monitors.map((m) => ({ _id: m._id, name: m.name }))}
              onCancel={() => setShowComposer(false)}
              onSubmit={async (data) => {
                await createIncident({ organizationId, ...data });
                setShowComposer(false);
              }}
            />
          )}
          <ActiveIncidents organizationId={organizationId} />
          <MonitorGroups monitors={monitors} organizationId={organizationId} />
          <AddMonitorInput onAdd={onAddMonitor} />
        </div>
      </PageBody>
    </PageLayout>
  );
}
