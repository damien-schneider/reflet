"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Muted, Text } from "@/components/ui/typography";
import { StatusDot } from "@/features/status/components/status-dot";

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

export default function PublicStatusPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const statusData = useQuery(api.status.publicQueries.getPublicStatus, {
    orgSlug,
  });

  const incidentHistory = useQuery(
    api.status.publicQueries.getPublicIncidentHistory,
    { orgSlug }
  );

  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // We need the org ID for subscribing — get it from the org query
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const subscribe = useMutation(api.status.subscriptions.subscribe);

  const handleSubscribe = async () => {
    if (!(email.trim() && org?._id)) {
      return;
    }
    try {
      await subscribe({ organizationId: org._id, email: email.trim() });
      setSubscribeStatus("success");
      setEmail("");
    } catch {
      setSubscribeStatus("error");
    }
  };

  if (statusData === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-lg bg-muted" />
          <div className="h-12 rounded-lg bg-muted" />
          <div className="h-12 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (statusData === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <Muted>Status page not available.</Muted>
      </div>
    );
  }

  const overallStatus = statusData.overallStatus as keyof typeof statusMessages;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Overall status banner */}
      <div
        className={`mb-8 rounded-xl p-6 text-center ${statusBannerStyles[overallStatus]}`}
      >
        <div className="flex items-center justify-center gap-3">
          <StatusDot pulse size="lg" status={overallStatus} />
          <h1 className="font-semibold text-xl">
            {statusMessages[overallStatus]}
          </h1>
        </div>
      </div>

      {/* Active incidents */}
      {statusData.activeIncidents.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="font-semibold">Active Incidents</h2>
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

      {/* Monitor groups */}
      <div className="space-y-6">
        {statusData.monitorGroups.map((group) => (
          <div key={group.name}>
            <h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {group.name}
            </h2>
            <div className="space-y-3">
              {group.monitors.map((monitor) => (
                <div
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={monitor._id}
                >
                  <StatusDot
                    status={
                      monitor.status as
                        | "operational"
                        | "degraded"
                        | "major_outage"
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {monitor.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs capitalize">
                    {monitor.status === "major_outage"
                      ? "Major Outage"
                      : monitor.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Past incidents */}
      {incidentHistory && incidentHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-semibold">Past Incidents</h2>
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

      {/* Subscribe */}
      <div className="mt-8 rounded-lg border p-4">
        <Text className="mb-2 font-medium" variant="bodySmall">
          Subscribe to status updates
        </Text>
        {subscribeStatus === "success" ? (
          <p className="text-emerald-600 text-sm dark:text-emerald-400">
            Subscribed! You'll receive email notifications about incidents.
          </p>
        ) : (
          <div className="flex gap-2">
            <Input
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubscribe();
                }
              }}
              placeholder="your@email.com"
              type="email"
              value={email}
            />
            <Button
              disabled={!email.trim()}
              onClick={handleSubscribe}
              size="sm"
            >
              Subscribe
            </Button>
          </div>
        )}
        {subscribeStatus === "error" && (
          <p className="mt-1 text-red-600 text-xs">
            Failed to subscribe. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
