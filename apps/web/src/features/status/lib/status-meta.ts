export type MonitorStatus =
  | "operational"
  | "degraded"
  | "major_outage"
  | "maintenance"
  | "paused";

export type OverallStatus = Exclude<MonitorStatus, "paused"> | "no_monitors";

export const MONITOR_STATUS_LABEL: Record<MonitorStatus, string> = {
  degraded: "Degraded",
  maintenance: "Under maintenance",
  major_outage: "Major outage",
  operational: "Operational",
  paused: "Paused",
};

export const MONITOR_STATUS_TEXT_CLASS: Record<MonitorStatus, string> = {
  degraded: "text-warning-text",
  maintenance: "text-brand-text",
  major_outage: "text-destructive-text",
  operational: "text-success-text",
  paused: "text-muted-foreground",
};

export const OVERALL_STATUS_MESSAGE: Record<OverallStatus, string> = {
  degraded: "Some systems are degraded",
  maintenance: "Scheduled maintenance in progress",
  major_outage: "Major outage in progress",
  no_monitors: "No monitors yet",
  operational: "All systems operational",
};

export const OVERALL_STATUS_BANNER_CLASS: Record<OverallStatus, string> = {
  degraded: "bg-warning-subtle text-warning-text",
  maintenance: "bg-brand-subtle text-brand-text",
  major_outage: "bg-destructive-subtle text-destructive-text",
  no_monitors: "bg-muted text-muted-foreground",
  operational: "bg-success-subtle text-success-text",
};

export const SEVERITY_BADGE_COLOR = {
  critical: "red",
  major: "orange",
  minor: "yellow",
} as const;

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

export const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

export const formatDuration = (startMs: number, endMs?: number): string => {
  const mins = Math.floor(((endMs ?? Date.now()) - startMs) / MS_PER_MINUTE);
  if (mins < MINUTES_PER_HOUR) {
    return `${mins} min`;
  }
  return `${Math.floor(mins / MINUTES_PER_HOUR)} h ${mins % MINUTES_PER_HOUR} min`;
};

export const formatUptime = (percentage: number): string =>
  `${(Math.floor(percentage * 100) / 100).toFixed(2)}%`;

export const formatLatency = (ms: number): string =>
  `${Math.round(ms).toLocaleString()} ms`;
