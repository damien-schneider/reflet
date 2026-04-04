"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconArrowUp,
  IconChecks,
  IconClock,
  IconCurrencyDollar,
  IconInbox,
  IconLoader2,
  IconStack2,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
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
          "transition-all duration-700",
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
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const stats = useQuery(api.autopilot.queries.dashboard.getDashboardStats, {
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
  const totalPending = stats.pendingTaskCount;
  const totalCap = stats.maxPendingTasksTotal ?? 5;
  const totalCapRatio = totalCap > 0 ? totalPending / totalCap : 0;

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
      caption: `of ${String(totalCap)} slots`,
      icon: IconClock,
      ratio: totalCapRatio,
      warn: totalCapRatio > 0.8,
    },
    {
      label: "In Progress",
      value: String(stats.inProgressTaskCount),
      icon: IconLoader2,
      warn: false,
      accent: stats.inProgressTaskCount > 0 ? "text-blue-500" : undefined,
    },
    {
      label: "Completed",
      value: String(stats.completedTaskCount),
      icon: IconChecks,
      warn: false,
      accent: stats.completedTaskCount > 0 ? "text-emerald-500" : undefined,
    },
    {
      label: "Inbox",
      value: String(stats.pendingInboxCount),
      icon: IconInbox,
      warn: stats.pendingInboxCount > 0,
      accent: stats.pendingInboxCount > 0 ? "text-amber-500" : undefined,
    },
  ];

  const pendingTasksByAgent = stats.pendingTasksByAgent ?? {};
  const agentEntries = Object.entries(pendingTasksByAgent);
  const perAgentCap = stats.maxPendingTasksPerAgent ?? 2;

  return (
    <div className="space-y-3">
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

      {agentEntries.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Queue by Agent
          </p>
          <div className="space-y-2.5">
            {agentEntries.map(([agent, count]) => {
              const ratio = perAgentCap > 0 ? count / perAgentCap : 0;
              const atCap = ratio >= 1;
              const nearCap = ratio > 0.5 && !atCap;

              return (
                <div className="flex items-center gap-3" key={agent}>
                  <span className="w-20 truncate font-medium text-[13px] capitalize">
                    {agent}
                  </span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        atCap && "bg-red-500",
                        nearCap && "bg-amber-500",
                        !(atCap || nearCap) && "bg-primary/60"
                      )}
                      style={{
                        width: `${String(Math.min(ratio * 100, 100))}%`,
                      }}
                    />
                  </div>
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
