import { cn } from "@ctrl-ui/react/lib/cn";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Gauge } from "@phosphor-icons/react";
import {
  NPS_DETRACTOR_MAX,
  NPS_MAX,
  NPS_MIN,
  NPS_PROMOTER_MIN,
} from "@reflet/survey-core";
import { AnalyticsCardTitle } from "@/features/surveys/components/analytics/analytics-card-title";
import {
  numberFormat,
  percentFormat,
  type SurveyAnalytics,
  shareOf,
} from "@/features/surveys/components/analytics/analytics-summary";

type NpsResult = NonNullable<SurveyAnalytics["nps"]>;

export function NpsCard({ nps }: { nps: NpsResult }) {
  const segments = [
    {
      colorClassName: "bg-success",
      count: nps.promoters,
      hint: `${NPS_PROMOTER_MIN}–${NPS_MAX}`,
      label: "Promoters",
    },
    {
      colorClassName: "bg-warning",
      count: nps.passives,
      hint: `${NPS_DETRACTOR_MAX + 1}–${NPS_PROMOTER_MIN - 1}`,
      label: "Passives",
    },
    {
      colorClassName: "bg-destructive",
      count: nps.detractors,
      hint: `${NPS_MIN}–${NPS_DETRACTOR_MAX}`,
      label: "Detractors",
    },
  ];

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-6 p-5">
        <AnalyticsCardTitle icon={Gauge}>Net Promoter Score</AnalyticsCardTitle>

        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-4xl tabular-nums">
            {nps.score ?? "—"}
          </p>
          <p className="text-muted-foreground text-sm">
            {nps.total === 0
              ? "No NPS answers yet"
              : `From ${numberFormat.format(nps.total)} ${nps.total === 1 ? "answer" : "answers"}, on a scale from −100 to 100`}
          </p>
        </div>

        {nps.total > 0 ? (
          <div
            aria-hidden
            className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
          >
            {segments
              .filter((segment) => segment.count > 0)
              .map((segment) => (
                <div
                  className={cn("h-full", segment.colorClassName)}
                  key={segment.label}
                  style={{ flexGrow: segment.count }}
                />
              ))}
          </div>
        ) : null}

        <dl className="mt-auto grid grid-cols-3 gap-4 text-sm">
          {segments.map((segment) => (
            <div className="flex flex-col gap-0.5" key={segment.label}>
              <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", segment.colorClassName)}
                />
                {segment.label}
                <span className="sr-only">(scores {segment.hint})</span>
              </dt>
              <dd className="font-medium tabular-nums">
                {numberFormat.format(segment.count)}{" "}
                <span className="font-normal text-muted-foreground">
                  {percentFormat.format(shareOf(segment.count, nps.total))}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
