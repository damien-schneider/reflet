"use client";

import { ActivityFeed } from "@/features/autopilot/components/activity-feed";
import { AgentStatusCards } from "@/features/autopilot/components/agent-status-cards";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DashboardStats } from "@/features/autopilot/components/dashboard-stats";

export default function AutopilotDashboardPage() {
  const { organizationId, isAdmin } = useAutopilotContext();

  return (
    <div className="space-y-6">
      <DashboardStats organizationId={organizationId} />

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
