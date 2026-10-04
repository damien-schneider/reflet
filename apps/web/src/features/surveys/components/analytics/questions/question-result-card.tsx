import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import {
  averageFormat,
  numberFormat,
  type QuestionStat,
} from "@/features/surveys/components/analytics/analytics-summary";
import { ChoiceBars } from "@/features/surveys/components/analytics/questions/choice-bars";
import { ScaleColumns } from "@/features/surveys/components/analytics/questions/scale-columns";
import { TextAnswers } from "@/features/surveys/components/analytics/questions/text-answers";
import { YesNoSplit } from "@/features/surveys/components/analytics/questions/yes-no-split";
import { QUESTION_TYPE_LABELS } from "@/features/surveys/lib/constants";

export function QuestionResultCard({ stat }: { stat: QuestionStat }) {
  const headingId = `question-result-${stat.questionId}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">
              {QUESTION_TYPE_LABELS[stat.type]}
            </span>
            <h4 className="text-pretty font-medium" id={headingId}>
              {stat.title}
            </h4>
          </div>
          <dl className="flex shrink-0 gap-5 text-right">
            {stat.averageValue === undefined ? null : (
              <div className="flex flex-col-reverse">
                <dt className="text-muted-foreground text-xs">Average</dt>
                <dd className="font-semibold text-lg tabular-nums">
                  {averageFormat.format(stat.averageValue)}
                </dd>
              </div>
            )}
            <div className="flex flex-col-reverse">
              <dt className="text-muted-foreground text-xs">
                {stat.answered === 1 ? "Answer" : "Answers"}
              </dt>
              <dd className="font-semibold text-lg tabular-nums">
                {numberFormat.format(stat.answered)}
              </dd>
            </div>
          </dl>
        </div>
        <QuestionBreakdown headingId={headingId} stat={stat} />
      </CardContent>
    </Card>
  );
}

function QuestionBreakdown({
  headingId,
  stat,
}: {
  headingId: string;
  stat: QuestionStat;
}) {
  const distribution = stat.distribution ?? [];
  switch (stat.type) {
    case "rating":
    case "nps":
      return (
        <ScaleColumns
          answered={stat.answered}
          distribution={distribution}
          labelledBy={headingId}
        />
      );
    case "single_choice":
    case "multiple_choice":
      return (
        <ChoiceBars
          answered={stat.answered}
          distribution={distribution}
          labelledBy={headingId}
          otherAnswers={stat.otherAnswers ?? []}
        />
      );
    case "boolean":
      return (
        <YesNoSplit answered={stat.answered} distribution={distribution} />
      );
    case "text":
      return (
        <TextAnswers
          answers={stat.recentTextAnswers ?? []}
          labelledBy={headingId}
        />
      );
    default:
      return null;
  }
}
