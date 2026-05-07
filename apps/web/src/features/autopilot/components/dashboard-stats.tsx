"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconArrowUp,
  IconChecks,
  IconClock,
  IconCrown,
  IconCurrencyDollar,
  IconInbox,
  IconLoader2,
  IconStack2,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import type { ComponentType } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function ProgressArc({ ratio, warn }: { ratio: number; warn: boolean }) {
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - clampedRatio * circumference;

  return (
    <svg
      aria-hidden="true"
      className="absolute -right-1 -bottom-1 size-10 -rotate-90 opacity-40"
      role="presentation"
      viewBox="0 0 40 40"
    >
      <circle
        className="stroke-border"
        cx="20"
        cy="20"
        fill="none"
        r="18"
        strokeWidth="2.5"
      />
      <circle
        className={cn(
          "transition-colors duration-700",
          warn ? "stroke-amber-500" : "stroke-primary"
        )}
        cx="20"
        cy="20"
        fill="none"
        r="18"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function QueueSegments({
  atCap,
  cap,
  count,
  nearCap,
}: {
  atCap: boolean;
  cap: number;
  count: number;
  nearCap: boolean;
}) {
  const segmentCount = Math.max(cap, 1);
  const filledCount = Math.min(count, segmentCount);

  return (
    <div
      aria-valuemax={cap}
      aria-valuemin={0}
      aria-valuenow={count}
      className="flex h-1.5 flex-1 gap-0.5"
      role="progressbar"
    >
      {Array.from({ length: segmentCount }, (_, segmentIndex) => {
        const segmentNumber = segmentIndex + 1;
        const filled = segmentNumber <= filledCount;
        return (
          <span
            aria-hidden="true"
            className={cn(
              "min-w-0 flex-1 rounded-full bg-muted transition-colors",
              filled && atCap && "bg-red-500",
              filled && nearCap && "bg-amber-500",
              filled && !(atCap || nearCap) && "bg-primary/60"
            )}
            key={`queue-segment-${segmentNumber}`}
          />
        );
      })}
    </div>
  );
}

interface StatCard {
  accent?: string;
  caption?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  ratio?: number;
  value: string;
  warn: boolean;
}

export function DashboardStats({
  baseUrl,
  organizationId,
}: {
  baseUrl?: string;
  organizationId: Id<"organizations">;
}) {
  const stats = useQuery(api.autopilot.queries.dashboard.getDashboardStats, {
    organizationId,
  });

  const billing = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });

  if (stats === undefined) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-xl"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const costRatio = stats.dailyCostCapUsd
    ? stats.costUsedTodayUsd / stats.dailyCostCapUsd
    : 0;
  const taskRatio =
    stats.maxTasksPerDay > 0 ? stats.tasksUsedToday / stats.maxTasksPerDay : 0;
  const totalPending = stats.todoCount + stats.inProgressCount;
  const totalCapRatio =
    stats.maxPendingTasksTotal > 0
      ? totalPending / stats.maxPendingTasksTotal
      : 0;

  const cards: StatCard[] = [
    {
      label: "Tasks",
      value: String(stats.tasksUsedToday),
      caption: `of ${String(stats.maxTasksPerDay)} today`,
      icon: IconStack2,
      ratio: taskRatio,
      warn: taskRatio > 0.8,
    },
    {
      label: "Cost",
      value: formatCost(stats.costUsedTodayUsd),
      caption: stats.dailyCostCapUsd
        ? `cap ${formatCost(stats.dailyCostCapUsd)}`
        : "no cap",
      icon: IconCurrencyDollar,
      ratio: costRatio,
      warn: costRatio > 0.8,
    },
    {
      label: "Pending",
      value: String(totalPending),
      caption: `of ${String(stats.maxPendingTasksTotal)} active cap`,
      icon: IconClock,
      ratio: totalCapRatio,
      warn: totalCapRatio > 0.8,
    },
    {
      label: "In Progress",
      value: String(stats.inProgressCount),
      icon: IconLoader2,
      warn: false,
      accent: stats.inProgressCount > 0 ? "text-blue-500" : undefined,
    },
    {
      label: "Completed",
      value: String(stats.doneCount),
      icon: IconChecks,
      warn: false,
      accent: stats.doneCount > 0 ? "text-emerald-500" : undefined,
    },
    {
      label: "Inbox",
      value: String(stats.pendingReviewCount),
      icon: IconInbox,
      warn: stats.pendingReviewCount > 0,
      accent: stats.pendingReviewCount > 0 ? "text-amber-500" : undefined,
    },
  ];

  const pendingTasksByAgent = stats.itemsByAgent ?? {};
  const agentEntries = Object.entries(pendingTasksByAgent);
  const perAgentCap = stats.maxPendingTasksPerAgent;

  return (
    <div className="space-y-3">
      {/* Plan indicator */}
      {billing && (
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
          <div className="flex items-center gap-2">
            <IconCrown className="size-4 text-amber-500" />
            <span className="font-medium text-sm capitalize">
              {billing.tier} Plan
            </span>
          </div>
          {baseUrl && (
            <Link
              className="text-muted-foreground text-xs hover:text-foreground"
              href={baseUrl.replace("/autopilot", "/settings/billing")}
            >
              Manage billing
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors",
              card.warn && "border-amber-500/20 bg-amber-500/[0.03]"
            )}
            key={card.label}
          >
            {card.ratio !== undefined && (
              <ProgressArc ratio={card.ratio} warn={card.warn} />
            )}
            <div className="flex items-center gap-1.5">
              <card.icon
                className={cn(
                  "size-3.5 text-muted-foreground/60",
                  card.warn && "text-amber-500/70"
                )}
              />
              <span className="text-muted-foreground text-xs tracking-wide">
                {card.label}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-3xl leading-none tracking-tight",
                card.warn && "text-amber-600 dark:text-amber-400",
                !card.warn && card.accent
              )}
            >
              {card.value}
            </p>
            {card.caption && (
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                {card.caption}
              </p>
            )}
            {card.warn && (
              <IconArrowUp className="absolute top-3 right-3 size-3 text-amber-500/50" />
            )}
          </div>
        ))}
      </div>

      {/* Limit warning banners */}
      {taskRatio >= 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
          <IconAlertTriangle className="size-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-red-600 text-sm dark:text-red-400">
              Daily task limit reached — agents paused until tomorrow
            </p>
            <p className="text-muted-foreground text-xs">
              {stats.tasksUsedToday} / {stats.maxTasksPerDay} tasks used today
            </p>
          </div>
          {baseUrl && (
            <Link
              className="shrink-0 font-medium text-red-600 text-xs underline underline-offset-4 dark:text-red-400"
              href={`${baseUrl}/settings`}
            >
              Adjust limits
            </Link>
          )}
        </div>
      )}
      {costRatio >= 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
          <IconAlertTriangle className="size-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-red-600 text-sm dark:text-red-400">
              Daily cost cap reached — agents paused until tomorrow
            </p>
            <p className="text-muted-foreground text-xs">
              {formatCost(stats.costUsedTodayUsd)} /{" "}
              {formatCost(stats.dailyCostCapUsd ?? 0)} used today
            </p>
          </div>
          {baseUrl && (
            <Link
              className="shrink-0 font-medium text-red-600 text-xs underline underline-offset-4 dark:text-red-400"
              href={`${baseUrl}/settings`}
            >
              Adjust limits
            </Link>
          )}
        </div>
      )}

      {agentEntries.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Queue by Agent
          </p>
          <div className="space-y-2.5">
            {agentEntries.map(([agent, rawCount]) => {
              const count = typeof rawCount === "number" ? rawCount : 0;
              const ratio = perAgentCap > 0 ? count / perAgentCap : 0;
              const atCap = ratio >= 1;
              const nearCap = ratio > 0.5 && !atCap;

              return (
                <div className="flex items-center gap-3" key={agent}>
                  <span className="w-20 truncate font-medium text-[13px] capitalize">
                    {agent}
                  </span>
                  <QueueSegments
                    atCap={atCap}
                    cap={perAgentCap}
                    count={count}
                    nearCap={nearCap}
                  />
                  <span
                    className={cn(
                      "w-10 text-right font-mono text-[11px]",
                      atCap && "text-red-500",
                      nearCap && "text-amber-500",
                      !(atCap || nearCap) && "text-muted-foreground"
                    )}
                  >
                    {count}/{perAgentCap}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
