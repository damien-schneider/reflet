"use client";

import {
  IconInbox,
  IconMap,
  IconSettings,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";

import { ActivityFeed } from "@/features/autopilot/components/activity-feed";
import { AgentStatusCards } from "@/features/autopilot/components/agent-status-cards";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DashboardStats } from "@/features/autopilot/components/dashboard-stats";
import { OnboardingChecklist } from "@/features/autopilot/components/onboarding-checklist";

const QUICK_ACTIONS = [
  { label: "Review Inbox", icon: IconInbox, path: "/inbox" },
  { label: "View Roadmap", icon: IconMap, path: "/roadmap" },
  { label: "Growth Hub", icon: IconTrendingUp, path: "/growth" },
  { label: "Sales Pipeline", icon: IconSparkles, path: "/sales" },
  { label: "Settings", icon: IconSettings, path: "/settings" },
] as const;

export default function AutopilotDashboardPage() {
  const { organizationId, isAdmin, orgSlug } = useAutopilotContext();
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  return (
    <div className="space-y-6">
      <DashboardStats baseUrl={baseUrl} organizationId={organizationId} />

      <OnboardingChecklist baseUrl={baseUrl} organizationId={organizationId} />

      {/* Quick Actions */}
      <section>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
              href={`${baseUrl}${action.path}`}
              key={action.path}
            >
              <action.icon className="size-4 text-muted-foreground" />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Agents
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <AgentStatusCards isAdmin={isAdmin} organizationId={organizationId} />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Activity
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <ActivityFeed organizationId={organizationId} />
      </section>
    </div>
  );
}
