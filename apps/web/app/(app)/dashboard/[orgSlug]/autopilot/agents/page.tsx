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
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "pm",
    label: "PM Agent",
    icon: IconUsers,
    description: "Triages feedback, creates prioritized tasks from user input",
    capabilities: ["Feedback analysis", "Task creation", "Priority assignment"],
  },
  {
    id: "cto",
    label: "CTO Agent",
    icon: IconBrain,
    description:
      "Generates technical specifications and breaks down tasks for developers",
    capabilities: [
      "Technical specs",
      "Task breakdown",
      "Architecture decisions",
    ],
  },
  {
    id: "dev",
    label: "Dev Agent",
    icon: IconCode,
    description: "Executes coding tasks via sandbox adapters (Codex, Devin)",
    capabilities: ["Code implementation", "PR creation", "Test execution"],
  },
  {
    id: "security",
    label: "Security Agent",
    icon: IconShield,
    description:
      "Scans for vulnerabilities, dependency issues, and OWASP patterns",
    capabilities: [
      "Vulnerability scanning",
      "Dependency audit",
      "Secret detection",
    ],
  },
  {
    id: "architect",
    label: "Architect Agent",
    icon: IconTrendingUp,
    description:
      "Reviews code quality, complexity, and architecture compliance",
    capabilities: [
      "Code review",
      "Complexity analysis",
      "Standards enforcement",
    ],
  },
  {
    id: "growth",
    label: "Growth Agent",
    icon: IconRocket,
    description:
      "Generates marketing content from completed tasks for social distribution",
    capabilities: ["Content generation", "Thread discovery", "Social posting"],
  },
] as const;

function AgentCard({
  agent,
  lastActivity,
}: {
  agent: (typeof AGENTS)[number];
  lastActivity?: { level: string; message: string; createdAt: number };
}) {
  const FIVE_MINUTES = 5 * 60 * 1000;
  const isRecent =
    lastActivity && Date.now() - lastActivity.createdAt < FIVE_MINUTES;
  const hasError = lastActivity?.level === "error";
  const isWorking = isRecent && !hasError;

  let statusVariant: "destructive" | "default" | "secondary" = "secondary";
  let statusLabel = "Idle";
  if (hasError) {
    statusVariant = "destructive";
    statusLabel = "Error";
  } else if (isWorking) {
    statusVariant = "default";
    statusLabel = "Active";
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        hasError && "border-red-500/30 bg-red-500/5",
        isWorking && "border-green-500/30 bg-green-500/5",
        !(hasError || isWorking) && "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-lg p-2",
            hasError && "bg-red-500/10 text-red-500",
            isWorking && "bg-green-500/10 text-green-500",
            !(hasError || isWorking) && "bg-muted text-muted-foreground"
          )}
        >
          <agent.icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{agent.label}</h3>
            <Badge className="text-xs" variant={statusVariant}>
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            {agent.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <Badge className="text-xs" key={cap} variant="outline">
                {cap}
              </Badge>
            ))}
          </div>
          {lastActivity && (
            <p className="mt-3 text-muted-foreground text-xs">
              Last activity:{" "}
              {formatDistanceToNow(lastActivity.createdAt, {
                addSuffix: true,
              })}
              {" — "}
              {lastActivity.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentList({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.listActivity, {
    organizationId,
    limit: 50,
  });

  if (activity === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton
            className="h-32 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const agentLastActivity = new Map<
    string,
    { level: string; message: string; createdAt: number }
  >();
  for (const entry of activity) {
    if (!agentLastActivity.has(entry.agent)) {
      agentLastActivity.set(entry.agent, {
        level: entry.level,
        message: entry.message,
        createdAt: entry.createdAt,
      });
    }
  }

  return (
    <div className="space-y-4">
      {AGENTS.map((agent) => (
        <AgentCard
          agent={agent}
          key={agent.id}
          lastActivity={agentLastActivity.get(agent.id)}
        />
      ))}
    </div>
  );
}

export default function AutopilotAgentsPage() {
  const { organizationId } = useAutopilotContext();

  return (
    <div className="space-y-6">
      <div>
        <H2 variant="card">Agents</H2>
        <Muted className="mt-1">
          AI agents that autonomously manage your product development lifecycle
        </Muted>
      </div>
      <AgentList organizationId={organizationId} />
    </div>
  );
}
