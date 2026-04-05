"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconCheck, IconCircle, IconRocket } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface ChecklistStep {
  done: boolean;
  href?: string;
  key: string;
  label: string;
}

export function OnboardingChecklist({
  baseUrl,
  organizationId,
}: {
  baseUrl: string;
  organizationId: Id<"organizations">;
}) {
  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const readiness = useQuery(
    api.autopilot.queries.dashboard.getAgentReadiness,
    { organizationId }
  );
  const stats = useQuery(api.autopilot.queries.dashboard.getDashboardStats, {
    organizationId,
  });

  if (config === undefined || readiness === undefined || stats === undefined) {
    return null;
  }

  if (!config) {
    return null;
  }

  const steps: ChecklistStep[] = [
    {
      key: "enabled",
      label: "Enable Autopilot",
      done: config.enabled,
      href: `${baseUrl}/settings`,
    },
    {
      key: "credentials",
      label: "Configure coding adapter credentials",
      done: readiness.dev === undefined || readiness.dev.ready,
      href: `${baseUrl}/settings`,
    },
    {
      key: "agents",
      label: "Enable at least one agent",
      done:
        config.pmEnabled !== false ||
        config.ctoEnabled !== false ||
        config.devEnabled !== false ||
        config.growthEnabled !== false,
    },
    {
      key: "first_task",
      label: "First task completed",
      done: stats.doneCount > 0,
      href: `${baseUrl}/roadmap`,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (allDone) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <IconRocket className="size-4 text-primary" />
        <span className="font-medium text-sm">
          Getting Started ({completedCount}/{steps.length})
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => {
          const content = (
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                step.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
                !step.done && step.href && "hover:bg-accent"
              )}
              key={step.key}
            >
              {step.done ? (
                <IconCheck className="size-4 shrink-0 text-green-500" />
              ) : (
                <IconCircle className="size-4 shrink-0 text-muted-foreground/40" />
              )}
              {step.label}
            </div>
          );

          if (!step.done && step.href) {
            return (
              <Link href={step.href} key={step.key}>
                {content}
              </Link>
            );
          }

          return content;
        })}
      </div>
    </div>
  );
}
