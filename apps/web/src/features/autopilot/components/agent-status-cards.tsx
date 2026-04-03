"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrain,
  IconChartBar,
  IconChevronRight,
  IconCode,
  IconCoin,
  IconCrown,
  IconFileText,
  IconHeadset,
  IconRocket,
  IconServer,
  IconShield,
  IconTestPipe,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================
// AGENT DEFINITIONS & HIERARCHY
// ============================================

const AGENTS = [
  { id: "pm", label: "PM", icon: IconUsers, configField: "pmEnabled" },
  { id: "cto", label: "CTO", icon: IconBrain, configField: "ctoEnabled" },
  { id: "dev", label: "Dev", icon: IconCode, configField: "devEnabled" },
  {
    id: "security",
    label: "Security",
    icon: IconShield,
    configField: "securityEnabled",
  },
  {
    id: "architect",
    label: "Architect",
    icon: IconTrendingUp,
    configField: "architectEnabled",
  },
  {
    id: "growth",
    label: "Growth",
    icon: IconRocket,
    configField: "growthEnabled",
  },
  {
    id: "support",
    label: "Support",
    icon: IconHeadset,
    configField: "supportEnabled",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: IconChartBar,
    configField: "analyticsEnabled",
  },
  {
    id: "docs",
    label: "Docs",
    icon: IconFileText,
    configField: "docsEnabled",
  },
  { id: "qa", label: "QA", icon: IconTestPipe, configField: "qaEnabled" },
  { id: "ops", label: "Ops", icon: IconServer, configField: "opsEnabled" },
  {
    id: "sales",
    label: "Sales",
    icon: IconCoin,
    configField: "salesEnabled",
  },
] as const;

/** PM's core pipeline agents */
const CORE_PIPELINE = ["pm", "cto", "dev"] as const;

/** PM's extended team */
const PM_TEAM = ["growth", "support"] as const;

/** Independent specialist agents */
const SPECIALISTS = [
  "security",
  "architect",
  "analytics",
  "docs",
  "qa",
  "ops",
  "sales",
] as const;

const ACTIVE_WINDOW = 5 * 60 * 1000;
const RECENT_WINDOW = 30 * 60 * 1000;

type AgentStatus = "active" | "error" | "idle" | "disabled";

function getAgentStatus(
  enabled: boolean,
  last: { level: string; createdAt: number } | undefined
): AgentStatus {
  if (!enabled) {
    return "disabled";
  }
  const timeSince = last ? Date.now() - last.createdAt : null;
  const hasError = last?.level === "error";
  const isRecent = timeSince !== null && timeSince < RECENT_WINDOW;
  const isActiveNow = timeSince !== null && timeSince < ACTIVE_WINDOW;

  if (hasError && isRecent) {
    return "error";
  }
  if (isActiveNow) {
    return "active";
  }
  return "idle";
}

const STATUS_STYLES: Record<
  AgentStatus,
  { card: string; dot: string; label: string }
> = {
  active: {
    card: "border-green-500/30 bg-green-500/5",
    dot: "bg-green-500 animate-pulse",
    label: "Working",
  },
  error: {
    card: "border-red-500/30 bg-red-500/5",
    dot: "bg-red-500",
    label: "Error",
  },
  idle: {
    card: "border-border bg-muted",
    dot: "bg-muted-foreground/30",
    label: "Idle",
  },
  disabled: {
    card: "border-border bg-muted opacity-50",
    dot: "bg-muted-foreground/20",
    label: "Off",
  },
};

// ============================================
// AGENT CARD COMPONENT
// ============================================

