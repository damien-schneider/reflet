"use client";

import {
  IconInbox,
  IconMap,
  IconSettings,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
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

function DashboardChartsFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton
          className="h-[300px] w-full rounded-xl"
          key={`dashboard-chart-${String(index)}`}
        />
      ))}
    </div>
  );
}

const DashboardCharts = dynamic(
  () =>
    import("@/features/autopilot/components/dashboard-charts").then(
      (module) => module.DashboardCharts
    ),
  {
    loading: DashboardChartsFallback,
    ssr: false,
  }
);

export default function AutopilotDashboardPage() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  return (
    <div className="space-y-6">
      <DashboardStats baseUrl={baseUrl} organizationId={organizationId} />

      <OnboardingChecklist baseUrl={baseUrl} organizationId={organizationId} />

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

      <DashboardCharts organizationId={organizationId} />
    </div>
  );
}
