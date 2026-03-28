"use client";

import { GearSix, Hash, Lightbulb, Users } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Text } from "@/components/ui/typography";
import { AddCompetitorDialog } from "@/features/intelligence/components/add-competitor-dialog";
import { CompetitorCard } from "@/features/intelligence/components/competitor-card";
import { InsightCard } from "@/features/intelligence/components/insight-card";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";
import { KeywordManager } from "@/features/intelligence/components/keyword-manager";
import { ScanStatusBanner } from "@/features/intelligence/components/scan-status-banner";
import { GitHubConnectHint } from "@/shared/components/github-connect-hint";

// ============================================
// INSIGHTS TAB
// ============================================

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

function InsightsTab({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const [statusFilter, setStatusFilter] = useState("new");

  const resolvedStatusFilter = isInsightStatusFilter(statusFilter)
    ? statusFilter
    : undefined;

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

// ============================================
// COMMUNITY TAB
// ============================================

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  pain_point: "Pain Point",
  feature_request: "Feature Request",
  market_trend: "Market Trend",
  competitor_update: "Competitor Update",
};

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  web: "Web",
  hackernews: "Hacker News",
};

function SentimentBar({
  positive,
  negative,
  neutral,
}: {
  positive: number;
  negative: number;
  neutral: number;
}) {
  const total = positive + negative + neutral;
  if (total === 0) {
    return null;
  }

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {positive > 0 && (
        <div
          className="bg-green-500"
          style={{ width: `${(positive / total) * 100}%` }}
        />
      )}
      {neutral > 0 && (
        <div
          className="bg-gray-300"
          style={{ width: `${(neutral / total) * 100}%` }}
        />
      )}
      {negative > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${(negative / total) * 100}%` }}
        />
      )}
    </div>
  );
}

function CommunityTab({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [sourceFilter, setSourceFilter] = useState("all");

  const signalGroups = useQuery(api.intelligence.community.getSignalsByTopic, {
    organizationId,
    source: sourceFilter as "reddit" | "web" | "all",
  });

  const trending = useQuery(api.intelligence.community.getTrendingTopics, {
    organizationId,
  });

  return (
    <div className="space-y-6">
      {/* Trending Overview */}
      {trending && !Array.isArray(trending) && trending.totalSignals > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="font-bold text-2xl">{trending.totalSignals}</div>
              <Text variant="bodySmall">Signals this week</Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="font-bold text-2xl">
                {trending.topPainPoints.length}
              </div>
              <Text variant="bodySmall">Pain points detected</Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="font-bold text-2xl">
                {trending.topFeatureRequests.length}
              </div>
              <Text variant="bodySmall">Feature requests found</Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <SentimentBar
                negative={trending.sentimentOverview.negative}
                neutral={trending.sentimentOverview.neutral}
                positive={trending.sentimentOverview.positive}
              />
              <Text className="mt-2" variant="bodySmall">
                Sentiment overview
              </Text>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keywords management */}
      <KeywordManager organizationId={organizationId} />

      {/* Signal feed */}
      <Tabs onValueChange={setSourceFilter} value={sourceFilter}>
        <TabsList variant="line">
          <TabsTrigger value="all">All Sources</TabsTrigger>
          <TabsTrigger value="reddit">Reddit</TabsTrigger>
          <TabsTrigger value="web">Web</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value={sourceFilter}>
          <SignalGroupsList signalGroups={signalGroups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SignalGroupsList({
  signalGroups,
}: {
  signalGroups:
    | {
        keyword: string;
        signals: {
          _id: string;
          source: string;
          signalType: string;
          title: string;
          content: string;
          url?: string;
        }[];
        sentimentBreakdown: {
          positive: number;
          negative: number;
          neutral: number;
        };
      }[]
    | undefined;
}) {
  if (signalGroups === undefined) {
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-32 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (signalGroups.length === 0) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-center">
        <Text variant="bodySmall">
          No community signals yet. Add keywords and enable scanning in the
          Settings tab.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {signalGroups.map((group) => (
        <Card key={group.keyword}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.keyword}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {group.signals.length} signal
                  {group.signals.length === 1 ? "" : "s"}
                </Badge>
                <SentimentBar
                  negative={group.sentimentBreakdown.negative}
                  neutral={group.sentimentBreakdown.neutral}
                  positive={group.sentimentBreakdown.positive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.signals.slice(0, 5).map((signal) => (
                <div
                  className="flex items-start gap-3 rounded-md border p-3"
                  key={signal._id}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {SOURCE_LABELS[signal.source] ?? signal.source}
                      </Badge>
                      <Badge variant="secondary">
                        {SIGNAL_TYPE_LABELS[signal.signalType] ??
                          signal.signalType}
                      </Badge>
                    </div>
                    <p className="mt-1 font-medium text-sm">{signal.title}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {signal.content}
                    </p>
                    {signal.url && (
                      <a
                        className="mt-1 inline-block text-blue-600 text-xs hover:underline"
                        href={signal.url}
                        rel="noopener"
                        target="_blank"
                      >
                        View source
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {group.signals.length > 5 && (
                <Text className="text-center" variant="bodySmall">
                  +{group.signals.length - 5} more signals
                </Text>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// COMPETITORS TAB
// ============================================

function CompetitorsTab({
  organizationId,
  orgSlug,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const competitors = useQuery(api.intelligence.competitors.list, {
    organizationId,
  });

  const removeCompetitor = useMutation(api.intelligence.competitors.remove);

  const handleRemove = async (competitorId: Id<"competitors">) => {
    try {
      await removeCompetitor({ id: competitorId });
      toast.success("Competitor removed");
    } catch {
      toast.error("Failed to remove competitor");
    }
  };

  if (competitors === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-48 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Text variant="bodyLarge">No competitors tracked yet</Text>
        <Text className="mt-2 max-w-md" variant="bodySmall">
          Add your first competitor to start getting AI-powered competitive
          intelligence, SWOT analysis, and feature gap detection.
        </Text>
        <AddCompetitorDialog organizationId={organizationId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddCompetitorDialog organizationId={organizationId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitors.map((competitor) => (
          <CompetitorCard
            competitor={competitor}
            key={competitor._id}
            onRemove={() => handleRemove(competitor._id)}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function IntelligencePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const [activeTab, setActiveTab] = useState("insights");

  if (!org) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8">
        <H1>Intelligence</H1>
        <Text variant="bodySmall">
          AI-powered competitive intelligence and market insights
        </Text>
      </div>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="insights">
            <Lightbulb className="mr-1.5 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="community">
            <Hash className="mr-1.5 h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <Users className="mr-1.5 h-4 w-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="settings">
            <GearSix className="mr-1.5 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="insights">
          <InsightsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="community">
          <CommunityTab organizationId={org._id} />
        </TabsContent>

        <TabsContent className="mt-6" value="competitors">
          <CompetitorsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="settings">
          <IntelligenceSettings organizationId={org._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
