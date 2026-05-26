import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

export type ActivityLogEntry = Pick<
  Doc<"autopilotActivityLog">,
  "_id" | "role" | "createdAt" | "details" | "level" | "message" | "targetRole"
>;

export type ActivityRole = ActivityLogEntry["role"];
export type ActivityLevel = ActivityLogEntry["level"];

export const ACTIVITY_ROLES = [
  "pm",
  "cto",
  "growth",
  "system",
  "support",
  "sales",
  "ceo",
  "validator",
] as const satisfies readonly ActivityRole[];

export const ACTIVITY_LEVELS = [
  "info",
  "action",
  "success",
  "warning",
  "error",
] as const satisfies readonly ActivityLevel[];

export const ACTIVITY_ROLE_LABELS = {
  pm: "PM",
  cto: "CTO",
  growth: "Growth",
  system: "System",
  support: "Support",
  sales: "Sales",
  ceo: "CEO",
  validator: "Validator",
} satisfies Record<ActivityRole, string>;

export const ACTIVITY_ROLE_BADGE_STYLES = {
  pm: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  cto: "border-purple-500/30 bg-purple-500/10 text-purple-500",
  growth: "border-pink-500/30 bg-pink-500/10 text-pink-500",
  system: "border-border bg-muted text-muted-foreground",
  support: "border-teal-500/30 bg-teal-500/10 text-teal-500",
  sales: "border-rose-500/30 bg-rose-500/10 text-rose-500",
  ceo: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
  validator: "border-amber-500/30 bg-amber-500/10 text-amber-500",
} satisfies Record<ActivityRole, string>;

export const ACTIVITY_LEVEL_DOT_STYLES = {
  info: "bg-muted-foreground/40",
  action: "bg-blue-500 animate-pulse",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
} satisfies Record<ActivityLevel, string>;

export function isActivityRole(value: string): value is ActivityRole {
  return ACTIVITY_ROLES.some((role) => role === value);
}

export function isActivityLevel(value: string): value is ActivityLevel {
  return ACTIVITY_LEVELS.some((level) => level === value);
}

export const getActivityRoleLabel = (role: ActivityRole): string => {
  return ACTIVITY_ROLE_LABELS[role];
};
