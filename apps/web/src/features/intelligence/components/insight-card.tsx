"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { ArrowRight, X } from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { TagBadge } from "@/components/tag-badge";

const PRIORITY_COLOR: Record<string, "red" | "orange" | "yellow" | "gray"> = {
  critical: "red",
  high: "orange",
  low: "gray",
  medium: "yellow",
};

const TYPE_LABEL: Record<string, string> = {
  competitive_alert: "Competitive alert",
  feature_suggestion: "Feature suggestion",
  market_opportunity: "Market opportunity",
  risk_warning: "Risk warning",
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
  const priorityLabel =
    insight.priority.charAt(0).toUpperCase() + insight.priority.slice(1);
  const isConverted = insight.status === "converted_to_feedback";
  const canConvert =
    insight.suggestedFeedbackTitle !== undefined && !isConverted;
  const canDismiss = insight.status !== "dismissed";
  const createdAt = new Date(insight.createdAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <TagBadge
              color={PRIORITY_COLOR[insight.priority] ?? "gray"}
              size="sm"
            >
              {priorityLabel}
            </TagBadge>
            <span className="truncate">
              {TYPE_LABEL[insight.type] ?? insight.type}
            </span>
          </div>
          <time
            className="shrink-0 tabular-nums"
            dateTime={createdAt.toISOString()}
            title={format(createdAt, "PPpp")}
          >
            {formatDistanceToNow(insight.createdAt, { addSuffix: true })}
          </time>
        </div>
        <CardTitle className="text-pretty">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-pretty text-muted-foreground text-sm">
          {insight.summary}
        </p>
        {isConverted ? (
          <p className="mt-3 text-muted-foreground text-xs">
            Converted to feedback
          </p>
        ) : null}
        {canConvert || canDismiss ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canConvert ? (
              <Button
                onClick={onConvert}
                size="sm"
                title={`Creates “${insight.suggestedFeedbackTitle}”`}
                variant="surface"
              >
                <ArrowRight data-icon="inline-start" />
                Convert to feedback
              </Button>
            ) : null}
            {canDismiss ? (
              <Button onClick={onDismiss} size="sm" variant="ghost">
                <X data-icon="inline-start" />
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
