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
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const AGENT_GROUPS = [
  {
    title: "Core Pipeline",
    description: "Product → specs → code → review",
    agents: [
      {
        id: "pm",
        label: "PM",
        icon: IconUsers,
        configField: "pmEnabled",
        description: "Triages feedback, creates prioritized tasks",
        capabilities: [
          "Feedback analysis",
          "Task creation",
          "Priority assignment",
        ],
        accent: "blue",
      },
      {
        id: "cto",
        label: "CTO",
        icon: IconBrain,
        configField: "ctoEnabled",
        description: "Generates technical specs and task breakdowns",
        capabilities: [
          "Technical specs",
          "Task breakdown",
          "Architecture decisions",
        ],
        accent: "purple",
      },
      {
        id: "dev",
        label: "Dev",
        icon: IconCode,
        configField: "devEnabled",
        description: "Executes coding tasks via sandbox adapters",
        capabilities: ["Code implementation", "PR creation", "Test execution"],
        accent: "green",
      },
      {
        id: "architect",
        label: "Architect",
        icon: IconTrendingUp,
        configField: "architectEnabled",
        description: "Reviews code quality and architecture compliance",
        capabilities: [
          "Code review",
          "Complexity analysis",
          "Standards enforcement",
        ],
        accent: "orange",
      },
    ],
  },
  {
    title: "Quality & Security",
    description: "Testing, scanning, monitoring",
    agents: [
      {
        id: "security",
        label: "Security",
        icon: IconShield,
        configField: "securityEnabled",
        description: "Scans for vulnerabilities and dependency issues",
        capabilities: [
          "Vulnerability scanning",
          "Dependency audit",
          "Secret detection",
        ],
        accent: "red",
      },
      {
        id: "qa",
        label: "QA",
        icon: IconTestPipe,
        configField: "qaEnabled",
        description: "Generates E2E tests and detects regressions",
        capabilities: [
          "Test generation",
          "Regression detection",
          "Coverage analysis",
        ],
        accent: "yellow",
      },
      {
        id: "ops",
        label: "Ops",
        icon: IconServer,
        configField: "opsEnabled",
        description: "Monitors deployments and detects error spikes",
        capabilities: [
          "Deploy monitoring",
          "Error detection",
          "Reliability reports",
        ],
        accent: "blue",
      },
    ],
  },
  {
    title: "Growth & Support",
    description: "Content, outreach, docs, analytics",
    agents: [
      {
        id: "growth",
        label: "Growth",
        icon: IconRocket,
        configField: "growthEnabled",
        description: "Generates marketing content from completed tasks",
        capabilities: [
          "Content generation",
          "Thread discovery",
          "Social posting",
        ],
        accent: "pink",
      },
      {
        id: "support",
        label: "Support",
        icon: IconHeadset,
        configField: "supportEnabled",
        description: "Triages support conversations, drafts replies",
        capabilities: [
          "Conversation triage",
          "Reply drafting",
          "Bug escalation",
        ],
        accent: "green",
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: IconChartBar,
        configField: "analyticsEnabled",
        description: "Captures snapshots, detects anomalies, generates briefs",
        capabilities: ["Anomaly detection", "Weekly briefs", "Metric tracking"],
        accent: "purple",
      },
      {
        id: "docs",
        label: "Docs",
        icon: IconFileText,
        configField: "docsEnabled",
        description: "Detects stale documentation, generates FAQ entries",
        capabilities: ["Stale detection", "FAQ generation", "Doc updates"],
        accent: "orange",
      },
      {
        id: "sales",
        label: "Sales",
        icon: IconCoin,
        configField: "salesEnabled",
        description: "Discovers leads, manages outreach and conversions",
        capabilities: [
          "Lead discovery",
          "Outreach automation",
          "Pipeline tracking",
        ],
        accent: "yellow",
      },
    ],
  },
] as const;

type AgentDef = (typeof AGENT_GROUPS)[number]["agents"][number];

