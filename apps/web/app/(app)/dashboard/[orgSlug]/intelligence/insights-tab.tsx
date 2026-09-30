"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Lightbulb } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { InsightCard } from "@/features/intelligence/components/insight-card";
import { ScanStatusBanner } from "@/features/intelligence/components/scan-status-banner";

type InsightStatusFilter = "new" | "reviewed" | "dismissed" | "all";

const EMPTY_TITLES: Record<InsightStatusFilter, string> = {
  all: "No insights yet",
  dismissed: "No dismissed insights",
  new: "No new insights",
  reviewed: "No reviewed insights",
};

function InsightsList({
  insights,
  statusFilter,
  onDismiss,
  onConvert,
}: {
  insights:
    | {
        _id: Id<"intelligenceInsights">;
        type: string;
        title: string;
        summary: string;
        priority: string;
        status: string;
        suggestedFeedbackTitle?: string;
        createdAt: number;
      }[]
    | undefined;
  statusFilter: InsightStatusFilter;
  onDismiss: (id: Id<"intelligenceInsights">) => void;
  onConvert: (id: Id<"intelligenceInsights">) => void;
}) {
  if (insights === undefined) {
    return (
      <div aria-label="Loading insights" className="space-y-4" role="status">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-40 w-full rounded-lg" key={id} />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia>
            <Lightbulb aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>{EMPTY_TITLES[statusFilter]}</EmptyTitle>
          <EmptyDescription>
            {statusFilter === "dismissed"
              ? "Insights you dismiss are kept here."
              : "New insights appear after the next intelligence scan."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
  const [statusFilter, setStatusFilter] = useState<InsightStatusFilter>("new");

  const insights = useQuery(api.intelligence.insights.list, {
    organizationId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const dismissInsight = useMutation(api.intelligence.insights.dismiss);
  const convertToFeedback = useMutation(
    api.intelligence.insights.convertToFeedback
  );

  const handleDismiss = async (insightId: Id<"intelligenceInsights">) => {
    try {
      await dismissInsight({ insightId });
    } catch {
      toast.error("Couldn’t dismiss the insight. Try again.");
    }
  };

  const handleConvert = async (insightId: Id<"intelligenceInsights">) => {
    try {
      await convertToFeedback({ insightId });
      toast.success("Feedback created from insight");
    } catch {
      toast.error("Couldn’t convert the insight. Try again.");
    }
  };

  return (
    <div className="space-y-4">
      <ScanStatusBanner organizationId={organizationId} orgSlug={orgSlug} />

      <Tabs onValueChange={setStatusFilter} value={statusFilter}>
        <TabsList>
          <TabsTab value="new">New</TabsTab>
          <TabsTab value="reviewed">Reviewed</TabsTab>
          <TabsTab value="dismissed">Dismissed</TabsTab>
          <TabsTab value="all">All</TabsTab>
        </TabsList>

        <TabsPanel className="mt-4" value={statusFilter}>
          <InsightsList
            insights={insights}
            onConvert={handleConvert}
            onDismiss={handleDismiss}
            statusFilter={statusFilter}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
