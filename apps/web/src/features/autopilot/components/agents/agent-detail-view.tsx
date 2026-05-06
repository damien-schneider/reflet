"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
// Re-derive agent meta here to avoid circular imports from agent-grid-card
import {
  IconArrowLeft,
  IconBrain,
  IconCode,
  IconCoin,
  IconCrown,
  IconHeadset,
  IconRocket,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getAgentStatus,
  StatusRing,
} from "@/features/autopilot/components/agent-card";
import { cn } from "@/lib/utils";
import { AgentActivityFeed } from "./agent-activity-feed";
import { AgentConversationStream } from "./agent-conversation-stream";
import {
  type GridAgentId,
  STATUS_LABEL_COLORS,
  STATUS_LABELS,
} from "./agent-grid-card";

const AGENT_META = {
  orchestrator: {
    label: "CEO",
    icon: IconCrown,
    description: "Strategy & coordination",
    configField: null,
  },
  pm: {
    label: "PM",
    icon: IconUsers,
    description: "Product management",
    configField: "pmEnabled",
  },
  cto: {
    label: "CTO",
    icon: IconBrain,
    description: "Architecture & specs",
    configField: "ctoEnabled",
  },
  dev: {
    label: "Dev",
    icon: IconCode,
    description: "Code & shipping",
    configField: "devEnabled",
  },
  growth: {
    label: "Growth",
    icon: IconRocket,
    description: "Marketing & distribution",
    configField: "growthEnabled",
  },
  support: {
    label: "Support",
    icon: IconHeadset,
    description: "User conversations",
    configField: "supportEnabled",
  },
  sales: {
    label: "Sales",
    icon: IconCoin,
    description: "Pipeline & leads",
    configField: "salesEnabled",
  },
} as const;

export function AgentDetailView({
  organizationId,
  agentId,
  isAdmin,
  baseUrl,
}: {
  organizationId: Id<"organizations">;
  agentId: GridAgentId;
  isAdmin: boolean;
  baseUrl: string;
}) {
  const meta = AGENT_META[agentId];
  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const activity = useQuery(api.autopilot.queries.activity.listActivity, {
    organizationId,
    limit: 20,
  });
  const readiness = useQuery(
    api.autopilot.queries.dashboard.getAgentReadiness,
    { organizationId }
  );
  const updateConfig = useMutation(api.autopilot.mutations.config.updateConfig);

  if (config === undefined || activity === undefined) {
    return <DetailSkeleton />;
  }

  if (!config) {
    return null;
  }

  // Derive status
  const isOrchestrator = agentId === "orchestrator";
  const enabled = isOrchestrator
    ? true
    : (config as unknown as Record<string, unknown>)[
        meta.configField as string
      ] !== false;
  const agentReadiness = readiness?.[agentId] as
    | { ready: boolean; reason?: string }
    | undefined;
  const isBlocked =
    enabled && agentReadiness !== undefined && !agentReadiness.ready;

  // Find last activity for this agent
  const lastActivity = activity.find((e) => e.agent === agentId);
  const lastActivityData = lastActivity
    ? { level: lastActivity.level, createdAt: lastActivity.createdAt }
    : undefined;

  const status = getAgentStatus(enabled, lastActivityData, isBlocked);

  const handleToggle = async (value: boolean) => {
    if (!meta.configField) {
      return;
    }
    try {
      await updateConfig({
        configId: config._id,
        [meta.configField]: value,
      });
      toast.success(value ? "Agent enabled" : "Agent disabled");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          render={<Link href={`${baseUrl}/agents`} />}
          size="icon"
          variant="ghost"
        >
          <IconArrowLeft className="size-4" />
        </Button>

        <div className="relative">
          <StatusRing size={48} status={status} />
          <meta.icon
            className={cn(
              "absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2",
              STATUS_LABEL_COLORS[status]
            )}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl tracking-tight">{meta.label}</h1>
            <span
              className={cn(
                "font-semibold text-[11px] uppercase tracking-[0.15em]",
                STATUS_LABEL_COLORS[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{meta.description}</p>
        </div>

        {/* Toggle — only for non-CEO agents, admin only */}
        {!isOrchestrator && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={enabled}
              disabled={!isAdmin}
              onCheckedChange={handleToggle}
            />
          </div>
        )}
      </motion.div>

      {/* Blocked banner */}
      {isBlocked && agentReadiness?.reason && (
        <motion.div
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-600 text-sm"
          initial={{ opacity: 0, height: 0 }}
        >
          {agentReadiness.reason}
        </motion.div>
      )}

      {/* Two-column layout: Activity Feed + Conversation */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-h-[400px]">
          <AgentActivityFeed
            agentId={agentId}
            organizationId={organizationId}
          />
        </div>
        <div className="min-h-[400px]">
          <AgentConversationStream
            agentId={agentId}
            organizationId={organizationId}
          />
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 rounded-md" />
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
