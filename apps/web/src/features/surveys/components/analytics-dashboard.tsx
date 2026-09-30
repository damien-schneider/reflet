"use client";

import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ChartBar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { H3 } from "@/components/ui/typography";
import { StatCard } from "@/features/surveys/components/stat-card";

const numberFormat = new Intl.NumberFormat();
const percentFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  style: "percent",
});
const averageFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

interface AnalyticsDashboardProps {
  surveyId: Id<"surveys">;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  const analytics = useQuery(api.surveys.analytics.getAnalytics, {
    surveyId,
  });

  if (analytics === undefined) {
    return <AnalyticsSkeleton />;
  }

  if (analytics.totalResponses === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia>
            <ChartBar aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No responses yet</EmptyTitle>
          <EmptyDescription>
            Results show up here once people start answering this survey.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Responses"
          value={numberFormat.format(analytics.totalResponses)}
        />
        <StatCard
          label="Completed"
          value={numberFormat.format(analytics.completedResponses)}
        />
        <StatCard
          label="Abandoned"
          value={numberFormat.format(analytics.abandonedResponses)}
        />
        <StatCard
          label="Completion rate"
          value={`${analytics.completionRate}%`}
        />
      </div>

      {analytics.questionStats.length > 0 ? (
        <section
          aria-labelledby="question-results-heading"
          className="space-y-4"
        >
          <H3 id="question-results-heading">Results by question</H3>
          <div className="flex flex-col gap-4">
            {analytics.questionStats.map((stat) => (
              <QuestionStatCard key={stat.questionId} stat={stat} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div aria-label="Loading results" className="space-y-8" role="status">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {["responses", "completed", "abandoned", "rate"].map((id) => (
          <Skeleton className="h-22 w-full rounded-lg" key={id} />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

interface QuestionStat {
  averageValue?: number;
  distribution?: Array<{ count: number; label: string }>;
  questionId: Id<"surveyQuestions">;
  title: string;
  totalAnswers: number;
}

function QuestionStatCard({ stat }: { stat: QuestionStat }) {
  const distribution = stat.distribution ?? [];
  const maxCount = Math.max(0, ...distribution.map((d) => d.count));
  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h4 className="text-pretty font-medium text-sm">{stat.title}</h4>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {numberFormat.format(stat.totalAnswers)}{" "}
            {stat.totalAnswers === 1 ? "answer" : "answers"}
          </span>
        </div>

        {stat.averageValue === undefined ? null : (
          <p className="mt-1 text-muted-foreground text-sm">
            Average{" "}
            <span className="font-semibold text-foreground text-lg tabular-nums">
              {averageFormat.format(stat.averageValue)}
            </span>
          </p>
        )}

        {distribution.length > 0 ? (
          <table className="mt-3 w-full border-separate border-spacing-y-1.5 text-xs">
            <caption className="sr-only">
              Answer distribution for “{stat.title}”
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Answer</th>
                <td />
                <th scope="col">Count</th>
                <th scope="col">Percent</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => (
                <tr key={d.label}>
                  <th
                    className="w-28 max-w-28 truncate pr-2 text-left font-normal text-muted-foreground"
                    scope="row"
                    title={d.label}
                  >
                    {d.label}
                  </th>
                  <td aria-hidden className="w-full">
                    <div className="h-5 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-chart-1"
                        style={{
                          width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="pl-3 text-right tabular-nums">
                    {numberFormat.format(d.count)}
                  </td>
                  <td className="w-12 pl-2 text-right text-muted-foreground tabular-nums">
                    {percentFormat.format(total > 0 ? d.count / total : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </CardContent>
    </Card>
  );
}
