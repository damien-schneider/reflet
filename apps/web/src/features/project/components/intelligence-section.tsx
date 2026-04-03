"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";

interface IntelligenceSectionProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function IntelligenceSection({
  organizationId,
  orgSlug,
}: IntelligenceSectionProps) {
  const config = useQuery(api.autopilot.intelligence.config.get, {
    organizationId,
  });

  const hasConfig = config !== undefined && config !== null;

  return (
    <div className="space-y-4">
      {hasConfig ? (
        <IntelligenceSettings organizationId={organizationId} />
      ) : (
        <div className="flex flex-col items-center rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Set up competitor tracking, community monitoring, and AI-powered
            insights.
          </p>
          <Link href={`/dashboard/${orgSlug}/autopilot/intelligence`}>
            <Button className="mt-4" size="sm" variant="default">
              Set Up Intelligence
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
