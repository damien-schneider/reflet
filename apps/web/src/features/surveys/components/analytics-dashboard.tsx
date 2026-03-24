"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { H3, Muted } from "@/components/ui/typography";
import { StatCard } from "@/features/surveys/components/stat-card";
import { cn } from "@/lib/utils";

interface AnalyticsDashboardProps {
  surveyId: Id<"surveys">;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  const analytics = useQuery(api.surveys.mutations.getAnalytics, {
    surveyId,
  });

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Responses" value={analytics.totalResponses} />
        <StatCard label="Completed" value={analytics.completedResponses} />
        <StatCard label="Abandoned" value={analytics.abandonedResponses} />
        <StatCard
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
        />
      </div>

      {analytics.questionStats.length > 0 ? (
        <div>
          <H3 className="mb-4">Response Analytics</H3>
          <div className="flex flex-col gap-4">
            {analytics.questionStats.map((stat) => (
              <QuestionStatCard key={stat.questionId} stat={stat} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <Muted>No responses yet</Muted>
        </div>
      )}
    </div>
  );
}

interface QuestionStat {
  averageValue?: number;
  distribution?: Array<{ count: number; label: string }>;
  questionId: Id<"surveyQuestions">;
  title: string;
  totalAnswers: number;
  type: string;
}

function QuestionStatCard({ stat }: { stat: QuestionStat }) {
  const maxCount =
    stat.distribution && stat.distribution.length > 0
      ? Math.max(...stat.distribution.map((d) => d.count))
      : 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{stat.title}</span>
        <span className="text-muted-foreground text-xs">
          {stat.totalAnswers} answers
        </span>
      </div>

      {stat.averageValue === undefined ? null : (
        <p className="mt-1 font-semibold text-lg">Avg: {stat.averageValue}</p>
      )}

      {stat.distribution && stat.distribution.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {stat.distribution.map((d) => {
            const pct =
              maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
            return (
              <div className="flex items-center gap-2 text-sm" key={d.label}>
                <span className="w-24 shrink-0 truncate text-muted-foreground text-xs">
                  {d.label}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded transition-all",
                      pct > 66 && "bg-green-500/20",
                      pct > 33 && pct <= 66 && "bg-yellow-500/20",
                      pct <= 33 && "bg-primary/20"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-muted-foreground text-xs">
                  {d.count}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
