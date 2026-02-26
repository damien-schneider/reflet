"use client";

import {
  CalendarBlankIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  TrendUpIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface MockMilestone {
  id: string;
  name: string;
  emoji: string;
  color: string;
  colorHex: string;
  timeHorizon: string;
  horizonLabel: string;
  horizonShort: string;
  targetDate: string | null;
  daysUntil: number | null;
  status: "active" | "completed";
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
  feedbackItems: { title: string; votes: number; status: string }[];
}

const MOCK_MILESTONES: MockMilestone[] = [
  {
    id: "m1",
    name: "Public Beta Launch",
    emoji: "\u{1F680}",
    color: "blue",
    colorHex: "#0b6e99",
    timeHorizon: "now",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 15",
    daysUntil: 22,
    status: "active",
    progress: { total: 8, completed: 5, inProgress: 2, percentage: 63 },
    feedbackItems: [
      { title: "Fix onboarding flow", votes: 42, status: "completed" },
      { title: "Add SSO support", votes: 38, status: "in_progress" },
      { title: "Dashboard redesign", votes: 31, status: "in_progress" },
      { title: "Export to CSV", votes: 24, status: "completed" },
    ],
  },
  {
    id: "m2",
    name: "API v2",
    emoji: "\u{26A1}",
    color: "purple",
    colorHex: "#6940a5",
    timeHorizon: "now",
    horizonLabel: "Now",
    horizonShort: "Now",
    targetDate: "Mar 28",
    daysUntil: 35,
    status: "active",
    progress: { total: 5, completed: 1, inProgress: 2, percentage: 20 },
    feedbackItems: [
      { title: "Rate limiting", votes: 18, status: "in_progress" },
      { title: "Webhook events", votes: 15, status: "completed" },
    ],
  },
  {
    id: "m3",
    name: "Mobile App",
    emoji: "\u{1F4F1}",
    color: "green",
    colorHex: "#0f7b6c",
    timeHorizon: "next_quarter",
    horizonLabel: "Next Quarter",
    horizonShort: "3mo",
    targetDate: "Jun 1",
    daysUntil: 100,
    status: "active",
    progress: { total: 12, completed: 0, inProgress: 1, percentage: 0 },
    feedbackItems: [
      { title: "Push notifications", votes: 67, status: "planned" },
      { title: "Offline mode", votes: 45, status: "in_progress" },
    ],
  },
  {
    id: "m4",
    name: "Enterprise Features",
    emoji: "\u{1F3E2}",
    color: "orange",
    colorHex: "#d9730d",
    timeHorizon: "half_year",
    horizonLabel: "6 Months",
    horizonShort: "6mo",
    targetDate: null,
    daysUntil: null,
    status: "active",
    progress: { total: 6, completed: 0, inProgress: 0, percentage: 0 },
    feedbackItems: [
      { title: "SAML SSO", votes: 89, status: "planned" },
      { title: "Audit logs", votes: 56, status: "planned" },
    ],
  },
  {
    id: "m5",
    name: "Analytics Dashboard",
    emoji: "\u{1F4CA}",
    color: "pink",
    colorHex: "#ad1a72",
    timeHorizon: "next_year",
    horizonLabel: "Next Year",
    horizonShort: "1yr",
    targetDate: null,
    daysUntil: null,
    status: "active",
    progress: { total: 4, completed: 0, inProgress: 0, percentage: 0 },
    feedbackItems: [{ title: "Custom reports", votes: 34, status: "planned" }],
  },
  {
    id: "m6",
    name: "Widget SDK",
    emoji: "\u{1F9E9}",
    color: "red",
    colorHex: "#e03e3e",
    timeHorizon: "future",
    horizonLabel: "Future",
    horizonShort: "Future",
    targetDate: null,
    daysUntil: null,
    status: "active",
    progress: { total: 3, completed: 0, inProgress: 0, percentage: 0 },
    feedbackItems: [
      { title: "Embeddable components", votes: 22, status: "planned" },
    ],
  },
];

const TIME_HORIZONS_ORDERED = [
  { key: "now", label: "Now", short: "Now" },
  { key: "next_month", label: "Next Month", short: "1mo" },
  { key: "next_quarter", label: "Next Quarter", short: "3mo" },
  { key: "half_year", label: "6 Months", short: "6mo" },
  { key: "next_year", label: "Next Year", short: "1yr" },
  { key: "future", label: "Future", short: "Future" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressBar({
  percentage,
  color,
  height = 4,
  className,
}: {
  percentage: number;
  color: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted/40",
        className
      )}
      style={{ height }}
    >
      <motion.div
        animate={{ width: `${percentage}%` }}
        className="h-full rounded-full"
        initial={{ width: 0 }}
        style={{ backgroundColor: color }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      />
    </div>
  );
}

function MultiSegmentBar({
  milestone,
  height = 4,
  className,
}: {
  milestone: MockMilestone;
  height?: number;
  className?: string;
}) {
  const { completed, inProgress, total } = milestone.progress;
  const completedPct = (completed / Math.max(total, 1)) * 100;
  const inProgressPct = (inProgress / Math.max(total, 1)) * 100;

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-full bg-muted/30",
        className
      )}
      style={{ height }}
    >
      <motion.div
        animate={{ width: `${completedPct}%` }}
        className="h-full bg-emerald-500"
        initial={{ width: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      />
      <motion.div
        animate={{ width: `${inProgressPct}%` }}
        className="h-full bg-primary"
        initial={{ width: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 30,
          delay: 0.05,
        }}
      />
    </div>
  );
}

function ProgressRing({
  percentage,
  size = 40,
  strokeWidth = 3,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <circle
          className="stroke-muted/30"
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          animate={{ strokeDashoffset: offset }}
          cx={center}
          cy={center}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ rotate: "-90deg", transformOrigin: "center" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-[10px] tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}

function FeedbackStatusBadge({ status }: { status: string }) {
  let badgeClass = "bg-muted text-muted-foreground";
  let label = "Planned";
  if (status === "completed") {
    badgeClass = "bg-emerald-500/10 text-emerald-500";
    label = "Done";
  } else if (status === "in_progress") {
    badgeClass = "bg-primary/10 text-primary";
    label = "WIP";
  }
  return (
    <span className={cn("rounded px-1 py-0.5 text-[9px]", badgeClass)}>
      {label}
    </span>
  );
}

function MomentumLabel({ milestone }: { milestone: MockMilestone }) {
  let label = "Planned";
  let colorClass = "text-muted-foreground";
  if (milestone.progress.percentage >= 100) {
    label = "Complete";
    colorClass = "text-emerald-500";
  } else if (milestone.progress.percentage > 50) {
    label = "On track";
    colorClass = "text-emerald-500";
  } else if (milestone.progress.inProgress > 0) {
    label = "Building";
    colorClass = "text-primary";
  }
  return (
    <span
      className={cn(
        "flex items-center gap-1 font-medium text-[10px]",
        colorClass
      )}
    >
      <TrendUpIcon className="h-3 w-3" weight="bold" />
      {label}
    </span>
  );
}

function useActiveMilestone() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);
  return { activeId, toggle };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — FAVORITES (kept from Round 1)
// ═══════════════════════════════════════════════════════════════════════════════

// ── F1 · Vertical Timeline ───────────────────────────────────────────────────

function DesignVerticalTimeline() {
  const { activeId, toggle } = useActiveMilestone();

  return (
    <div className="relative pl-8">
      <div className="absolute top-0 bottom-0 left-3 w-0.5 bg-border" />
      <div className="absolute top-0 left-1.5 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
        <span className="font-medium text-[10px] text-primary">Today</span>
      </div>
      <div className="space-y-1 pt-6">
        {MOCK_MILESTONES.map((m) => {
          const isActive = activeId === m.id;
          return (
            <div className="relative" key={m.id}>
              <div
                className="absolute top-3 -left-5 h-2.5 w-2.5 rounded-full border-2 border-background"
                style={{ backgroundColor: m.colorHex }}
              />
              <button
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all",
                  isActive
                    ? "border-border bg-accent/50 shadow-sm"
                    : "border-transparent hover:bg-accent/30"
                )}
                onClick={() => toggle(m.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm">{m.emoji}</span>
                    <span className="truncate font-medium text-sm">
                      {m.name}
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {m.horizonShort}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.targetDate && (
                      <span className="text-[11px] text-muted-foreground">
                        {m.targetDate}
                      </span>
                    )}
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={28}
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                      }}
                    >
                      <div className="mt-2 border-t pt-2">
                        <ProgressBar
                          className="mb-2"
                          color={m.colorHex}
                          height={3}
                          percentage={m.progress.percentage}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {m.progress.completed}/{m.progress.total} done ·{" "}
                          {m.progress.inProgress} in progress
                        </p>
                        <div className="mt-1.5 space-y-0.5">
                          {m.feedbackItems.slice(0, 3).map((fb) => (
                            <div
                              className="flex items-center justify-between text-[11px]"
                              key={fb.title}
                            >
                              <span className="truncate text-muted-foreground">
                                {fb.title}
                              </span>
                              <span className="shrink-0 pl-2 text-muted-foreground/60 tabular-nums">
                                {fb.votes}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── F2 · Stacked Cards ───────────────────────────────────────────────────────

function DesignStackedCards() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {MOCK_MILESTONES.slice(0, 4).map((m, i) => {
        const isExpanded = expandedId === m.id;
        return (
          <motion.button
            animate={{
              y: isExpanded ? 0 : -i * 2,
              scale: isExpanded ? 1 : 1 - i * 0.01,
            }}
            className={cn(
              "relative w-full rounded-xl border bg-card p-4 text-left transition-shadow",
              isExpanded ? "z-10 border-border shadow-lg" : "hover:shadow-md"
            )}
            key={m.id}
            onClick={() => setExpandedId(isExpanded ? null : m.id)}
            style={{ zIndex: isExpanded ? 10 : MOCK_MILESTONES.length - i }}
            type="button"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: m.colorHex }}
                />
                <span className="text-sm">{m.emoji}</span>
                <span className="font-medium text-sm">{m.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground">
                  {m.horizonLabel}
                </span>
                <span
                  className="font-mono text-sm tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
            </div>
            <ProgressBar
              className="mt-2"
              color={m.colorHex}
              height={3}
              percentage={m.progress.percentage}
            />
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="mt-3 flex items-start gap-4 border-t pt-3">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={48}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-muted-foreground text-xs">
                        {m.progress.completed}/{m.progress.total} completed ·{" "}
                        {m.progress.inProgress} in progress
                      </p>
                      {m.feedbackItems.map((fb) => (
                        <div
                          className="flex items-center justify-between text-[11px]"
                          key={fb.title}
                        >
                          <span className="truncate text-muted-foreground">
                            {fb.title}
                          </span>
                          <span className="shrink-0 text-muted-foreground/60">
                            {fb.votes} votes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── F3 · Dashboard Metrics ───────────────────────────────────────────────────

function DesignDashboardMetrics() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold text-2xl tabular-nums">
            {MOCK_MILESTONES.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Milestones</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold text-2xl text-emerald-500 tabular-nums">
            {MOCK_MILESTONES.reduce((s, m) => s + m.progress.completed, 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Done</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold text-2xl text-primary tabular-nums">
            {MOCK_MILESTONES.reduce((s, m) => s + m.progress.inProgress, 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">In progress</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-bold text-2xl tabular-nums">
            {Math.round(
              MOCK_MILESTONES.reduce((s, m) => s + m.progress.percentage, 0) /
                MOCK_MILESTONES.length
            )}
            %
          </p>
          <p className="text-[11px] text-muted-foreground">Avg progress</p>
        </div>
      </div>
      <div className="space-y-1">
        {MOCK_MILESTONES.map((m) => (
          <div
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/30"
            key={m.id}
          >
            <div className="w-10 text-center">
              <span
                className="font-bold text-lg tabular-nums"
                style={{ color: m.colorHex }}
              >
                {m.progress.percentage}
              </span>
              <span className="text-[9px] text-muted-foreground">%</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{m.emoji}</span>
                <span className="truncate font-medium text-sm">{m.name}</span>
              </div>
              <ProgressBar
                className="mt-1"
                color={m.colorHex}
                height={2}
                percentage={m.progress.percentage}
              />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                {m.progress.completed}/{m.progress.total}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {m.horizonShort}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── F4 · Editorial Margin ────────────────────────────────────────────────────

function DesignEditorialMargin() {
  return (
    <div className="space-y-6 px-4">
      <div className="border-foreground border-b-2 pb-2">
        <h3 className="font-bold font-serif text-lg italic tracking-tight">
          Product Roadmap
        </h3>
        <p className="text-[11px] text-muted-foreground">
          6 milestones across 5 time horizons
        </p>
      </div>
      {MOCK_MILESTONES.slice(0, 4).map((m) => (
        <div className="flex gap-6" key={m.id}>
          <div className="w-24 shrink-0 border-r pr-4 text-right">
            <p
              className="font-serif text-sm italic"
              style={{ color: m.colorHex }}
            >
              {m.horizonLabel}
            </p>
            {m.targetDate && (
              <p className="text-[10px] text-muted-foreground">
                {m.targetDate}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] tabular-nums">
              {m.progress.percentage}% done
            </p>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold font-serif text-base">
              {m.emoji} {m.name}
            </h4>
            <ProgressBar
              className="mt-1.5 max-w-xs"
              color={m.colorHex}
              height={2}
              percentage={m.progress.percentage}
            />
            <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
              <span>{m.progress.completed} completed</span>
              <span>{m.progress.inProgress} in progress</span>
              <span>
                {m.progress.total -
                  m.progress.completed -
                  m.progress.inProgress}{" "}
                planned
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── F5 · Sweep Track ─────────────────────────────────────────────────────────

function DesignSweepTrack() {
  const [sweepId, setSweepId] = useState<string | null>(null);
  const { activeId, toggle } = useActiveMilestone();

  const handleClick = (id: string) => {
    setSweepId(id);
    toggle(id);
    setTimeout(() => setSweepId(null), 600);
  };

  return (
    <div className="space-y-1">
      {MOCK_MILESTONES.slice(0, 5).map((m) => {
        const isActive = activeId === m.id;
        const isSweeping = sweepId === m.id;
        return (
          <button
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-all",
              isActive ? "bg-accent" : "hover:bg-accent/30"
            )}
            key={m.id}
            onClick={() => handleClick(m.id)}
            type="button"
          >
            <AnimatePresence>
              {isSweeping && (
                <motion.div
                  animate={{ x: "100%", opacity: 0 }}
                  className="absolute inset-0 rounded-lg"
                  exit={{ opacity: 0 }}
                  initial={{ x: "-100%", opacity: 0.3 }}
                  style={{ backgroundColor: m.colorHex }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <div className="relative z-10 flex w-full items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${m.colorHex}15` }}
              >
                <span className="text-sm">{m.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-sm">{m.name}</span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{m.horizonLabel}</span>
                  {m.targetDate && <span>· {m.targetDate}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ProgressBar
                  className="w-16"
                  color={m.colorHex}
                  height={3}
                  percentage={m.progress.percentage}
                />
                <span
                  className="font-mono text-xs tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── F6 · Accordion Rows ──────────────────────────────────────────────────────

function DesignAccordionRows() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {MOCK_MILESTONES.slice(0, 5).map((m) => {
        const isOpen = openId === m.id;
        return (
          <motion.div
            animate={{
              backgroundColor: isOpen ? `${m.colorHex}08` : "transparent",
            }}
            className="overflow-hidden rounded-xl border transition-colors"
            key={m.id}
            style={{ borderColor: isOpen ? `${m.colorHex}30` : undefined }}
          >
            <button
              className="flex w-full items-center gap-3 p-3 text-left"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              type="button"
            >
              <motion.div
                animate={{ rotate: isOpen ? 90 : 0 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm"
                style={{ backgroundColor: `${m.colorHex}15` }}
              >
                {m.emoji}
              </motion.div>
              <span className="min-w-0 flex-1 truncate font-medium text-sm">
                {m.name}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <ProgressBar
                  className="w-20"
                  color={m.colorHex}
                  height={3}
                  percentage={m.progress.percentage}
                />
                <span
                  className="w-8 text-right font-mono text-xs tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div
                    className="flex gap-4 border-t px-3 pt-3 pb-3"
                    style={{ borderColor: `${m.colorHex}15` }}
                  >
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={48}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span>
                          {m.progress.completed}/{m.progress.total} done
                        </span>
                        {m.progress.inProgress > 0 && (
                          <span>{m.progress.inProgress} in progress</span>
                        )}
                        <span>{m.horizonLabel}</span>
                        {m.targetDate && <span>Due {m.targetDate}</span>}
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate text-foreground">
                              {fb.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="text-muted-foreground">
                                {fb.votes}v
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── F7 · Compact Strip ───────────────────────────────────────────────────────

function DesignCompactStrip() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="relative flex items-center gap-1 rounded-full bg-secondary p-1.5">
        {MOCK_MILESTONES.map((m) => {
          const isHovered = hoveredId === m.id;
          const widthPercent = Math.max(12, (m.progress.total / 38) * 100);
          return (
            <button
              className="relative block"
              key={m.id}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ width: `${widthPercent}%` }}
              type="button"
            >
              <motion.div
                animate={{ scale: isHovered ? 1.05 : 1 }}
                className="relative h-7 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: m.colorHex }}
              >
                <motion.div
                  animate={{ width: `${m.progress.percentage}%` }}
                  className="absolute inset-y-0 left-0 bg-white/20"
                  initial={false}
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
                <span className="relative z-10 flex h-full items-center justify-center text-[10px] text-white">
                  {m.emoji}
                </span>
              </motion.div>
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-1/2 z-20 mt-2 w-52 -translate-x-1/2 rounded-lg border bg-card p-3 shadow-lg"
                    exit={{ opacity: 0, y: -4 }}
                    initial={{ opacity: 0, y: -4 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{m.emoji}</span>
                      <span className="font-medium text-sm">{m.name}</span>
                    </div>
                    <ProgressBar
                      className="mt-2"
                      color={m.colorHex}
                      height={3}
                      percentage={m.progress.percentage}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {m.progress.completed}/{m.progress.total} done
                      </span>
                      <span>{m.horizonLabel}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground">
        <span>Now</span>
        <span>Future</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — HYBRID EXPLORATIONS (new, deeper combinations)
// Combining the best elements from favorites into production-ready designs.
// ═══════════════════════════════════════════════════════════════════════════════

// ── H1 · Editorial Timeline — Serif typography meets vertical chronology ─────

function DesignEditorialTimeline() {
  const { activeId, toggle } = useActiveMilestone();

  const grouped = useMemo(() => {
    const map = new Map<string, MockMilestone[]>();
    for (const h of TIME_HORIZONS_ORDERED) {
      map.set(h.key, []);
    }
    for (const m of MOCK_MILESTONES) {
      const arr = map.get(m.timeHorizon);
      if (arr) {
        arr.push(m);
      }
    }
    return map;
  }, []);

  const nonEmpty = TIME_HORIZONS_ORDERED.filter((h) => {
    const arr = grouped.get(h.key);
    return arr && arr.length > 0;
  });

  return (
    <div className="relative pl-6">
      <div className="absolute top-0 bottom-0 left-0 w-px bg-border" />
      {nonEmpty.map((horizon) => {
        const milestones = grouped.get(horizon.key) ?? [];
        return (
          <div className="relative mb-6 last:mb-0" key={horizon.key}>
            {/* Horizon label in margin */}
            <div className="absolute top-0 -left-0.5 flex items-center">
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
            </div>
            <div className="mb-3 pl-6">
              <span className="font-serif text-muted-foreground text-xs uppercase italic tracking-widest">
                {horizon.label}
              </span>
            </div>
            <div className="space-y-2 pl-6">
              {milestones.map((m) => {
                const isActive = activeId === m.id;
                return (
                  <div className="relative" key={m.id}>
                    <div className="absolute top-3 -left-6 flex items-center">
                      <div className="h-2 w-6 border-border/50 border-b" />
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: m.colorHex }}
                      />
                    </div>
                    <button
                      className={cn(
                        "w-full rounded-lg p-3 text-left transition-all",
                        isActive
                          ? "bg-accent/50 shadow-sm"
                          : "hover:bg-accent/20"
                      )}
                      onClick={() => toggle(m.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base">
                          {m.emoji} {m.name}
                        </h4>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {m.targetDate && (
                            <span className="font-serif text-[11px] italic">
                              {m.targetDate}
                            </span>
                          )}
                          <span
                            className="font-mono text-sm tabular-nums"
                            style={{ color: m.colorHex }}
                          >
                            {m.progress.percentage}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar
                        className="mt-2"
                        color={m.colorHex}
                        height={2}
                        percentage={m.progress.percentage}
                      />
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            animate={{ height: "auto", opacity: 1 }}
                            className="overflow-hidden"
                            exit={{ height: 0, opacity: 0 }}
                            initial={{ height: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              damping: 25,
                              stiffness: 300,
                            }}
                          >
                            <div className="mt-3 flex gap-4 border-border/30 border-t pt-3">
                              <ProgressRing
                                color={m.colorHex}
                                percentage={m.progress.percentage}
                                size={44}
                              />
                              <div className="flex-1">
                                <p className="font-serif text-[11px] text-muted-foreground italic">
                                  {m.progress.completed} of {m.progress.total}{" "}
                                  complete · {m.progress.inProgress} underway
                                </p>
                                <div className="mt-1.5 space-y-0.5">
                                  {m.feedbackItems.map((fb) => (
                                    <div
                                      className="flex items-center justify-between text-[11px]"
                                      key={fb.title}
                                    >
                                      <span className="truncate">
                                        {fb.title}
                                      </span>
                                      <div className="flex shrink-0 items-center gap-2 pl-2">
                                        <FeedbackStatusBadge
                                          status={fb.status}
                                        />
                                        <span className="text-muted-foreground/60 tabular-nums">
                                          {fb.votes}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── H2 · Sweep Accordion — Accordion with sweep confirmation ─────────────────

function DesignSweepAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sweepId, setSweepId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setSweepId(id);
    setOpenId((prev) => (prev === id ? null : id));
    setTimeout(() => setSweepId(null), 500);
  };

  return (
    <div className="space-y-1">
      {MOCK_MILESTONES.slice(0, 5).map((m) => {
        const isOpen = openId === m.id;
        const isSweeping = sweepId === m.id;
        return (
          <div
            className={cn(
              "overflow-hidden rounded-xl border transition-all",
              isOpen && "shadow-sm"
            )}
            key={m.id}
            style={{ borderColor: isOpen ? `${m.colorHex}40` : undefined }}
          >
            <button
              className="relative flex w-full items-center gap-3 overflow-hidden p-3 text-left transition-colors hover:bg-accent/20"
              onClick={() => handleToggle(m.id)}
              type="button"
            >
              <AnimatePresence>
                {isSweeping && (
                  <motion.div
                    animate={{ x: "100%", opacity: 0 }}
                    className="absolute inset-0"
                    exit={{ opacity: 0 }}
                    initial={{ x: "-100%", opacity: 0.15 }}
                    style={{ backgroundColor: m.colorHex }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
              <div className="relative z-10 flex w-full items-center gap-3">
                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CaretRightIcon
                    className="h-3.5 w-3.5 text-muted-foreground"
                    weight="bold"
                  />
                </motion.div>
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm"
                  style={{ backgroundColor: `${m.colorHex}12` }}
                >
                  {m.emoji}
                </div>
                <span className="min-w-0 flex-1 truncate font-medium text-sm">
                  {m.name}
                </span>
                <MomentumLabel milestone={m} />
                <ProgressBar
                  className="w-16"
                  color={m.colorHex}
                  height={3}
                  percentage={m.progress.percentage}
                />
                <span
                  className="w-8 text-right font-mono text-xs tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div
                    className="border-t px-3 pt-3 pb-3"
                    style={{
                      backgroundColor: `${m.colorHex}04`,
                      borderColor: `${m.colorHex}15`,
                    }}
                  >
                    <div className="flex gap-4">
                      <ProgressRing
                        color={m.colorHex}
                        percentage={m.progress.percentage}
                        size={48}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 text-muted-foreground text-xs">
                          <span>
                            {m.progress.completed}/{m.progress.total} done
                          </span>
                          {m.progress.inProgress > 0 && (
                            <span>{m.progress.inProgress} in progress</span>
                          )}
                          {m.targetDate && (
                            <span className="flex items-center gap-1">
                              <CalendarBlankIcon
                                className="h-3 w-3"
                                weight="regular"
                              />
                              {m.targetDate}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {m.feedbackItems.map((fb) => (
                            <div
                              className="flex items-center justify-between text-[11px]"
                              key={fb.title}
                            >
                              <span className="truncate">{fb.title}</span>
                              <div className="flex shrink-0 items-center gap-2 pl-2">
                                <FeedbackStatusBadge status={fb.status} />
                                <span className="text-muted-foreground tabular-nums">
                                  {fb.votes}v
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── H3 · Dashboard + Timeline — KPI header with vertical timeline ────────────

function DesignDashboardTimeline() {
  const { activeId, toggle } = useActiveMilestone();

  const totalItems = MOCK_MILESTONES.reduce((s, m) => s + m.progress.total, 0);
  const totalCompleted = MOCK_MILESTONES.reduce(
    (s, m) => s + m.progress.completed,
    0
  );
  const overallPct = Math.round(
    (totalCompleted / Math.max(totalItems, 1)) * 100
  );

  return (
    <div className="space-y-4">
      {/* Compact KPI bar */}
      <div className="flex items-center gap-4 rounded-xl bg-secondary p-3">
        <ProgressRing
          color="var(--color-primary)"
          percentage={overallPct}
          size={36}
          strokeWidth={3}
        />
        <div className="flex flex-1 items-center gap-6 text-xs">
          <div>
            <span className="font-bold text-lg tabular-nums">
              {totalCompleted}
            </span>
            <span className="text-muted-foreground">/{totalItems} items</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{totalCompleted} done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              {MOCK_MILESTONES.reduce((s, m) => s + m.progress.inProgress, 0)}{" "}
              in progress
            </span>
          </div>
        </div>
      </div>
      {/* Timeline */}
      <div className="relative pl-6">
        <div className="absolute top-0 bottom-0 left-2 w-px bg-border" />
        {MOCK_MILESTONES.map((m) => {
          const isActive = activeId === m.id;
          return (
            <div className="relative mb-1.5 last:mb-0" key={m.id}>
              <div
                className="absolute top-3 -left-4 h-2 w-2 rounded-full border-2 border-background"
                style={{ backgroundColor: m.colorHex }}
              />
              <button
                className={cn(
                  "w-full rounded-lg p-2.5 text-left transition-all",
                  isActive ? "bg-accent/50" : "hover:bg-accent/20"
                )}
                onClick={() => toggle(m.id)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{m.emoji}</span>
                  <span className="flex-1 truncate font-medium text-sm">
                    {m.name}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    {m.horizonShort}
                  </span>
                  <MultiSegmentBar className="w-20" height={3} milestone={m} />
                  <span
                    className="w-7 text-right font-mono text-[11px] tabular-nums"
                    style={{ color: m.colorHex }}
                  >
                    {m.progress.percentage}%
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  >
                    <div className="mt-1 ml-6 rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span>
                          {m.progress.completed}/{m.progress.total} done
                        </span>
                        {m.targetDate && (
                          <span className="flex items-center gap-1">
                            <CalendarBlankIcon
                              className="h-3 w-3"
                              weight="regular"
                            />
                            {m.targetDate}
                          </span>
                        )}
                        <MomentumLabel milestone={m} />
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate">{fb.title}</span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="text-muted-foreground tabular-nums">
                                {fb.votes}v
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── H4 · Strip + Accordion — Compact overview with expandable list below ─────

function DesignStripAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Compact strip header */}
      <div className="flex items-center gap-1 rounded-xl bg-secondary p-2">
        {MOCK_MILESTONES.map((m) => {
          const isOpen = openId === m.id;
          const widthPercent = Math.max(14, (m.progress.total / 38) * 100);
          return (
            <button
              className={cn(
                "relative h-8 overflow-hidden rounded-lg text-[10px] text-white transition-all",
                isOpen && "ring-2 ring-ring ring-offset-1 ring-offset-secondary"
              )}
              key={m.id}
              onClick={() => setOpenId(isOpen ? null : m.id)}
              style={{ width: `${widthPercent}%`, backgroundColor: m.colorHex }}
              type="button"
            >
              <motion.div
                animate={{ width: `${m.progress.percentage}%` }}
                className="absolute inset-y-0 left-0 bg-white/15"
                initial={false}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
              <span className="relative z-10 flex h-full items-center justify-center gap-1 px-1">
                <span>{m.emoji}</span>
                <span className="hidden truncate font-medium sm:inline">
                  {m.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {/* Expandable detail below */}
      <AnimatePresence>
        {openId &&
          (() => {
            const m = MOCK_MILESTONES.find((ms) => ms.id === openId);
            if (!m) {
              return null;
            }
            return (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden rounded-xl border"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                key={openId}
                style={{ borderColor: `${m.colorHex}30` }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div
                  className="p-4"
                  style={{ backgroundColor: `${m.colorHex}05` }}
                >
                  <div className="flex items-start gap-4">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={52}
                      strokeWidth={3.5}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.emoji}</span>
                        <h4 className="font-semibold text-base">{m.name}</h4>
                        <MomentumLabel milestone={m} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                        <span>{m.horizonLabel}</span>
                        {m.targetDate && <span>Due {m.targetDate}</span>}
                        <span>
                          {m.progress.completed}/{m.progress.total} done
                        </span>
                      </div>
                      <MultiSegmentBar
                        className="mt-2"
                        height={4}
                        milestone={m}
                      />
                      <div className="mt-3 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate">{fb.title}</span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="text-muted-foreground tabular-nums">
                                {fb.votes}v
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

// ── H5 · Production List — Polished Linear-style list with all details ───────

function DesignProductionList() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sweepId, setSweepId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setSweepId(id);
    setOpenId((prev) => (prev === id ? null : id));
    setTimeout(() => setSweepId(null), 500);
  };

  return (
    <div className="rounded-xl border">
      {MOCK_MILESTONES.map((m, idx) => {
        const isOpen = openId === m.id;
        const isSweeping = sweepId === m.id;
        const isLast = idx === MOCK_MILESTONES.length - 1;
        return (
          <div key={m.id}>
            <button
              className={cn(
                "relative flex w-full items-center gap-3 overflow-hidden px-4 py-3 text-left transition-colors hover:bg-accent/20",
                isOpen && "bg-accent/30",
                !(isLast || isOpen) && "border-border/40 border-b"
              )}
              onClick={() => handleClick(m.id)}
              type="button"
            >
              <AnimatePresence>
                {isSweeping && (
                  <motion.div
                    animate={{ x: "100%", opacity: 0 }}
                    className="absolute inset-0"
                    exit={{ opacity: 0 }}
                    initial={{ x: "-100%", opacity: 0.12 }}
                    style={{ backgroundColor: m.colorHex }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
              <div className="relative z-10 flex w-full items-center gap-3">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: m.colorHex }}
                />
                <span className="text-sm">{m.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-sm">
                  {m.name}
                </span>
                <MomentumLabel milestone={m} />
                {m.targetDate && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ClockIcon className="h-3 w-3" weight="regular" />
                    {m.targetDate}
                  </span>
                )}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {m.horizonShort}
                </span>
                <MultiSegmentBar className="w-20" height={3} milestone={m} />
                <span
                  className="w-7 text-right font-mono text-[11px] tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  className="text-muted-foreground"
                >
                  <CaretRightIcon className="h-3.5 w-3.5" weight="bold" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden border-border/40 border-b"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="flex gap-4 bg-accent/10 px-4 py-3 pl-12">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={44}
                    />
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs">
                        {m.progress.completed} done · {m.progress.inProgress} in
                        progress ·{" "}
                        {m.progress.total -
                          m.progress.completed -
                          m.progress.inProgress}{" "}
                        planned
                      </p>
                      <div className="mt-2 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate">{fb.title}</span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="text-muted-foreground tabular-nums">
                                {fb.votes}v
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── H6 · Waterfall Timeline — Vertical timeline with item waterfall ──────────

function DesignWaterfallTimeline() {
  const { activeId, toggle } = useActiveMilestone();

  return (
    <div className="relative pl-10">
      <div className="absolute top-0 bottom-0 left-4 w-px bg-border" />
      {MOCK_MILESTONES.map((m) => {
        const isActive = activeId === m.id;
        return (
          <div className="relative mb-4 last:mb-0" key={m.id}>
            {/* Node with percentage */}
            <div className="absolute top-0 -left-6 flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] shadow-sm"
                style={{ backgroundColor: m.colorHex }}
              >
                <span className="text-white">{m.emoji}</span>
              </div>
              <span
                className="mt-0.5 font-mono text-[9px] tabular-nums"
                style={{ color: m.colorHex }}
              >
                {m.progress.percentage}%
              </span>
            </div>
            <button
              className={cn(
                "w-full rounded-lg p-3 text-left transition-all",
                isActive ? "bg-accent/50 shadow-sm" : "hover:bg-accent/20"
              )}
              onClick={() => toggle(m.id)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{m.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {m.horizonLabel}
                  </span>
                  {m.targetDate && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarBlankIcon className="h-3 w-3" weight="regular" />
                      {m.targetDate}
                    </span>
                  )}
                </div>
              </div>
              <MultiSegmentBar className="mt-2" height={4} milestone={m} />
              <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {m.progress.completed} done
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {m.progress.inProgress} wip
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  {m.progress.total -
                    m.progress.completed -
                    m.progress.inProgress}{" "}
                  planned
                </span>
              </div>
              {/* Feedback items waterfall */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  >
                    <div className="mt-3 space-y-1 border-t pt-3">
                      {m.feedbackItems.map((fb, i) => (
                        <motion.div
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30"
                          initial={{ opacity: 0, x: -8 }}
                          key={fb.title}
                          transition={{ delay: i * 0.05 }}
                        >
                          <CheckCircleIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              fb.status === "completed"
                                ? "text-emerald-500"
                                : "text-muted-foreground/30"
                            )}
                            weight={
                              fb.status === "completed" ? "fill" : "regular"
                            }
                          />
                          <span
                            className={cn(
                              "flex-1 truncate text-[11px]",
                              fb.status === "completed" &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {fb.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            {fb.votes}v
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── H7 · KPI Tiles + Detail — Dashboard cards that expand ────────────────────

function DesignKPITiles() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {MOCK_MILESTONES.slice(0, 6).map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <motion.button
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-3 text-left transition-all",
                isSelected ? "shadow-md" : "hover:shadow-sm"
              )}
              key={m.id}
              onClick={() => setSelectedId(isSelected ? null : m.id)}
              style={{
                borderColor: isSelected ? `${m.colorHex}50` : undefined,
              }}
              type="button"
              whileTap={{ scale: 0.97 }}
            >
              <div
                className="absolute top-0 left-0 h-0.5 w-full"
                style={{ backgroundColor: m.colorHex }}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{m.emoji}</span>
                <span className="truncate font-medium text-[11px]">
                  {m.name}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span
                  className="font-bold text-xl tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
                <MomentumLabel milestone={m} />
              </div>
              <MultiSegmentBar className="mt-1.5" height={3} milestone={m} />
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {selectedId &&
          (() => {
            const m = MOCK_MILESTONES.find((ms) => ms.id === selectedId);
            if (!m) {
              return null;
            }
            return (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden rounded-xl border bg-card"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                key={selectedId}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="flex gap-4 p-4">
                  <ProgressRing
                    color={m.colorHex}
                    percentage={m.progress.percentage}
                    size={52}
                    strokeWidth={3.5}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">
                      {m.emoji} {m.name}
                    </h4>
                    <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                      <span>{m.horizonLabel}</span>
                      {m.targetDate && <span>Due {m.targetDate}</span>}
                      <span>
                        {m.progress.completed}/{m.progress.total} done
                      </span>
                    </div>
                    <div className="mt-3 space-y-0.5">
                      {m.feedbackItems.map((fb) => (
                        <div
                          className="flex items-center justify-between text-[11px]"
                          key={fb.title}
                        >
                          <span className="truncate">{fb.title}</span>
                          <div className="flex shrink-0 items-center gap-2 pl-2">
                            <FeedbackStatusBadge status={fb.status} />
                            <span className="text-muted-foreground tabular-nums">
                              {fb.votes}v
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

// ── H8 · Stacked Timeline — Stacked depth cards along timeline spine ─────────

function DesignStackedTimeline() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="relative pl-6">
      <div className="absolute top-0 bottom-0 left-2 w-px bg-border" />
      {MOCK_MILESTONES.slice(0, 5).map((m, i) => {
        const isExpanded = expandedId === m.id;
        return (
          <div className="relative mb-2 last:mb-0" key={m.id}>
            <div
              className="absolute top-4 -left-4 h-2 w-2 rounded-full"
              style={{ backgroundColor: m.colorHex }}
            />
            <motion.button
              animate={{
                y: isExpanded ? 0 : -i * 1,
                scale: isExpanded ? 1 : 1 - i * 0.005,
                boxShadow: isExpanded
                  ? `0 4px 20px ${m.colorHex}15`
                  : "0 1px 3px rgba(0,0,0,0.05)",
              }}
              className={cn(
                "relative w-full rounded-xl border bg-card p-3.5 text-left transition-colors",
                isExpanded ? "border-border" : "hover:border-border/60"
              )}
              onClick={() => setExpandedId(isExpanded ? null : m.id)}
              style={{ zIndex: isExpanded ? 10 : 5 - i }}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{m.emoji}</span>
                  <span className="font-medium text-sm">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    {m.horizonShort}
                  </span>
                  <span
                    className="font-mono text-xs tabular-nums"
                    style={{ color: m.colorHex }}
                  >
                    {m.progress.percentage}%
                  </span>
                </div>
              </div>
              <MultiSegmentBar className="mt-2" height={3} milestone={m} />
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  >
                    <div className="mt-3 flex gap-3 border-t pt-3">
                      <ProgressRing
                        color={m.colorHex}
                        percentage={m.progress.percentage}
                        size={44}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span>
                            {m.progress.completed}/{m.progress.total} done
                          </span>
                          {m.targetDate && (
                            <span className="flex items-center gap-1">
                              <CalendarBlankIcon
                                className="h-3 w-3"
                                weight="regular"
                              />
                              {m.targetDate}
                            </span>
                          )}
                          <MomentumLabel milestone={m} />
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {m.feedbackItems.map((fb) => (
                            <div
                              className="flex items-center justify-between text-[11px]"
                              key={fb.title}
                            >
                              <span className="truncate">{fb.title}</span>
                              <div className="flex shrink-0 items-center gap-2 pl-2">
                                <FeedbackStatusBadge status={fb.status} />
                                <span className="text-muted-foreground tabular-nums">
                                  {fb.votes}v
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

// ── H9 · Editorial Accordion — Serif + color wash expand ─────────────────────

function DesignEditorialAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-0 divide-y divide-border/40">
      {MOCK_MILESTONES.slice(0, 5).map((m) => {
        const isOpen = openId === m.id;
        return (
          <motion.div
            animate={{
              backgroundColor: isOpen ? `${m.colorHex}06` : "transparent",
            }}
            className="transition-colors"
            key={m.id}
          >
            <button
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              type="button"
            >
              <div className="w-16 shrink-0 text-right">
                <span
                  className="font-mono text-lg tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="min-w-0 flex-1">
                <h4 className="font-serif text-base">
                  {m.emoji} {m.name}
                </h4>
                <p className="font-serif text-[11px] text-muted-foreground italic">
                  {m.horizonLabel}
                  {m.targetDate ? ` · Due ${m.targetDate}` : ""}
                </p>
              </div>
              <ProgressBar
                className="w-24"
                color={m.colorHex}
                height={3}
                percentage={m.progress.percentage}
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="flex gap-6 px-4 pb-4 pl-24">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={48}
                    />
                    <div className="flex-1">
                      <p className="font-serif text-muted-foreground text-xs italic">
                        {m.progress.completed} of {m.progress.total} complete,{" "}
                        {m.progress.inProgress} underway
                      </p>
                      <div className="mt-2 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate font-serif">
                              {fb.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="font-mono text-muted-foreground tabular-nums">
                                {fb.votes}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── H10 · Compact Rail — Horizontal pills with inline expand ─────────────────

function DesignCompactRail() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Scrollable rail */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MOCK_MILESTONES.map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <button
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all",
                isSelected ? "shadow-sm" : "hover:border-border"
              )}
              key={m.id}
              onClick={() => setSelectedId(isSelected ? null : m.id)}
              style={{
                borderColor: isSelected ? m.colorHex : undefined,
                backgroundColor: isSelected ? `${m.colorHex}08` : undefined,
              }}
              type="button"
            >
              <span>{m.emoji}</span>
              <span className="font-medium">{m.name}</span>
              <span className="h-3 w-px bg-border" />
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: m.colorHex }}
              >
                {m.progress.percentage}%
              </span>
            </button>
          );
        })}
      </div>
      {/* Detail panel */}
      <AnimatePresence>
        {selectedId &&
          (() => {
            const m = MOCK_MILESTONES.find((ms) => ms.id === selectedId);
            if (!m) {
              return null;
            }
            return (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden rounded-xl border bg-card"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                key={selectedId}
                style={{ borderColor: `${m.colorHex}25` }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={48}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          {m.emoji} {m.name}
                        </h4>
                        <MomentumLabel milestone={m} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                        <span>{m.horizonLabel}</span>
                        {m.targetDate && <span>· Due {m.targetDate}</span>}
                      </div>
                      <MultiSegmentBar
                        className="mt-2"
                        height={4}
                        milestone={m}
                      />
                      <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                        <span>{m.progress.completed} done</span>
                        <span>{m.progress.inProgress} wip</span>
                        <span>
                          {m.progress.total -
                            m.progress.completed -
                            m.progress.inProgress}{" "}
                          planned
                        </span>
                      </div>
                      <div className="mt-3 space-y-0.5">
                        {m.feedbackItems.map((fb) => (
                          <div
                            className="flex items-center justify-between text-[11px]"
                            key={fb.title}
                          >
                            <span className="truncate">{fb.title}</span>
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              <FeedbackStatusBadge status={fb.status} />
                              <span className="text-muted-foreground tabular-nums">
                                {fb.votes}v
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

interface DesignEntry {
  id: string;
  name: string;
  description: string;
  question: string;
  traits: string[];
  category: "favorite" | "hybrid";
  component: () => ReactNode;
}

const DESIGNS: DesignEntry[] = [
  // Favorites
  {
    id: "f1",
    name: "Vertical Timeline",
    description:
      "Classic timeline with node markers and progressive disclosure. Click to expand details inline.",
    question: "Should milestones feel like a chronological story?",
    traits: ["Vertical", "Timeline"],
    category: "favorite",
    component: DesignVerticalTimeline,
  },
  {
    id: "f2",
    name: "Stacked Cards",
    description:
      "Overlapping cards with depth. Click to expand and bring to focus with full details.",
    question: "Can depth and layering communicate priority better?",
    traits: ["Stacked", "Depth"],
    category: "favorite",
    component: DesignStackedCards,
  },
  {
    id: "f3",
    name: "Dashboard Metrics",
    description:
      "Milestone data IS the hero. Summary KPIs up top, milestones as data rows with big numbers.",
    question: "What if the milestone view was a dashboard?",
    traits: ["Data-first", "KPI"],
    category: "favorite",
    component: DesignDashboardMetrics,
  },
  {
    id: "f4",
    name: "Editorial Margin",
    description:
      "Serif typography, newspaper-style margin annotations. Time horizon and progress live in the gutter.",
    question: "What if the roadmap felt like reading a magazine?",
    traits: ["Editorial", "Serif"],
    category: "favorite",
    component: DesignEditorialMargin,
  },
  {
    id: "f5",
    name: "Sweep Track",
    description:
      "List items with a horizontal sweep animation on click for satisfying selection feedback.",
    question: "Can sweep animation make milestone selection more tactile?",
    traits: ["Animated", "Sweep"],
    category: "favorite",
    component: DesignSweepTrack,
  },
  {
    id: "f6",
    name: "Accordion Rows",
    description:
      "Bordered rows that expand in-place with color wash background. Full detail including feedback status.",
    question: "Does in-place expansion with color wash create better context?",
    traits: ["Accordion", "Color-wash"],
    category: "favorite",
    component: DesignAccordionRows,
  },
  {
    id: "f7",
    name: "Compact Strip",
    description:
      "Ultra-minimal horizontal strip. Each milestone is a colored pill. Hover for floating detail card.",
    question: "Can the entire roadmap fit in a single horizontal strip?",
    traits: ["Ultra-compact", "Strip"],
    category: "favorite",
    component: DesignCompactStrip,
  },
  // Hybrids
  {
    id: "h1",
    name: "Editorial Timeline",
    description:
      "Vertical timeline with serif typography and horizon grouping. Margin branches connect to expandable editorial cards.",
    question:
      "What happens when editorial refinement meets chronological structure?",
    traits: ["Editorial + Timeline", "Grouped"],
    category: "hybrid",
    component: DesignEditorialTimeline,
  },
  {
    id: "h2",
    name: "Sweep Accordion",
    description:
      "Accordion expansion with sweep confirmation animation, momentum labels, and caret rotation. Tactile and detailed.",
    question:
      "Can sweep feedback make accordion expansion feel more intentional?",
    traits: ["Sweep + Accordion", "Tactile"],
    category: "hybrid",
    component: DesignSweepAccordion,
  },
  {
    id: "h3",
    name: "Dashboard Timeline",
    description:
      "KPI summary bar up top with overall progress, then a vertical timeline with multi-segment progress and expandable details.",
    question: "Does a KPI header add context to the timeline narrative?",
    traits: ["Dashboard + Timeline", "Overview"],
    category: "hybrid",
    component: DesignDashboardTimeline,
  },
  {
    id: "h4",
    name: "Strip + Accordion",
    description:
      "Compact colored strip overview header. Click any segment to expand a rich detail panel below with progress ring and feedback.",
    question: "Can a strip overview drive the detail view?",
    traits: ["Strip + Detail", "Two-layer"],
    category: "hybrid",
    component: DesignStripAccordion,
  },
  {
    id: "h5",
    name: "Production List",
    description:
      "Polished Linear-style list with all metadata inline: momentum, deadline, horizon, multi-segment bar, sweep animation, and expand.",
    question: "What does a truly production-ready milestone list look like?",
    traits: ["Production", "Linear-style"],
    category: "hybrid",
    component: DesignProductionList,
  },
  {
    id: "h6",
    name: "Waterfall Timeline",
    description:
      "Vertical timeline with large colored nodes. Expand to see feedback items cascade in with staggered animation and checkmark states.",
    question: "Can staggered reveal of items create a waterfall effect?",
    traits: ["Timeline + Waterfall", "Staggered"],
    category: "hybrid",
    component: DesignWaterfallTimeline,
  },
  {
    id: "h7",
    name: "KPI Tiles + Detail",
    description:
      "Dashboard metric tiles in a grid. Click any tile to expand a detail panel below with progress ring and linked feedback.",
    question: "Can metric tiles serve as both overview and navigation?",
    traits: ["KPI + Expand", "Grid"],
    category: "hybrid",
    component: DesignKPITiles,
  },
  {
    id: "h8",
    name: "Stacked Timeline",
    description:
      "Stacked depth cards along a vertical timeline spine. Cards have subtle depth layering and expand with color shadow.",
    question: "Can depth stacking work along a timeline axis?",
    traits: ["Stacked + Timeline", "Layered"],
    category: "hybrid",
    component: DesignStackedTimeline,
  },
  {
    id: "h9",
    name: "Editorial Accordion",
    description:
      "Serif typography with big percentage numbers in a left column, editorial names, and color-wash accordion expansion.",
    question: "Can editorial refinement and accordion detail coexist?",
    traits: ["Editorial + Accordion", "Typography"],
    category: "hybrid",
    component: DesignEditorialAccordion,
  },
  {
    id: "h10",
    name: "Compact Rail",
    description:
      "Horizontal scrollable pill rail for quick scanning. Click any pill to show a rich detail card below with multi-segment progress.",
    question: "Can a scrollable rail replace a full timeline view?",
    traits: ["Rail + Detail", "Scrollable"],
    category: "hybrid",
    component: DesignCompactRail,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function DesignCell({ design }: { design: DesignEntry }) {
  const [favorited, setFavorited] = useState(false);

  return (
    <div className="group relative rounded-2xl border bg-card p-4 transition-all hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">{design.name}</h3>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {design.description}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70 italic">
            {design.question}
          </p>
        </div>
        <button
          className={cn(
            "shrink-0 rounded-full p-1.5 transition-colors",
            favorited
              ? "text-pink-500"
              : "text-muted-foreground/30 hover:text-pink-400"
          )}
          onClick={() => setFavorited(!favorited)}
          type="button"
        >
          <HeartIcon
            className="h-4 w-4"
            weight={favorited ? "fill" : "regular"}
          />
        </button>
      </div>
      <div className="mb-3 flex gap-1.5">
        {design.traits.map((trait) => (
          <span
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            key={trait}
          >
            {trait}
          </span>
        ))}
      </div>
      <div className="min-h-30 rounded-xl border bg-background p-3">
        <design.component />
      </div>
    </div>
  );
}

export default function MilestoneTimelineDesignExploration() {
  const favorites = DESIGNS.filter((d) => d.category === "favorite");
  const hybrids = DESIGNS.filter((d) => d.category === "hybrid");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12">
          <h1 className="font-bold text-3xl tracking-tight">
            Milestone / Timeline Design Exploration
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Round 2: {DESIGNS.length} designs. 7 favorites from the first round,
            plus {hybrids.length} new hybrid explorations that combine the best
            elements into deeper, more production-ready variants.
          </p>
        </div>

        <section className="mb-16">
          <div className="mb-6">
            <h2 className="font-bold text-xl tracking-tight">Favorites</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              The 7 designs selected from Round 1 as the strongest directions.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {favorites.map((design) => (
              <DesignCell design={design} key={design.id} />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-6">
            <h2 className="font-bold text-xl tracking-tight">
              Hybrid Explorations
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              New designs combining the best elements: editorial typography +
              timeline structure, sweep animation + accordion detail, dashboard
              KPIs + chronological flow, and more.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {hybrids.map((design) => (
              <DesignCell design={design} key={design.id} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
