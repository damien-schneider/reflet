import { cn } from "@ctrl-ui/react/lib/cn";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Chart, ChartPlot } from "@ctrl-ui/react/ui/chart";
import { areaChart } from "@ctrl-ui/react/ui/chart-cartesian";
import { ArrowDown, ArrowUp, ChartLineUp } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import { AnalyticsCardTitle } from "@/features/surveys/components/analytics/analytics-card-title";
import {
  formatDuration,
  numberFormat,
  type SurveyAnalytics,
  weekOverWeekChange,
} from "@/features/surveys/components/analytics/analytics-summary";

export function OverviewCard({ analytics }: { analytics: SurveyAnalytics }) {
  const { responsesByDay } = analytics;
  const startedLast30Days = responsesByDay.reduce(
    (sum, day) => sum + day.started,
    0
  );
  const completedLast30Days = responsesByDay.reduce(
    (sum, day) => sum + day.completed,
    0
  );
  const firstDay = responsesByDay.at(0);
  const lastDay = responsesByDay.at(-1);
  const definition = areaChart({
    data: responsesByDay,
    fill: "solid",
    formatX: (date) =>
      typeof date === "string" ? format(parseISO(date), "EEE, MMM d") : "",
    series: [
      { color: "var(--chart-2)", key: "started", label: "Started" },
      { color: "var(--chart-1)", key: "completed", label: "Completed" },
    ],
    x: "date",
    xScale: { axis: false },
    yScale: { axis: false },
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <AnalyticsCardTitle icon={ChartLineUp}>Overview</AnalyticsCardTitle>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Metric label="Responses">
            {numberFormat.format(analytics.totalResponses)}
            <ResponseTrend responsesByDay={responsesByDay} />
          </Metric>
          <Metric label="Completion rate">{analytics.completionRate}%</Metric>
          <Metric label="Median time to complete">
            {analytics.medianCompletionMs === null
              ? "—"
              : formatDuration(analytics.medianCompletionMs)}
          </Metric>
        </dl>

        <figure className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
          <figcaption className="sr-only">
            Last 30 days: {startedLast30Days} started, {completedLast30Days}{" "}
            completed
          </figcaption>
          <Chart>
            <ChartPlot
              ariaLabel="Started and completed responses per day"
              definition={definition}
              height={128}
            />
          </Chart>
          {firstDay && lastDay ? (
            <div
              aria-hidden
              className="flex justify-between text-muted-foreground text-xs tabular-nums"
            >
              <span>{format(parseISO(firstDay.date), "MMM d")}</span>
              <span>{format(parseISO(lastDay.date), "MMM d")}</span>
            </div>
          ) : null}
        </figure>

        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <LegendValue colorClassName="bg-chart-2" label="Started, 30 days">
            {numberFormat.format(startedLast30Days)}
          </LegendValue>
          <LegendValue colorClassName="bg-chart-1" label="Completed, 30 days">
            {numberFormat.format(completedLast30Days)}
          </LegendValue>
          <LegendValue
            colorClassName="bg-muted-foreground/40"
            label="Abandoned"
          >
            {numberFormat.format(analytics.abandonedResponses)}
          </LegendValue>
          <LegendValue
            colorClassName="bg-muted-foreground/20"
            label="In progress"
          >
            {numberFormat.format(analytics.inProgressResponses)}
          </LegendValue>
        </dl>
      </CardContent>
    </Card>
  );
}

function Metric({ label, children }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="flex items-baseline gap-2 font-semibold text-2xl tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function ResponseTrend({
  responsesByDay,
}: {
  responsesByDay: SurveyAnalytics["responsesByDay"];
}) {
  const percentChange = weekOverWeekChange(responsesByDay);
  if (percentChange === null) {
    return null;
  }
  if (percentChange === 0) {
    return (
      <span className="font-normal text-muted-foreground text-xs">
        Same as previous 7 days
      </span>
    );
  }
  const isUp = percentChange > 0;
  const TrendIcon = isUp ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 font-medium text-xs",
        isUp ? "text-success-text" : "text-destructive-text"
      )}
    >
      <TrendIcon aria-hidden className="size-3" weight="bold" />
      <span className="sr-only">{isUp ? "Up" : "Down"}</span>
      {Math.abs(percentChange)}% vs previous 7 days
    </span>
  );
}

function LegendValue({
  children,
  colorClassName,
  label,
}: {
  children: ReactNode;
  colorClassName: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <span
          aria-hidden
          className={cn("size-2 rounded-full", colorClassName)}
        />
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}
