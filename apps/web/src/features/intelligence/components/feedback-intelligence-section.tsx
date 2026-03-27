"use client";

import { Binoculars, CaretDown, CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABEL: Record<string, string> = {
  feature_suggestion: "Feature Suggestion",
  competitive_alert: "Competitive Alert",
  market_opportunity: "Market Opportunity",
  risk_warning: "Risk Warning",
  battlecard: "Battlecard",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "gray",
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

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <Card>
      <CardHeader>
        <button
          className="flex w-full items-center gap-2 text-left"
          onClick={toggleOpen}
          type="button"
        >
          {isOpen ? (
            <CaretDown className="size-4 text-muted-foreground" />
          ) : (
            <CaretRight className="size-4 text-muted-foreground" />
          )}
          <Binoculars className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm">Intelligence</CardTitle>
          {hasInsights && (
            <Badge color="blue">
              {insights.length} insight{insights.length === 1 ? "" : "s"}
            </Badge>
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Related Insights */}
          {hasInsights && (
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Related Insights
              </p>
              {insights.map((insight: NonNullable<typeof insights>[number]) => (
                <div
                  className="flex items-start gap-2 rounded-md border p-2"
                  key={insight._id}
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Badge color={PRIORITY_COLOR[insight.priority] ?? "gray"}>
                        {insight.priority}
                      </Badge>
                      <Badge color="blue">
                        {TYPE_LABEL[insight.type] ?? insight.type}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {insight.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Community Signals */}
          {hasSignals && (
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Community Signals
              </p>
              <p className="text-sm">
                <span className="font-semibold">{signals.length}</span> related
                signal{signals.length === 1 ? "" : "s"} from the community
              </p>
            </div>
          )}

          {/* Competitor Status */}
          {hasCompetitorData && (
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Competitor Status
              </p>
              <p className="text-sm">
                <span className="font-semibold">
                  {competitorStatus.competitorsWithFeature}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {competitorStatus.totalCompetitors}
                </span>{" "}
                competitors have this feature
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