const ACCENT_STYLES = {
  blue: {
    icon: "text-blue-500 dark:text-blue-400",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    ring: "ring-blue-500/20",
    activeBorder: "border-blue-500/30",
    activeBg: "bg-blue-500/[0.03] dark:bg-blue-500/[0.06]",
    pulse: "bg-blue-500",
  },
  purple: {
    icon: "text-purple-500 dark:text-purple-400",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    ring: "ring-purple-500/20",
    activeBorder: "border-purple-500/30",
    activeBg: "bg-purple-500/[0.03] dark:bg-purple-500/[0.06]",
    pulse: "bg-purple-500",
  },
  green: {
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-500/10 dark:bg-green-500/15",
    ring: "ring-green-500/20",
    activeBorder: "border-green-500/30",
    activeBg: "bg-green-500/[0.03] dark:bg-green-500/[0.06]",
    pulse: "bg-green-500",
  },
  orange: {
    icon: "text-orange-500 dark:text-orange-400",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    ring: "ring-orange-500/20",
    activeBorder: "border-orange-500/30",
    activeBg: "bg-orange-500/[0.03] dark:bg-orange-500/[0.06]",
    pulse: "bg-orange-500",
  },
  red: {
    icon: "text-red-500 dark:text-red-400",
    iconBg: "bg-red-500/10 dark:bg-red-500/15",
    ring: "ring-red-500/20",
    activeBorder: "border-red-500/30",
    activeBg: "bg-red-500/[0.03] dark:bg-red-500/[0.06]",
    pulse: "bg-red-500",
  },
  yellow: {
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    ring: "ring-amber-500/20",
    activeBorder: "border-amber-500/30",
    activeBg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.06]",
    pulse: "bg-amber-500",
  },
  pink: {
    icon: "text-pink-500 dark:text-pink-400",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
    ring: "ring-pink-500/20",
    activeBorder: "border-pink-500/30",
    activeBg: "bg-pink-500/[0.03] dark:bg-pink-500/[0.06]",
    pulse: "bg-pink-500",
  },
} as const;

function StatusDot({
  status,
  accentColor,
}: {
  status: "active" | "error" | "idle" | "sleeping" | "disabled";
  accentColor: keyof typeof ACCENT_STYLES;
}) {
  if (status === "active") {
    return (
      <span className="relative flex size-2.5">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            ACCENT_STYLES[accentColor].pulse
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            ACCENT_STYLES[accentColor].pulse
          )}
        />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>
    );
  }

  if (status === "sleeping") {
    return (
      <span
        className={cn(
          "inline-flex size-2 rounded-full",
          ACCENT_STYLES[accentColor].pulse,
          "opacity-40"
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-2 rounded-full",
        status === "disabled"
          ? "bg-muted-foreground/20"
          : "bg-muted-foreground/40"
      )}
    />
  );
}

