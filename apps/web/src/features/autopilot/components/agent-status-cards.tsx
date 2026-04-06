"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconCrown } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AGENTS,
  AgentCard,
  CORE_PIPELINE,
  PipelineConnector,
  PM_TEAM,
  SectionLabel,
  SPECIALISTS,
  StatusRing,
} from "@/features/autopilot/components/agent-card";

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
    {
      organizationId,
    }
  );
  const updateConfig = useMutation(api.autopilot.mutations.config.updateConfig);

  if (activity === undefined || config === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              className="h-[72px] w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              className="h-[72px] w-full rounded-lg"
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
      const agent = task.assignedAgent ?? "unassigned";
      agentTaskCount.set(agent, (agentTaskCount.get(agent) ?? 0) + 1);
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

  const renderCard = (agentId: string, index: number) => {
    const agent = getAgent(agentId);
    if (!agent) {
      return null;
    }
    const agentReadiness = readiness?.[agentId] as
      | { ready: boolean; reason?: string; actionUrl?: string }
      | undefined;
    const blockedReason =
      agentReadiness && !agentReadiness.ready
        ? {
            reason: agentReadiness.reason ?? "Prerequisites not met",
            actionUrl: agentReadiness.actionUrl,
          }
        : undefined;

    // Derive current task from in-progress work items
    const currentTask = tasks?.find(
      (t) => t.assignedAgent === agentId && t.status === "in_progress"
    );

    return (
      <AgentCard
        agent={agent}
        blockedReason={blockedReason}
        config={config as unknown as Record<string, unknown>}
        currentTaskTitle={currentTask?.title}
        index={index}
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
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.04] to-transparent p-3"
        initial={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(245,158,11,0.015)_4px,rgba(245,158,11,0.015)_5px)]" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <StatusRing size={40} status="active" />
            <IconCrown className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">CEO</span>
              <span className="text-muted-foreground/40 text-xs">
                Orchestrator
              </span>
            </div>
            <span className="font-medium text-[10px] text-amber-400/70 uppercase tracking-[0.2em]">
              Active
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400/50" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Core Pipeline: PM → CTO → Dev */}
      <div>
        <SectionLabel>Core Pipeline</SectionLabel>
        <div className="flex items-stretch gap-0">
          {CORE_PIPELINE.map((agentId, i) => (
            <div className="flex flex-1 items-center" key={agentId}>
              <div className="w-full">{renderCard(agentId, i + 1)}</div>
              {i < CORE_PIPELINE.length - 1 && <PipelineConnector />}
            </div>
          ))}
        </div>
      </div>

      {/* PM's Extended Team */}
      <div>
        <SectionLabel>PM Team</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {PM_TEAM.map((agentId, i) => renderCard(agentId, i + 4))}
        </div>
      </div>

      {/* Specialist Agents */}
      <div>
        <SectionLabel>Specialists</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SPECIALISTS.map((agentId, i) => renderCard(agentId, i + 6))}
        </div>
      </div>
    </div>
  );
}
