"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Text } from "@/components/ui/typography";
import { InsightCard } from "@/features/intelligence/components/insight-card";
import { ScanStatusBanner } from "@/features/intelligence/components/scan-status-banner";

const INSIGHT_STATUS_FILTERS = [
  "new",
  "reviewed",
  "dismissed",
  "converted_to_feedback",
] as const;
type InsightStatusFilter = (typeof INSIGHT_STATUS_FILTERS)[number];

const isInsightStatusFilter = (value: string): value is InsightStatusFilter =>
  (INSIGHT_STATUS_FILTERS as readonly string[]).includes(value);

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

export default function IntelligencePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const [statusFilter, setStatusFilter] = useState("new");

  const resolvedStatusFilter = isInsightStatusFilter(statusFilter)
    ? statusFilter
    : undefined;

  const insights = useQuery(
    api.intelligence.insights.list,
    org?._id
      ? {
          organizationId: org._id,
          status: statusFilter === "all" ? undefined : resolvedStatusFilter,
        }
      : "skip"
  );

  const config = useQuery(
    api.intelligence.config.get,
    org?._id ? { organizationId: org._id } : "skip"
  );

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

  if (!org) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  const hasConfig = config !== undefined && config !== null;

  return (
    <div className="admin-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Intelligence</H1>
          <Text variant="bodySmall">
            AI-powered competitive intelligence and market insights
          </Text>
        </div>
        {!hasConfig && (
          <Button
            onClick={() =>
              router.push(`/dashboard/${orgSlug}/intelligence/settings`)
            }
            variant="default"
          >
            Set Up Intelligence
          </Button>
        )}
      </div>

      {hasConfig && (
        <ScanStatusBanner organizationId={org._id} orgSlug={orgSlug} />
      )}

      {hasConfig ? (
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
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Text variant="bodyLarge">No intelligence configured yet</Text>
          <Text className="mt-2 max-w-md" variant="bodySmall">
            Set up competitor tracking, community monitoring, and AI-powered
            insights to stay ahead of your market.
          </Text>
          <Button
            className="mt-6"
            onClick={() =>
              router.push(`/dashboard/${orgSlug}/intelligence/settings`)
            }
            variant="default"
          >
            Get Started
          </Button>
        </div>
      )}
    </div>
  );
}
