import {
  IconBrain,
  IconCode,
  IconCoin,
  IconCrown,
  IconHeadset,
  IconRocket,
  IconUsers,
} from "@tabler/icons-react";

import type { AgentStatus } from "@/features/autopilot/components/agent-card";

export const AGENT_META = {
  orchestrator: {
    label: "CEO",
    icon: IconCrown,
    description: "Strategy & coordination",
  },
  pm: { label: "PM", icon: IconUsers, description: "Product management" },
  cto: { label: "CTO", icon: IconBrain, description: "Architecture & specs" },
  dev: { label: "Dev", icon: IconCode, description: "Code & shipping" },
  growth: {
    label: "Growth",
    icon: IconRocket,
    description: "Marketing & distribution",
  },
  support: {
    label: "Support",
    icon: IconHeadset,
    description: "User conversations",
  },
  sales: { label: "Sales", icon: IconCoin, description: "Pipeline & leads" },
} as const;

export type GridAgentId = keyof typeof AGENT_META;

export const GRID_AGENT_IDS: readonly GridAgentId[] = [
  "orchestrator",
  "pm",
  "cto",
  "dev",
  "growth",
  "support",
  "sales",
] as const;

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Working",
  blocked: "Blocked",
  error: "Error",
  idle: "Idle",
  disabled: "Off",
};

const STATUS_LABEL_COLORS: Record<AgentStatus, string> = {
  active: "text-emerald-500 dark:text-emerald-400",
  blocked: "text-amber-500 dark:text-amber-400",
  error: "text-red-500 dark:text-red-400",
  idle: "text-muted-foreground/40",
  disabled: "text-muted-foreground/20",
};

export { STATUS_LABEL_COLORS, STATUS_LABELS };
