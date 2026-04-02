"use client";

import {
  type InsightStatusFilter,
  isInsightStatusFilter,
} from "@app/(app)/dashboard/[orgSlug]/intelligence/_components/intelligence-constants";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/typography";
import { InsightCard } from "@/features/intelligence/components/insight-card";
import { ScanStatusBanner } from "@/features/intelligence/components/scan-status-banner";
import { GitHubConnectHint } from "@/shared/components/github-connect-hint";

function InsightsList({
  insights,
  statusFilter,
  onDismiss,
  onConvert,
}: {
  insights:
    | {
        _id: string;
        type: string;
        title: string;
        summary: string;
        priority: string;
        status: string;
        suggestedFeedbackTitle?: string;
        createdAt: number;
      }[]
    | undefined;
  statusFilter: string;
  onDismiss: (id: string) => void;
  onConvert: (id: string) => void;
}) {
  if (insights === undefined) {
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-32 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-center">
        <Text variant="bodySmall">
          No {statusFilter === "all" ? "" : statusFilter} insights yet. Insights
          will appear after your next intelligence scan.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard
          insight={insight}
          key={insight._id}
          onConvert={() => onConvert(insight._id)}
          onDismiss={() => onDismiss(insight._id)}
        />
      ))}
    </div>
  );
}

export function InsightsTab({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const [statusFilter, setStatusFilter] = useState("new");

  const resolvedStatusFilter: InsightStatusFilter | undefined =
    isInsightStatusFilter(statusFilter) ? statusFilter : undefined;

  const insights = useQuery(api.intelligence.insights.list, {
    organizationId,
    status: statusFilter === "all" ? undefined : resolvedStatusFilter,
  });

  const config = useQuery(api.intelligence.config.get, { organizationId });

  const dismissInsight = useMutation(api.intelligence.insights.dismiss);
  const convertToFeedback = useMutation(
    api.intelligence.insights.convertToFeedback
  );

  const handleDismiss = async (insightId: string) => {
    try {
      await dismissInsight({
        insightId: insightId as Id<"intelligenceInsights">,
      });
      toast.success("Insight dismissed");
    } catch (error: unknown) {
      toast.error("Failed to dismiss insight", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const handleConvert = async (insightId: string) => {
    try {
      await convertToFeedback({
        insightId: insightId as Id<"intelligenceInsights">,
      });
      toast.success("Feedback item created from insight");
    } catch (error: unknown) {
      toast.error("Failed to convert insight", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const hasConfig = config !== undefined && config !== null;

  if (!hasConfig) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Text variant="bodyLarge">No intelligence configured yet</Text>
        <Text className="mt-2 max-w-md" variant="bodySmall">
          Go to the Settings tab to configure scanning, then insights will
          appear here.
        </Text>
        <div className="mt-6 w-full max-w-md space-y-4">
          <GitHubConnectHint
            description="keywords and competitors from your codebase"
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScanStatusBanner organizationId={organizationId} orgSlug={orgSlug} />

      <Tabs onValueChange={setStatusFilter} value={statusFilter}>
        <TabsList variant="line">
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value={statusFilter}>
          <InsightsList
            insights={insights}
            onConvert={handleConvert}
            onDismiss={handleDismiss}
            statusFilter={statusFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
