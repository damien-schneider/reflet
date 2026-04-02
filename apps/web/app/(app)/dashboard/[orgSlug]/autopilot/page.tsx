"use client";

import { H2 } from "@/components/ui/typography";
import { ActivityFeed } from "@/features/autopilot/components/activity-feed";
import { AgentStatusCards } from "@/features/autopilot/components/agent-status-cards";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DashboardStats } from "@/features/autopilot/components/dashboard-stats";

export default function AutopilotDashboardPage() {
  const { organizationId } = useAutopilotContext();

  return (
    <div className="space-y-8">
      <DashboardStats organizationId={organizationId} />

      <section>
        <H2 className="mb-4" variant="card">
          Agent Status
        </H2>
        <AgentStatusCards organizationId={organizationId} />
      </section>

      <section>
        <H2 className="mb-4" variant="card">
          Activity Feed
        </H2>
        <ActivityFeed organizationId={organizationId} />
      </section>
    </div>
  );
}
