"use client";

import type { chainNodeStatus } from "@reflet/backend/convex/autopilot/schema/validators";
import {
  IconCode,
  IconTarget,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import type { Infer } from "convex/values";
import type {
  ComponentType,
  KeyboardEvent as ReactKeyboardEvent,
  Ref,
} from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChainNodeKind =
  | "codebase_understanding"
  | "identity"
  | "brand_voice"
  | "feature_catalog"
  | "scope"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

type ChainNodeStatus = Infer<typeof chainNodeStatus>;
type Owner = "cto" | "pm" | "growth" | "sales";
type BadgeColor = "green" | "blue" | "orange" | "yellow" | "gray";

type DraftSubtypeKind =
  | "blog_post"
  | "reddit_reply"
  | "linkedin_post"
  | "twitter_post"
  | "hn_comment"
  | "email"
  | "changelog";

interface DraftSubtype {
  avgValidationScore: number | null;
  count: number;
  kind: DraftSubtypeKind;
  lastUpdatedAt: number | null;
  status: ChainNodeStatus;
}

interface ChainTechTreeCardProps {
  actionable: boolean;
  activeMessage?: string | null;
  artifactCount: number;
  avgValidationScore: number | null;
  blockerLabels?: string[];
  dimmed?: boolean;
  draftSubtypes?: DraftSubtype[];
  isActive?: boolean;
  kind: ChainNodeKind;
  label: string;
  lastUpdatedAt: number | null;
  onHover?: (kind: ChainNodeKind | null) => void;
  onPreview?: (kind: ChainNodeKind) => void;
  owner: Owner;
  pluralNoun: string;
  recentTitles: string[];
  ref?: Ref<HTMLButtonElement>;
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

const DRAFT_SUBTYPE_LABELS: Record<DraftSubtypeKind, string> = {
  blog_post: "Blog post",
  reddit_reply: "Reddit reply",
  linkedin_post: "LinkedIn post",
  twitter_post: "Tweet",
  hn_comment: "HN comment",
  email: "Email",
  changelog: "Changelog",
};

const SUBTYPE_DOT_COLOR: Record<ChainNodeStatus, string> = {
  published: "bg-emerald-500",
  pending_review: "bg-amber-500",
  draft: "bg-yellow-500",
  missing: "bg-muted-foreground/30",
};

const TRAILING_S = /s$/;

const UPDATED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const formatRelative = (timestamp: number, now: number): string => {
  const delta = now - timestamp;
  if (delta < MINUTE_MS) {
    return "just now";
  }
  if (delta < HOUR_MS) {
    return `${Math.floor(delta / MINUTE_MS)}m ago`;
  }
  if (delta < DAY_MS) {
    return `${Math.floor(delta / HOUR_MS)}h ago`;
  }
  if (delta < 7 * DAY_MS) {
    return `${Math.floor(delta / DAY_MS)}d ago`;
  }
  return UPDATED_DATE_FORMATTER.format(timestamp);
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
    return `Ready · ${OWNER_LABELS[owner]}`;
  }
  return `Locked · ${OWNER_LABELS[owner]}`;
};

interface MetricsRowProps {
  artifactCount: number;
  avgValidationScore: number | null;
  lastUpdatedAt: number | null;
  noun: string;
  now: number;
}

function CardMetricsRow({
  artifactCount,
  avgValidationScore,
  lastUpdatedAt,
  noun,
  now,
}: MetricsRowProps) {
  if (artifactCount === 0 && lastUpdatedAt === null) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
      {artifactCount > 0 && (
        <span>
          {artifactCount} {noun}
        </span>
      )}
      {lastUpdatedAt !== null && (
        <span>· {formatRelative(lastUpdatedAt, now)}</span>
      )}
      {avgValidationScore !== null && <span>· {avgValidationScore}/100</span>}
    </div>
  );
}

