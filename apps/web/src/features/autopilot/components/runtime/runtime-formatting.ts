import { formatDistanceToNow } from "date-fns";

import type {
  RoleSkill,
  RoleState,
} from "@/features/autopilot/components/runtime/runtime-types";

const ROLE_LABELS: Record<RoleSkill, string> = {
  ceo: "CEO coordination",
  cto: "CTO",
  growth: "Growth",
  pm: "PM",
  sales: "Sales",
  support: "Support",
  validator: "Validator",
};

export const STATE_BADGE: Record<
  RoleState,
  "default" | "outline" | "secondary"
> = {
  blocked: "outline",
  idle: "secondary",
  ready: "default",
  working: "default",
};

export function formatRelativeTime(value: number | null): string {
  if (value === null) {
    return "Never";
  }
  return `${formatDistanceToNow(value)} ago`;
}

export function roleSkillLabel(role: RoleSkill): string {
  return `${ROLE_LABELS[role]} skill`;
}
