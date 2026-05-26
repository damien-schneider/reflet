"use client";

import { ActivityPanel } from "@/features/autopilot/components/activity-panel";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { ChainBlockersBanner } from "@/features/autopilot/components/chain-blockers-banner";
import { ChainTechTree } from "@/features/autopilot/components/chain-tech-tree";
import { ChainRuntimeView } from "@/features/autopilot/components/runtime/chain-runtime-view";

export default function AutopilotChainPage() {
  const { organizationId, isAdmin, orgSlug } = useAutopilotContext();
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  if (!isAdmin) {
    return (
      <div className="text-muted-foreground text-sm">
        Admin-only view. The document chain is the underlying mechanism that
        drives the autopilot. It stays under the hood for non-admin users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChainRuntimeView
        baseUrl={baseUrl}
        isAdmin={isAdmin}
        organizationId={organizationId}
      />

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-lg">Dependency graph</h2>
          <p className="text-muted-foreground text-xs">
            Canonical deliverables and the dependency order that wakes each role
            skill.
          </p>
        </div>
        <ChainBlockersBanner
          organizationId={organizationId}
          orgSlug={orgSlug}
        />
        <ChainTechTree isAdmin={isAdmin} organizationId={organizationId} />
      </section>

      <section className="space-y-3 pt-2">
        <div>
          <h2 className="font-semibold text-lg">Audit log</h2>
          <p className="text-muted-foreground text-xs">
            Raw runtime events remain searchable, but scheduling truth comes
            from execution records.
          </p>
        </div>
        <ActivityPanel organizationId={organizationId} />
      </section>
    </div>
  );
}
