"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Text } from "@/components/ui/typography";
import { KeywordManager } from "@/features/intelligence/components/keyword-manager";

const SOURCE_FILTERS = ["all", "reddit", "web"] as const;
type SourceFilter = (typeof SOURCE_FILTERS)[number];

const isSourceFilter = (value: unknown): value is SourceFilter =>
  SOURCE_FILTERS.some((filter) => filter === value);

const VISIBLE_SIGNALS = 5;

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  competitor_update: "Competitor update",
  feature_request: "Feature request",
  market_trend: "Market trend",
  pain_point: "Pain point",
};

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  reddit: "Reddit",
  web: "Web",
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
    <div
      aria-label={`Sentiment: ${positive} positive, ${neutral} neutral, ${negative} negative`}
      className="flex h-2 w-full min-w-24 overflow-hidden rounded-full"
      role="img"
    >
      {positive > 0 && (
        <div
          className="bg-success"
          style={{ width: `${(positive / total) * 100}%` }}
        />
      )}
      {neutral > 0 && (
        <div
          className="bg-muted-foreground/40"
          style={{ width: `${(neutral / total) * 100}%` }}
        />
      )}
      {negative > 0 && (
        <div
          className="bg-destructive"
          style={{ width: `${(negative / total) * 100}%` }}
        />
      )}
    </div>
  );
}

export function CommunityTab({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const signalGroups = useQuery(api.intelligence.community.getSignalsByTopic, {
    organizationId,
    source: sourceFilter,
  });

  const trending = useQuery(api.intelligence.community.getTrendingTopics, {
    organizationId,
  });

  const stats =
    trending && !Array.isArray(trending) && trending.totalSignals > 0
      ? [
          { label: "Signals this week", value: trending.totalSignals },
          { label: "Pain points", value: trending.topPainPoints.length },
          {
            label: "Feature requests",
            value: trending.topFeatureRequests.length,
          },
        ]
      : null;

  return (
    <div className="space-y-6">
      {stats && trending && !Array.isArray(trending) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent>
                <dl className="flex flex-col-reverse gap-1">
                  <dt className="text-muted-foreground text-sm">
                    {stat.label}
                  </dt>
                  <dd className="font-semibold text-heading-2 tabular-nums">
                    {stat.value}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent>
              <dl className="flex flex-col-reverse gap-2">
                <dt className="text-muted-foreground text-sm">Sentiment</dt>
                <dd>
                  <SentimentBar
                    negative={trending.sentimentOverview.negative}
                    neutral={trending.sentimentOverview.neutral}
                    positive={trending.sentimentOverview.positive}
                  />
                </dd>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      <KeywordManager organizationId={organizationId} />

      <Tabs
        onValueChange={(value) => {
          if (isSourceFilter(value)) {
            setSourceFilter(value);
          }
        }}
        value={sourceFilter}
      >
        <TabsList>
          <TabsTab value="all">All sources</TabsTab>
          <TabsTab value="reddit">Reddit</TabsTab>
          <TabsTab value="web">Web</TabsTab>
        </TabsList>

        <TabsPanel className="mt-4" value={sourceFilter}>
          <SignalGroupsList signalGroups={signalGroups} />
        </TabsPanel>
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
      <div aria-label="Loading signals" className="space-y-6" role="status">
        {["a", "b"].map((id) => (
          <Card key={id}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (signalGroups.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyTitle>No community signals yet</EmptyTitle>
          <EmptyDescription>
            Add keywords above, then run a scan to find discussions about them.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {signalGroups.map((group) => (
        <Card key={group.keyword}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="min-w-0 truncate" title={group.keyword}>
                {group.keyword}
              </CardTitle>
              <div className="flex shrink-0 items-center gap-3">
                <Badge size="sm" variant="outline">
                  <span className="tabular-nums">{group.signals.length}</span>{" "}
                  signal{group.signals.length === 1 ? "" : "s"}
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
            <ul className="space-y-3">
              {group.signals.slice(0, VISIBLE_SIGNALS).map((signal) => (
                <li className="rounded-md border p-3" key={signal._id}>
                  <div className="flex items-center gap-2">
                    <Badge size="sm" variant="outline">
                      {SOURCE_LABELS[signal.source] ?? signal.source}
                    </Badge>
                    <Badge size="sm">
                      {SIGNAL_TYPE_LABELS[signal.signalType] ??
                        signal.signalType}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium text-sm">{signal.title}</p>
                  <p className="mt-1 line-clamp-2 text-pretty text-muted-foreground text-xs">
                    {signal.content}
                  </p>
                  {signal.url && (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-brand-text text-xs underline-offset-2 hover:underline"
                      href={signal.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View source
                      <ArrowSquareOut aria-hidden className="size-3" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {group.signals.length > VISIBLE_SIGNALS && (
              <Text
                className="mt-3 text-center tabular-nums"
                variant="bodySmall"
              >
                {group.signals.length - VISIBLE_SIGNALS} more not shown
              </Text>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