function AgentCard({
  agent,
  lastActivity,
  enabled,
  isAdmin,
  onToggle,
  index,
}: {
  agent: AgentDef;
  lastActivity?: { level: string; message: string; createdAt: number };
  enabled: boolean;
  isAdmin: boolean;
  onToggle: (value: boolean) => void;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeSinceActivity = lastActivity
    ? Date.now() - lastActivity.createdAt
    : null;
  const isActiveNow =
    timeSinceActivity !== null && timeSinceActivity < ACTIVE_WINDOW;
  const isRecentlyActive =
    timeSinceActivity !== null && timeSinceActivity < RECENT_WINDOW;
  const hasError = lastActivity?.level === "error";

  let status: "active" | "error" | "idle" | "sleeping" | "disabled" =
    "disabled";
  if (enabled && hasError && isRecentlyActive) {
    status = "error";
  } else if (enabled && isActiveNow) {
    status = "active";
  } else if (enabled && isRecentlyActive) {
    status = "sleeping";
  } else if (enabled) {
    status = "idle";
  }

  const accentStyles = ACCENT_STYLES[agent.accent];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
    >
      <button
        className={cn(
          "group relative w-full rounded-xl border p-4 text-left transition-all duration-200",
          "hover:shadow-sm",
          !enabled && "border-border/60 bg-card/50 opacity-55",
          status === "error" && "border-red-500/40 bg-red-500/[0.04]",
          status === "active" && [
            accentStyles.activeBorder,
            accentStyles.activeBg,
          ],
          (status === "sleeping" || status === "idle") &&
            "border-border bg-card"
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
        type="button"
      >
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
              enabled ? accentStyles.iconBg : "bg-muted"
            )}
          >
            <agent.icon
              className={cn(
                "size-[18px]",
                enabled ? accentStyles.icon : "text-muted-foreground/60"
              )}
              strokeWidth={1.8}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{agent.label}</span>
              <StatusDot accentColor={agent.accent} status={status} />
            </div>
            <p className="truncate text-muted-foreground text-xs leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper stops propagation to parent button */}
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: wrapper stops propagation to parent button */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: parent button handles keyboard */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={enabled}
              disabled={!isAdmin}
              onCheckedChange={onToggle}
              size="sm"
            />
          </div>
        </div>

        {/* Expandable detail */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="mt-3 border-border/60 border-t pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <Badge className="text-[10px]" key={cap} variant="outline">
                      {cap}
                    </Badge>
                  ))}
                </div>
                {lastActivity && (
                  <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                    {formatDistanceToNow(lastActivity.createdAt, {
                      addSuffix: true,
                    })}
                    {" — "}
                    {lastActivity.message}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

function SummaryBar({
  counts,
}: {
  counts: { active: number; idle: number; error: number; disabled: number };
}) {
  const total = counts.active + counts.idle + counts.error + counts.disabled;
  const items = [
    {
      label: "Active",
      value: counts.active,
      color: "bg-green-500",
      textColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Idle",
      value: counts.idle,
      color: "bg-muted-foreground/40",
      textColor: "text-muted-foreground",
    },
    {
      label: "Error",
      value: counts.error,
      color: "bg-red-500",
      textColor: "text-red-500",
    },
    {
      label: "Off",
      value: counts.disabled,
      color: "bg-muted-foreground/20",
      textColor: "text-muted-foreground/60",
    },
  ];

  return (
    <div className="flex items-center gap-5">
      {items.map((item) => (
        <div className="flex items-center gap-1.5" key={item.label}>
          <span className={cn("size-1.5 rounded-full", item.color)} />
          <span
            className={cn("font-medium text-xs tabular-nums", item.textColor)}
          >
            {item.value}
          </span>
          <span className="text-muted-foreground/60 text-xs">{item.label}</span>
        </div>
      ))}
      <div className="ml-auto text-muted-foreground/50 text-xs">
        {total} agents
      </div>
    </div>
  );
}

const ACTIVE_WINDOW = 5 * 60 * 1000;
const RECENT_WINDOW = 30 * 60 * 1000;

function computeAgentCounts(
  config: Record<string, unknown>,
  agentLastActivity: Map<string, { level: string; createdAt: number }>
) {
  const now = Date.now();
  const counts = { active: 0, idle: 0, error: 0, disabled: 0 };
  for (const group of AGENT_GROUPS) {
    for (const agent of group.agents) {
      const isEnabled = (config[agent.configField] as boolean) ?? false;
      if (!isEnabled) {
        counts.disabled++;
        continue;
      }
      const last = agentLastActivity.get(agent.id);
      const timeSince = last ? now - last.createdAt : null;
      const hasError = last?.level === "error";
      const isActiveNow = timeSince !== null && timeSince < ACTIVE_WINDOW;
      const isRecent = timeSince !== null && timeSince < RECENT_WINDOW;
      if (hasError && isRecent) {
        counts.error++;
      } else if (isActiveNow) {
        counts.active++;
      } else {
        counts.idle++;
      }
    }
  }
  return counts;
}

function AgentList({
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
      <div className="space-y-8">
        {Array.from({ length: 3 }, (_, g) => (
          <div key={`group-${String(g)}`}>
            <Skeleton className="mb-4 h-5 w-32" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: [4, 3, 5][g] ?? 4 }, (_, i) => (
                <Skeleton
                  className="h-20 w-full rounded-xl"
                  key={`skel-${String(g)}-${String(i)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Autopilot hasn&apos;t been configured yet.
          </p>
          <p className="mt-1 text-muted-foreground/60 text-xs">
            Go to Settings to initialize.
          </p>
        </div>
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

  const counts = computeAgentCounts(
    config as unknown as Record<string, unknown>,
    agentLastActivity
  );

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateConfig({
        configId: config._id,
        [field]: value,
      });
      toast.success(value ? "Agent enabled" : "Agent disabled");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  let globalIndex = 0;

  return (
    <div className="space-y-8">
      <SummaryBar counts={counts} />

      {AGENT_GROUPS.map((group) => (
        <section key={group.title}>
          <div className="mb-3">
            <h3 className="font-semibold text-sm tracking-tight">
              {group.title}
            </h3>
            <p className="text-muted-foreground/70 text-xs">
              {group.description}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.agents.map((agent) => {
              const cardIndex = globalIndex++;
              return (
                <AgentCard
                  agent={agent}
                  enabled={
                    (config[
                      agent.configField as keyof typeof config
                    ] as boolean) ?? false
                  }
                  index={cardIndex}
                  isAdmin={isAdmin}
                  key={agent.id}
                  lastActivity={agentLastActivity.get(agent.id)}
                  onToggle={(v) => handleToggle(agent.configField, v)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AutopilotAgentsPage() {
  const { organizationId, isAdmin } = useAutopilotContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg tracking-tight">Agents</h2>
        <Muted className="mt-0.5">
          AI agents that autonomously manage your product development lifecycle
        </Muted>
      </div>
      <AgentList isAdmin={isAdmin} organizationId={organizationId} />
    </div>
  );
}
