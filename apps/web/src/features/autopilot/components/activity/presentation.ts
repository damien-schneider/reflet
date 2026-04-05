import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

export type ActivityLogEntry = Pick<
  Doc<"autopilotActivityLog">,
  | "_id"
  | "agent"
  | "createdAt"
  | "details"
  | "level"
  | "message"
  | "targetAgent"
>;

type ActivityAgent = ActivityLogEntry["agent"];
export type ActivityLevel = ActivityLogEntry["level"];

export const ACTIVITY_AGENT_LABELS = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  growth: "Growth",
  orchestrator: "CEO",
  system: "System",
  support: "Support",
  sales: "Sales",
} satisfies Record<ActivityAgent, string>;

export const ACTIVITY_AGENT_BADGE_STYLES = {
  pm: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  cto: "border-purple-500/30 bg-purple-500/10 text-purple-500",
  dev: "border-green-500/30 bg-green-500/10 text-green-500",
  growth: "border-pink-500/30 bg-pink-500/10 text-pink-500",
  orchestrator: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
  system: "border-border bg-muted text-muted-foreground",
  support: "border-teal-500/30 bg-teal-500/10 text-teal-500",
  sales: "border-rose-500/30 bg-rose-500/10 text-rose-500",
} satisfies Record<ActivityAgent, string>;

export const ACTIVITY_LEVEL_DOT_STYLES = {
  info: "bg-muted-foreground/40",
  action: "bg-blue-500 animate-pulse",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
} satisfies Record<ActivityLevel, string>;

export const getActivityAgentLabel = (agent: ActivityAgent): string => {
  return ACTIVITY_AGENT_LABELS[agent];
};

export const formatTickerEntry = (
  entry: Pick<ActivityLogEntry, "agent" | "message" | "targetAgent">
): string => {
  const sourceAgentLabel = getActivityAgentLabel(entry.agent);

  if (entry.targetAgent) {
    return `${sourceAgentLabel} -> ${getActivityAgentLabel(entry.targetAgent)}: ${entry.message}`;
  }

  return `${sourceAgentLabel}: ${entry.message}`;
};
