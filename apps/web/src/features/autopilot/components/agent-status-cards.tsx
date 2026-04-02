"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrain,
  IconCode,
  IconRocket,
  IconShield,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "pm",
    label: "PM Agent",
    icon: IconUsers,
    description: "Product triage",
  },
  {
    id: "cto",
    label: "CTO Agent",
    icon: IconBrain,
    description: "Technical specs",
  },
  {
    id: "dev",
    label: "Dev Agent",
    icon: IconCode,
    description: "Code execution",
  },
  {
    id: "security",
    label: "Security",
    icon: IconShield,
    description: "Vulnerability scan",
  },
  {
    id: "architect",
    label: "Architect",
    icon: IconTrendingUp,
    description: "Code review",
  },
  {
    id: "growth",
    label: "Growth",
    icon: IconRocket,
    description: "Content generation",
  },
] as const;

export function AgentStatusCards({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.listActivity, {
    organizationId,
    limit: 20,
  });

  if (activity === undefined) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
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

  const FIVE_MINUTES = 5 * 60 * 1000;
  const now = Date.now();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {AGENTS.map((agent) => {
        const last = agentLastActivity.get(agent.id);
        const isRecent = last && now - last.createdAt < FIVE_MINUTES;
        const hasError = last?.level === "error";
        const isWorking = isRecent && !hasError;

        let statusColor = "border-border bg-card";
        let statusLabel = "Idle";
        let dotColor = "bg-muted-foreground/30";

        if (hasError) {
          statusColor = "border-red-500/30 bg-red-500/5";
          statusLabel = "Error";
          dotColor = "bg-red-500";
        } else if (isWorking) {
          statusColor = "border-green-500/30 bg-green-500/5";
          statusLabel = "Working";
          dotColor = "bg-green-500";
        }

        return (
          <div
            className={cn("rounded-lg border p-3", statusColor)}
            key={agent.id}
          >
            <div className="flex items-center justify-between">
              <agent.icon className="size-4 text-muted-foreground" />
              <div className={cn("size-2 rounded-full", dotColor)} />
            </div>
            <p className="mt-2 font-medium text-sm">{agent.label}</p>
            <p className="text-muted-foreground text-xs">{statusLabel}</p>
          </div>
        );
      })}
    </div>
  );
}