function AgentCard({
  agent,
  config,
  isAdmin,
  lastActivity,
  taskCount,
  onToggle,
}: {
  agent: (typeof AGENTS)[number];
  config: Record<string, unknown>;
  isAdmin: boolean;
  lastActivity: { level: string; createdAt: number } | undefined;
  taskCount: number;
  onToggle: (field: string, value: boolean) => void;
}) {
  const enabled = (config[agent.configField] as boolean | undefined) !== false;
  const status = getAgentStatus(enabled, lastActivity);
  const styles = STATUS_STYLES[status];

  return (
    <div className={cn("rounded-lg border p-3", styles.card)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <agent.icon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">{agent.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {taskCount > 0 && (
            <Badge className="h-5 px-1.5 text-xs" variant="secondary">
              {taskCount}
            </Badge>
          )}
          <div className={cn("size-2 rounded-full", styles.dot)} />
          <Switch
            checked={enabled}
            disabled={!isAdmin}
            onCheckedChange={(v) => onToggle(agent.configField, v)}
            size="sm"
          />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-muted-foreground text-xs">{styles.label}</span>
        {lastActivity && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-muted-foreground/60 text-xs">
                {formatDistanceToNow(lastActivity.createdAt, {
                  addSuffix: true,
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent>Last activity</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ============================================
// PIPELINE FLOW ARROW
// ============================================

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-0.5">
      <IconChevronRight className="size-3.5 text-muted-foreground/40" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AgentStatusCards({
  organizationId,
  isAdmin,
}: {
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}) {
  const activity = useQuery(api.autopilot.queries.listActivity, {
    organizationId,
    limit: 50,
  });
  const config = useQuery(api.autopilot.queries.getConfig, {
    organizationId,
  });
  const tasks = useQuery(api.autopilot.queries.listTasks, {
    organizationId,
    status: "in_progress",
  });
  const updateConfig = useMutation(api.autopilot.mutations.updateConfig);

  if (activity === undefined || config === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              className="h-20 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton
              className="h-20 w-full rounded-lg"
              key={`skel2-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  // Build agent last activity map
  const agentLastActivity = new Map<
    string,
    { level: string; createdAt: number }
  >();
  for (const entry of activity) {
    if (!agentLastActivity.has(entry.agent)) {
      agentLastActivity.set(entry.agent, {
        level: entry.level,
        createdAt: entry.createdAt,
      });
    }
  }

  // Build task count per agent
  const agentTaskCount = new Map<string, number>();
  if (tasks) {
    for (const task of tasks) {
      agentTaskCount.set(
        task.assignedAgent,
        (agentTaskCount.get(task.assignedAgent) ?? 0) + 1
      );
    }
  }

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateConfig({ configId: config._id, [field]: value });
      toast.success(value ? "Agent enabled" : "Agent disabled");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  const getAgent = (id: string) => AGENTS.find((a) => a.id === id);

  const renderCard = (agentId: string) => {
    const agent = getAgent(agentId);
    if (!agent) {
      return null;
    }
    return (
      <AgentCard
        agent={agent}
        config={config as unknown as Record<string, unknown>}
        isAdmin={isAdmin}
        key={agent.id}
        lastActivity={agentLastActivity.get(agent.id)}
        onToggle={handleToggle}
        taskCount={agentTaskCount.get(agent.id) ?? 0}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* CEO — always-on orchestrator */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-500/10 p-2">
            <IconCrown className="size-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">CEO</p>
            <p className="text-muted-foreground text-xs">
              Orchestrator — always active, coordinates all agents
            </p>
          </div>
          <Badge
            className="bg-amber-500/10 text-amber-500 text-xs"
            variant="outline"
          >
            Always On
          </Badge>
        </div>
      </div>

      {/* Core Pipeline: PM → CTO → Dev */}
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Core Pipeline
        </p>
        <div className="flex items-stretch gap-1">
          {CORE_PIPELINE.map((agentId, i) => (
            <div className="flex flex-1 items-center" key={agentId}>
              <div className="w-full">{renderCard(agentId)}</div>
              {i < CORE_PIPELINE.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>

      {/* PM's Extended Team */}
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          PM Team
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PM_TEAM.map((agentId) => renderCard(agentId))}
        </div>
      </div>

      {/* Specialist Agents */}
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Specialist Agents
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SPECIALISTS.map((agentId) => renderCard(agentId))}
        </div>
      </div>
    </div>
  );
}
