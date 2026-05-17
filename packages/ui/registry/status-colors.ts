/**
 * Shared design tokens for status-page (monitor / incident) visuals.
 *
 * These mirror the backend's `statusIncidents.severity` and
 * `statusMonitors.status` enums; they are duplicated here as string-literal
 * unions so the registry can be consumed standalone (without `@reflet/backend`).
 */

export type IncidentSeverity = "minor" | "major" | "critical";

export type MonitorStatus =
  | "operational"
  | "degraded"
  | "major_outage"
  | "paused"
  | "no_monitors";

/**
 * Border colors for incident cards, keyed by severity.
 * Used to give the incident card a colored left/top accent.
 */
export const INCIDENT_SEVERITY_BORDER_COLORS: Record<IncidentSeverity, string> =
  {
    minor: "border-amber-300 dark:border-amber-800",
    major: "border-orange-300 dark:border-orange-800",
    critical: "border-red-300 dark:border-red-800",
  };

/**
 * Text colors used for the monitor's status label (e.g. "Operational").
 */
export const MONITOR_STATUS_LABEL_STYLES: Record<MonitorStatus, string> = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded: "text-amber-600 dark:text-amber-400",
  major_outage: "text-red-600 dark:text-red-400",
  paused: "text-muted-foreground",
  no_monitors: "text-muted-foreground",
};

/**
 * Tailwind background classes for the small `StatusDot` indicator.
 */
export const MONITOR_STATUS_DOT_COLORS: Record<MonitorStatus, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  major_outage: "bg-red-500",
  paused: "bg-gray-400",
  no_monitors: "bg-gray-300",
};

export const MONITOR_STATUS_LABELS: Record<MonitorStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  major_outage: "Major Outage",
  paused: "Paused",
  no_monitors: "No monitors",
};
