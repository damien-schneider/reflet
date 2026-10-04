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
import { takesAnswer } from "@reflet/survey-core";
import { useQuery } from "convex/react";
import { H3 } from "@/components/ui/typography";
import { DropOffFunnel } from "@/features/surveys/components/analytics/drop-off-funnel";
import { EndingsCard } from "@/features/surveys/components/analytics/endings-card";
import { NpsCard } from "@/features/surveys/components/analytics/nps-card";
import { OverviewCard } from "@/features/surveys/components/analytics/overview-card";
import { QuestionResultCard } from "@/features/surveys/components/analytics/questions/question-result-card";

interface AnalyticsDashboardProps {
  surveyId: Id<"surveys">;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  const analytics = useQuery(api.surveys.analytics.getAnalytics, { surveyId });

  if (analytics === undefined) {
    return <AnalyticsSkeleton />;
  }

  if (analytics.totalResponses === 0) {
    return (
      <Empty className="rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia>
            <ChartBar aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No responses yet</EmptyTitle>
          <EmptyDescription>
            Activate the survey, or turn on its link and share it. Results show
            up here as soon as someone answers.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const answerableStats = analytics.questionStats.filter((stat) =>
    takesAnswer(stat.type)
  );
  const readResponses = analytics.sampledResponses ?? analytics.totalResponses;
  const completionsReachingEndings = analytics.endings.reduce(
    (sum, ending) => sum + ending.count,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {analytics.sampledResponses === null ? null : (
        <p className="text-muted-foreground text-sm">
          Response count and completion rate cover every response. Everything
          else uses the latest {analytics.sampledResponses.toLocaleString()}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={analytics.nps ? "lg:col-span-2" : "lg:col-span-3"}>
          <OverviewCard analytics={analytics} />
        </div>
        {analytics.nps ? <NpsCard nps={analytics.nps} /> : null}
      </div>

      {analytics.questionStats.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DropOffFunnel
              steps={analytics.questionStats}
              totalResponses={readResponses}
            />
          </div>
          <EndingsCard
            completedResponses={completionsReachingEndings}
            endings={analytics.endings}
          />
        </div>
      ) : null}

      {answerableStats.length > 0 ? (
        <section
          aria-labelledby="question-results-heading"
          className="flex flex-col gap-4"
        >
          <H3 id="question-results-heading">Results by question</H3>
          <div className="grid gap-4 lg:grid-cols-2">
            {answerableStats.map((stat) => (
              <QuestionResultCard key={stat.questionId} stat={stat} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div
      aria-label="Loading results"
      className="flex flex-col gap-6"
      role="status"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-6 p-5">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-3 gap-6">
              {["responses", "rate", "time"].map((id) => (
                <div className="flex flex-col gap-1.5" key={id}>
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Skeleton className="h-full min-h-60 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
