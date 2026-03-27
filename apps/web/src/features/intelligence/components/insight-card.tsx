"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRIORITY_VARIANT: Record<string, "red" | "orange" | "yellow" | "gray"> = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "gray",
};

const TYPE_VARIANT: Record<string, "blue" | "red" | "green" | "orange"> = {
  feature_suggestion: "blue",
  competitive_alert: "red",
  market_opportunity: "green",
  risk_warning: "orange",
};

const TYPE_LABEL: Record<string, string> = {
  feature_suggestion: "Feature Suggestion",
  competitive_alert: "Competitive Alert",
  market_opportunity: "Market Opportunity",
  risk_warning: "Risk Warning",
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "just now";
};

interface InsightCardProps {
  insight: {
    _id: string;
    type: string;
    title: string;
    summary: string;
    priority: string;
    status: string;
    competitorIds?: string[];
    suggestedFeedbackTitle?: string;
    createdAt: number;
  };
  onConvert: () => void;
  onDismiss: () => void;
}

export function InsightCard({
  insight,
  onDismiss,
  onConvert,
}: InsightCardProps) {
  const priorityVariant = PRIORITY_VARIANT[insight.priority] ?? "gray";
  const typeVariant = TYPE_VARIANT[insight.type] ?? "blue";
  const typeLabel = TYPE_LABEL[insight.type] ?? insight.type;

  const canConvert =
    insight.suggestedFeedbackTitle !== undefined &&
    insight.status !== "converted_to_feedback";
  const canDismiss = insight.status !== "dismissed";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge color={typeVariant}>{typeLabel}</Badge>
              <Badge color={priorityVariant}>
                {insight.priority.charAt(0).toUpperCase() +
                  insight.priority.slice(1)}
              </Badge>
            </div>
            <CardTitle>{insight.title}</CardTitle>
          </div>
          <span className="shrink-0 text-muted-foreground text-xs">
            {formatRelativeTime(insight.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{insight.summary}</p>
        <div className="mt-3 flex items-center gap-2">
          {canConvert && (
            <Button onClick={onConvert} size="sm" variant="outline">
              <ArrowRight data-icon="inline-start" />
              Convert to Feedback
            </Button>
          )}
          {canDismiss && (
            <Button onClick={onDismiss} size="sm" variant="ghost">
              <X data-icon="inline-start" />
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
