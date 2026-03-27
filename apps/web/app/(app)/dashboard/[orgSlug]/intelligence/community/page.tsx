"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Text } from "@/components/ui/typography";
import { KeywordManager } from "@/features/intelligence/components/keyword-manager";

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

export default function CommunityPulsePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const [sourceFilter, setSourceFilter] = useState("all");

  const signalGroups = useQuery(
    api.intelligence.community.getSignalsByTopic,
    org?._id
      ? {
          organizationId: org._id,
          source: sourceFilter as "reddit" | "web" | "all",
        }
      : "skip"
  );

  const trending = useQuery(
    api.intelligence.community.getTrendingTopics,
    org?._id ? { organizationId: org._id } : "skip"
  );

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
        <H1>Community Pulse</H1>
        <Text variant="bodySmall">
          Monitor Reddit, forums, and the web for discussions about your product
          space
        </Text>
      </div>

      {/* Trending Overview */}
      {trending && !Array.isArray(trending) && trending.totalSignals > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mb-8">
        <KeywordManager organizationId={org._id} />
      </div>

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
          No community signals yet. Add keywords and enable Reddit or web search
          scanning in your intelligence settings to start monitoring.
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