function CardRecentTitles({ titles }: { titles: string[] }) {
  if (titles.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-0.5 text-[11px] text-muted-foreground">
      {titles.map((title) => (
        <li className="flex items-center gap-1.5" key={title}>
          <span
            aria-hidden="true"
            className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
          />
          <span className="truncate text-foreground/70">{title}</span>
        </li>
      ))}
    </ul>
  );
}

function CardDraftSubtypes({ subtypes }: { subtypes: DraftSubtype[] }) {
  if (subtypes.length === 0) {
    return null;
  }
  return (
    <ul className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
      {subtypes.map((sub) => (
        <li
          className={cn(
            "flex items-center gap-1.5",
            sub.count === 0 && "opacity-50"
          )}
          key={sub.kind}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              SUBTYPE_DOT_COLOR[sub.status]
            )}
          />
          <span className="truncate text-foreground/70">
            {DRAFT_SUBTYPE_LABELS[sub.kind]}
          </span>
          {sub.count > 0 && (
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {sub.count}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function CardBlockersHint({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return null;
  }
  return (
    <div className="text-[11px] text-muted-foreground">
      <span className="font-mono text-[10px] uppercase tracking-wider">
        Waiting on
      </span>
      <span className="ml-1.5 text-foreground/70">{labels.join(", ")}</span>
    </div>
  );
}

function CardActiveBeacon({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="truncate">{message}</span>
    </div>
  );
}

export function ChainTechTreeCard({
  kind,
  label,
  pluralNoun,
  onHover,
  onPreview,
  owner,
  status,
  actionable,
  activeMessage,
  artifactCount,
  blockerLabels,
  dimmed,
  draftSubtypes,
  isActive,
  lastUpdatedAt,
  avgValidationScore,
  recentTitles,
  ref,
}: ChainTechTreeCardProps) {
  const Icon = OWNER_ICONS[owner];
  const badge = computeBadge(status, actionable);
  const subtitle = isActive
    ? "Working now…"
    : computeSubtitle(status, actionable, owner);

  const isMuted = status === "missing" && !actionable && !isActive;
  const isHighlighted = (status === "missing" && actionable) || isActive;

  const noun =
    artifactCount === 1 ? pluralNoun.replace(TRAILING_S, "") : pluralNoun;

  const now = Date.now();

  const handleClick = () => onPreview?.(kind);
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPreview?.(kind);
    }
  };
  const handleMouseEnter = () => onHover?.(kind);
  const handleMouseLeave = () => onHover?.(null);
  const handleFocus = () => onHover?.(kind);
  const handleBlur = () => onHover?.(null);

  const showBlockers =
    status === "missing" &&
    !(actionable || isActive) &&
    (blockerLabels?.length ?? 0) > 0;

  return (
    <button
      aria-label={`${label} — open preview`}
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition-[opacity,box-shadow,border-color]",
        "cursor-pointer hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isHighlighted && "border-amber-500/50 ring-1 ring-amber-500/20",
        isActive && "border-emerald-500/60 ring-1 ring-emerald-500/30",
        isMuted && !dimmed && "opacity-60",
        dimmed && "opacity-25"
      )}
      onBlur={handleBlur}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={ref}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-sm leading-tight">
              {label}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {subtitle}
            </div>
          </div>
        </div>
        <Badge className="shrink-0" variant={badge.color}>
          {badge.label}
        </Badge>
      </div>

      <CardMetricsRow
        artifactCount={artifactCount}
        avgValidationScore={avgValidationScore}
        lastUpdatedAt={lastUpdatedAt}
        noun={noun}
        now={now}
      />
      {draftSubtypes ? (
        <CardDraftSubtypes subtypes={draftSubtypes} />
      ) : (
        <CardRecentTitles titles={recentTitles} />
      )}
      {showBlockers && blockerLabels ? (
        <CardBlockersHint labels={blockerLabels} />
      ) : null}
      {isActive && activeMessage ? (
        <CardActiveBeacon message={activeMessage} />
      ) : null}
    </button>
  );
}
