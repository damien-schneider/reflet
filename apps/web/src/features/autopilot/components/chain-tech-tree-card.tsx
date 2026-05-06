"use client";

import {
  IconCode,
  IconTarget,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType, Ref } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChainNodeKind =
  | "codebase_understanding"
  | "app_description"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

type ChainNodeStatus = "missing" | "draft" | "pending_review" | "published";
type Owner = "cto" | "pm" | "growth" | "sales";
type BadgeColor = "green" | "blue" | "orange" | "yellow" | "gray";

interface ChainTechTreeCardProps {
  actionable: boolean;
  artifactCount: number;
  avgValidationScore: number | null;
  kind: ChainNodeKind;
  label: string;
  lastUpdatedAt: number | null;
  owner: Owner;
  pluralNoun: string;
  ref?: Ref<HTMLDivElement>;
  status: ChainNodeStatus;
}

const OWNER_ICONS: Record<Owner, ComponentType<{ className?: string }>> = {
  cto: IconCode,
  pm: IconUsers,
  growth: IconTrendingUp,
  sales: IconTarget,
};

const OWNER_LABELS: Record<Owner, string> = {
  cto: "CTO",
  pm: "PM",
  growth: "Growth",
  sales: "Sales",
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TRAILING_S = /s$/;

const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) {
    return "just now";
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / 60_000)}m ago`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h ago`;
  }
  return `${Math.floor(diff / DAY_MS)}d ago`;
};

const computeBadge = (
  status: ChainNodeStatus,
  actionable: boolean
): { label: string; color: BadgeColor } => {
  if (status === "published") {
    return { label: "Done", color: "green" };
  }
  if (status === "pending_review") {
    return { label: "Needs approval", color: "orange" };
  }
  if (status === "draft") {
    return { label: "In progress", color: "yellow" };
  }
  if (actionable) {
    return { label: "Available", color: "blue" };
  }
  return { label: "Locked", color: "gray" };
};

const computeSubtitle = (
  status: ChainNodeStatus,
  actionable: boolean,
  owner: Owner
): string => {
  if (status === "published") {
    return "Done";
  }
  if (status === "pending_review") {
    return "Needs your approval";
  }
  if (status === "draft") {
    return "In progress";
  }
  if (actionable) {
    return `Ready — Agent: ${OWNER_LABELS[owner]}`;
  }
  return "Locked";
};

export function ChainTechTreeCard({
  label,
  pluralNoun,
  owner,
  status,
  actionable,
  artifactCount,
  lastUpdatedAt,
  avgValidationScore,
  ref,
}: ChainTechTreeCardProps) {
  const Icon = OWNER_ICONS[owner];
  const badge = computeBadge(status, actionable);
  const subtitle = computeSubtitle(status, actionable, owner);

  const isMuted = status === "missing" && !actionable;
  const isHighlighted = status === "missing" && actionable;

  const noun =
    artifactCount === 1 ? pluralNoun.replace(TRAILING_S, "") : pluralNoun;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors",
        isHighlighted && "border-amber-500/50 ring-1 ring-amber-500/20",
        isMuted && "opacity-50"
      )}
      ref={ref}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-sm leading-tight">
              {label}
            </div>
            <div className="mt-0.5 truncate text-muted-foreground text-xs">
              {subtitle}
            </div>
          </div>
        </div>
        <Badge className="shrink-0" variant={badge.color}>
          {badge.label}
        </Badge>
      </div>
      {(artifactCount > 0 ||
        lastUpdatedAt !== null ||
        avgValidationScore !== null) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
          {artifactCount > 0 && (
            <span>
              {artifactCount} {noun}
            </span>
          )}
          {lastUpdatedAt !== null && (
            <span>Updated {formatRelative(lastUpdatedAt)}</span>
          )}
          {avgValidationScore !== null && (
            <span>Score: {avgValidationScore}/100</span>
          )}
        </div>
      )}
    </article>
  );
}
