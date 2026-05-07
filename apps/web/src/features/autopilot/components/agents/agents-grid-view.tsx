"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AgentStatus,
  getAgentStatus,
} from "@/features/autopilot/components/agent-card";
import { cn } from "@/lib/utils";
import type { GridAgentId } from "./agent-grid-card";
import { AGENT_META, GRID_AGENT_IDS, STATUS_LABELS } from "./agent-grid-card";

interface AgentGroup {
  agents: readonly GridAgentId[];
  description: string;
  id: string;
  label: string;
}

interface AgentActivity {
  createdAt: number;
  level: string;
}

const AGENT_GROUPS: readonly AgentGroup[] = [
  {
    id: "command",
    label: "Command",
    description: "Strategy, approvals, and cross-agent coordination",
    agents: ["orchestrator"],
  },
  {
    id: "pipeline",
    label: "Core Pipeline",
    description: "Turns signals into scoped work and shipped changes",
    agents: ["pm", "cto", "dev"],
  },
  {
    id: "specialists",
    label: "Specialists",
    description: "Growth, support, and sales loops around the product",
    agents: ["growth", "support", "sales"],
  },
];

const STATUS_STYLES: Record<
  AgentStatus,
  {
    badge: string;
    border: string;
    dot: string;
    icon: string;
    text: string;
  }
> = {
  active: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/40 bg-emerald-500/5",
    dot: "bg-emerald-500",
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  blocked: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    border: "border-amber-500/40 bg-amber-500/5",
    dot: "bg-amber-500",
    icon: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
  error: {
    badge: "bg-red-500/10 text-red-700 dark:text-red-300",
    border: "border-red-500/40 bg-red-500/5",
    dot: "bg-red-500",
    icon: "bg-red-500/10 text-red-700 dark:text-red-300",
    text: "text-red-700 dark:text-red-300",
  },
  idle: {
    badge: "bg-muted text-muted-foreground",
    border: "border-border/60 bg-card",
    dot: "bg-muted-foreground/30",
    icon: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
  },
  disabled: {
    badge: "bg-muted/60 text-muted-foreground/60",
    border: "border-border/40 bg-muted/20 opacity-70",
    dot: "bg-muted-foreground/20",
    icon: "bg-muted/60 text-muted-foreground/50",
    text: "text-muted-foreground/60",
  },
};

const SUMMARY_STATUSES: readonly AgentStatus[] = [
  "active",
  "blocked",
  "error",
  "idle",
  "disabled",
];

