"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrain,
  IconChartBar,
  IconCode,
  IconCoin,
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
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
    dot: "bg-green-500",
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
  const updateConfig = useMutation(api.autopilot.mutations.updateConfig);

  if (activity === undefined || config === undefined) {
    return (
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (!config) {
    return null;
  }

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

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateConfig({ configId: config._id, [field]: value });
      toast.success(value ? "Agent enabled" : "Agent disabled");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-4xl sm:grid-cols-3 lg:grid-cols-6">
      {AGENTS.map((agent) => {
        const enabled =
          (config[agent.configField as keyof typeof config] as boolean) ??
          false;
        const status = getAgentStatus(enabled, agentLastActivity.get(agent.id));
        const styles = STATUS_STYLES[status];

        return (
          <div className={cn("rounded-lg p-3", styles.card)} key={agent.id}>
            <div className="flex items-center justify-between">
              <agent.icon className="size-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <div className={cn("size-2 rounded-full", styles.dot)} />
                <Switch
                  checked={enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => handleToggle(agent.configField, v)}
                  size="sm"
                />
              </div>
            </div>
            <p className="mt-2 font-medium text-sm">{agent.label}</p>
            <p className="text-muted-foreground text-xs">{styles.label}</p>
          </div>
        );
      })}
    </div>
  );
}
