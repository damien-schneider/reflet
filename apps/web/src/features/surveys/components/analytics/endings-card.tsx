import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { FlagCheckered } from "@phosphor-icons/react";
import { AnalyticsCardTitle } from "@/features/surveys/components/analytics/analytics-card-title";
import {
  numberFormat,
  percentFormat,
  type SurveyAnalytics,
  shareOf,
} from "@/features/surveys/components/analytics/analytics-summary";

interface EndingsCardProps {
  completedResponses: number;
  endings: SurveyAnalytics["endings"];
}

export function EndingsCard({ completedResponses, endings }: EndingsCardProps) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <AnalyticsCardTitle icon={FlagCheckered} id="endings-heading">
          Endings
        </AnalyticsCardTitle>
        <ul aria-labelledby="endings-heading" className="flex flex-col gap-4">
          {endings.map((ending) => {
            const share = shareOf(ending.count, completedResponses);
            return (
              <li className="flex flex-col gap-1.5" key={ending.endingId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate" title={ending.title}>
                    {ending.title}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    <span className="font-medium text-foreground">
                      {numberFormat.format(ending.count)}
                    </span>{" "}
                    {percentFormat.format(share)}
                  </span>
                </div>
                <div
                  aria-hidden
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-chart-1"
                    style={{ width: `${share * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
