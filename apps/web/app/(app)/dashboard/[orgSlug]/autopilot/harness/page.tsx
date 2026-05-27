"use client";

import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { HarnessDashboard } from "@/features/autopilot/components/harness/dashboard";

export default function AutopilotHarnessPage() {
  const { organizationId, isAdmin } = useAutopilotContext();

  if (!isAdmin) {
    return (
      <div className="text-muted-foreground text-sm">
        Admin-only view. The harness exposes repo-native automation, Bridge
        jobs, and approval gates.
      </div>
    );
  }

  return <HarnessDashboard organizationId={organizationId} />;
}
