"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Binoculars, CaretDown, CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useId, useState } from "react";
import { TagBadge } from "@/components/tag-badge";

const TYPE_LABEL: Record<string, string> = {
  battlecard: "Battlecard",
  competitive_alert: "Competitive alert",
  feature_suggestion: "Feature suggestion",
  market_opportunity: "Market opportunity",
  risk_warning: "Risk warning",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "red",
  high: "orange",
  low: "gray",
  medium: "yellow",
};

interface FeedbackIntelligenceSectionProps {
  feedbackId: Id<"feedback">;
  organizationId: string;
}

export const FeedbackIntelligenceSection = (
  props: FeedbackIntelligenceSectionProps
) => {
  const { feedbackId } = props;
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  const insights = useQuery(
    api.intelligence.feedback_integration.getInsightsForFeedback,
    { feedbackId }
  );

  const signals = useQuery(
    api.intelligence.feedback_integration.getSignalsForFeedback,
    { feedbackId }
  );

  const competitorStatus = useQuery(
    api.intelligence.feedback_integration.getCompetitorStatusForFeedback,
    { feedbackId }
  );

  const hasInsights = insights && insights.length > 0;
  const hasSignals = signals && signals.length > 0;
  const hasCompetitorData =
    competitorStatus !== null && competitorStatus !== undefined;

  const hasAnyData = hasInsights || hasSignals || hasCompetitorData;

  if (!hasAnyData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          onClick={() => setIsOpen((prev) => !prev)}
          type="button"
        >
          {isOpen ? (
            <CaretDown aria-hidden className="size-4 text-muted-foreground" />
          ) : (
            <CaretRight aria-hidden className="size-4 text-muted-foreground" />
          )}
          <Binoculars aria-hidden className="size-4 text-muted-foreground" />
          <CardTitle>Intelligence</CardTitle>
          {hasInsights && (
            <TagBadge color="blue">
              <span className="tabular-nums">{insights.length}</span> insight
              {insights.length === 1 ? "" : "s"}
            </TagBadge>
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4" id={contentId}>
          {hasInsights && (
            <section className="space-y-2">
              <h4 className="font-medium text-muted-foreground text-xs">
                Related insights
              </h4>
              <ul className="space-y-2">
                {insights.map(
                  (insight: NonNullable<typeof insights>[number]) => (
                    <li
                      className="flex flex-col gap-1 rounded-md border p-2"
                      key={insight._id}
                    >
                      <div className="flex items-center gap-1.5">
                        <TagBadge
                          color={PRIORITY_COLOR[insight.priority] ?? "gray"}
                        >
                          {PRIORITY_LABEL[insight.priority] ?? insight.priority}
                        </TagBadge>
                        <TagBadge color="blue">
                          {TYPE_LABEL[insight.type] ?? insight.type}
                        </TagBadge>
                      </div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-pretty text-muted-foreground text-xs">
                        {insight.summary}
                      </p>
                    </li>
                  )
                )}
              </ul>
            </section>
          )}

          {hasSignals && (
            <section className="space-y-1">
              <h4 className="font-medium text-muted-foreground text-xs">
                Community signals
              </h4>
              <p className="text-sm">
                <span className="font-semibold tabular-nums">
                  {signals.length}
                </span>{" "}
                related signal{signals.length === 1 ? "" : "s"} from the
                community
              </p>
            </section>
          )}

          {hasCompetitorData && (
            <section className="space-y-1">
              <h4 className="font-medium text-muted-foreground text-xs">
                Competitor status
              </h4>
              <p className="text-sm tabular-nums">
                <span className="font-semibold">
                  {competitorStatus.competitorsWithFeature}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {competitorStatus.totalCompetitors}
                </span>{" "}
                competitors have this feature
              </p>
            </section>
          )}
        </CardContent>
      )}
    </Card>
  );
};
