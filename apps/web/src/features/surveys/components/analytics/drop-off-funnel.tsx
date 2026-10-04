import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { FunnelSimple } from "@phosphor-icons/react";
import { AnalyticsCardTitle } from "@/features/surveys/components/analytics/analytics-card-title";
import {
  numberFormat,
  percentFormat,
  type QuestionStat,
  shareOf,
  worstDropOffStep,
} from "@/features/surveys/components/analytics/analytics-summary";

interface DropOffFunnelProps {
  steps: readonly QuestionStat[];
  totalResponses: number;
}

export function DropOffFunnel({ steps, totalResponses }: DropOffFunnelProps) {
  const worstStep = worstDropOffStep(steps);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        <AnalyticsCardTitle icon={FunnelSimple} id="drop-off-heading">
          Drop-off by question
        </AnalyticsCardTitle>
        <p className="-mt-2 text-muted-foreground text-sm">
          {worstStep
            ? `Most people leave at “${worstStep.title}”.`
            : "Nobody has left the survey partway through."}
        </p>
        <ol aria-labelledby="drop-off-heading" className="flex flex-col gap-1">
          {steps.map((step, index) => (
            <FunnelStep
              isWorst={step.questionId === worstStep?.questionId}
              key={step.questionId}
              position={index + 1}
              step={step}
              totalResponses={totalResponses}
            />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function FunnelStep({
  isWorst,
  position,
  step,
  totalResponses,
}: {
  isWorst: boolean;
  position: number;
  step: QuestionStat;
  totalResponses: number;
}) {
  const answeredLabel = step.type === "statement" ? "continued" : "answered";

  return (
    <li
      className={cn(
        "grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_auto]",
        isWorst && "bg-destructive-subtle"
      )}
    >
      <span className="text-muted-foreground text-xs tabular-nums">
        {position}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm" title={step.title}>
          {step.title}
        </span>
        {isWorst ? (
          <Badge className="shrink-0" color="red" size="sm">
            Biggest drop-off
          </Badge>
        ) : null}
      </span>
      <div
        aria-hidden
        className="relative col-start-2 h-2 overflow-hidden rounded-full bg-muted sm:col-start-auto"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-chart-2/30"
          style={{ width: `${shareOf(step.reached, totalResponses) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-chart-2"
          style={{ width: `${shareOf(step.answered, totalResponses) * 100}%` }}
        />
      </div>
      <p className="col-start-2 flex gap-3 text-muted-foreground text-xs tabular-nums sm:col-start-auto sm:justify-end">
        <span>
          <span className="font-medium text-foreground">
            {numberFormat.format(step.answered)}
          </span>
          /{numberFormat.format(step.reached)} {answeredLabel}
        </span>
        <span className={cn(isWorst && "font-medium text-destructive-text")}>
          {step.dropOffs === 0
            ? "No drop-off"
            : `${numberFormat.format(step.dropOffs)} left (${percentFormat.format(shareOf(step.dropOffs, step.reached))})`}
        </span>
      </p>
    </li>
  );
}