export function AgentsGridView({
  organizationId,
  baseUrl,
}: {
  organizationId: Id<"organizations">;
  baseUrl: string;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listActivity, {
    organizationId,
    limit: 50,
  });
  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const tasks = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId,
    status: "in_progress",
  });
  const readiness = useQuery(
    api.autopilot.queries.dashboard.getAgentReadiness,
    { organizationId }
  );

  if (
    activity === undefined ||
    config === undefined ||
    tasks === undefined ||
    readiness === undefined
  ) {
    return <AgentsOverviewSkeleton />;
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="max-w-xl space-y-3">
          <h2 className="font-semibold text-lg">Autopilot is not configured</h2>
          <p className="text-muted-foreground text-sm">
            Finish setup before reviewing agent readiness.
          </p>
          <Button render={<Link href={`${baseUrl}/settings`} />} size="sm">
            Open settings
          </Button>
        </div>
      </div>
    );
  }

  const agentLastActivity = new Map<string, AgentActivity>();
  for (const entry of activity) {
    if (!agentLastActivity.has(entry.agent)) {
      agentLastActivity.set(entry.agent, {
        level: entry.level,
        createdAt: entry.createdAt,
      });
    }
  }

  const agentTaskCount = new Map<string, number>();
  const agentCurrentTask = new Map<string, string>();
  for (const task of tasks) {
    const agent = task.assignedAgent ?? "unassigned";
    agentTaskCount.set(agent, (agentTaskCount.get(agent) ?? 0) + 1);
    if (!agentCurrentTask.has(agent)) {
      agentCurrentTask.set(agent, task.title);
    }
  }

  const getEnabled = (agentId: GridAgentId): boolean => {
    if (agentId === "orchestrator") {
      return true;
    }
    if (agentId === "pm") {
      return config.pmEnabled !== false;
    }
    if (agentId === "cto") {
      return config.ctoEnabled !== false;
    }
    if (agentId === "dev") {
      return config.devEnabled !== false;
    }
    if (agentId === "growth") {
      return config.growthEnabled !== false;
    }
    if (agentId === "support") {
      return config.supportEnabled !== false;
    }
    return config.salesEnabled !== false;
  };

  const getBlocked = (agentId: GridAgentId): boolean => {
    if (agentId === "orchestrator") {
      return false;
    }
    const agentReadiness = readiness[agentId];
    return getEnabled(agentId) && agentReadiness?.ready === false;
  };

  const getStatus = (agentId: GridAgentId): AgentStatus =>
    getAgentStatus(
      getEnabled(agentId),
      agentLastActivity.get(agentId),
      getBlocked(agentId)
    );

  const activeCount = GRID_AGENT_IDS.filter(
    (agentId) => getStatus(agentId) === "active"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <div>
          <p className="font-semibold text-sm">Agent readiness</p>
          <p className="text-muted-foreground text-xs">
            {activeCount} of {GRID_AGENT_IDS.length} agents active now
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUMMARY_STATUSES.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </div>

      {AGENT_GROUPS.map((group) => (
        <section className="space-y-3" key={group.id}>
          <div>
            <h2 className="font-semibold text-base">{group.label}</h2>
            <p className="text-muted-foreground text-sm">{group.description}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.agents.map((agentId) => (
              <AgentTile
                agentId={agentId}
                currentTaskTitle={agentCurrentTask.get(agentId)}
                href={`${baseUrl}/agents/${agentId}`}
                key={agentId}
                lastActivity={agentLastActivity.get(agentId)}
                readinessReason={readiness[agentId]?.reason}
                status={getStatus(agentId)}
                taskCount={agentTaskCount.get(agentId) ?? 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AgentTile({
  agentId,
  currentTaskTitle,
  href,
  lastActivity,
  readinessReason,
  status,
  taskCount,
}: {
  agentId: GridAgentId;
  currentTaskTitle?: string;
  href: string;
  lastActivity?: AgentActivity;
  readinessReason?: string;
  status: AgentStatus;
  taskCount: number;
}) {
  const meta = AGENT_META[agentId];
  const styles = STATUS_STYLES[status];

  return (
    <Link
      aria-label={`${meta.label}: ${STATUS_LABELS[status]}`}
      className={cn(
        "group flex min-h-36 flex-col rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40",
        styles.border
      )}
      href={href}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            styles.icon
          )}
        >
          <meta.icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm">{meta.label}</h3>
              <p className="truncate text-muted-foreground text-xs">
                {meta.description}
              </p>
            </div>
            <Badge className={cn("shrink-0", styles.badge)}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2 rounded-full", styles.dot)} />
          <span
            className={cn("min-w-0 flex-1 truncate font-medium", styles.text)}
          >
            {getStatusMessage({
              currentTaskTitle,
              readinessReason,
              status,
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <span>
            {taskCount} active task{taskCount === 1 ? "" : "s"}
          </span>
          {lastActivity ? (
            <span>
              Last activity{" "}
              {formatDistanceToNow(lastActivity.createdAt, {
                addSuffix: true,
              })}
            </span>
          ) : (
            <span>No activity yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getStatusMessage({
  currentTaskTitle,
  readinessReason,
  status,
}: {
  currentTaskTitle?: string;
  readinessReason?: string;
  status: AgentStatus;
}) {
  if (status === "active") {
    return currentTaskTitle ?? "Working";
  }
  if (status === "blocked") {
    return readinessReason ?? "Action required";
  }
  if (status === "error") {
    return "Needs attention";
  }
  if (status === "idle") {
    return "Ready";
  }
  return "Disabled";
}

function StatusPill({ status }: { status: AgentStatus }) {
  const styles = STATUS_STYLES[status];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 text-xs">
      <span aria-hidden className={cn("size-1.5 rounded-full", styles.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function AgentsOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-xl" />
      {AGENT_GROUPS.map((group) => (
        <div className="space-y-3" key={group.id}>
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.agents.map((agentId) => (
              <Skeleton className="h-36 rounded-xl" key={agentId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
