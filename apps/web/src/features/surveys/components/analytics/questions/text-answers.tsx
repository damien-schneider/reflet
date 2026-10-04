import { format, formatDistanceToNow } from "date-fns";
import type { QuestionStat } from "@/features/surveys/components/analytics/analytics-summary";

interface TextAnswersProps {
  answers: NonNullable<QuestionStat["recentTextAnswers"]>;
  labelledBy: string;
}

export function TextAnswers({ answers, labelledBy }: TextAnswersProps) {
  if (answers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No written answers yet.</p>
    );
  }

  return (
    <ul
      aria-labelledby={labelledBy}
      className="flex max-h-96 flex-col divide-y overflow-y-auto rounded-lg border"
    >
      {answers.map((answer) => (
        <li
          className="flex flex-col gap-1 px-3 py-2.5"
          key={`${answer.answeredAt}-${answer.value}`}
        >
          <p className="whitespace-pre-wrap break-words text-sm">
            {answer.value}
          </p>
          <time
            className="text-muted-foreground text-xs"
            dateTime={new Date(answer.answeredAt).toISOString()}
            title={format(answer.answeredAt, "PPPp")}
          >
            {formatDistanceToNow(answer.answeredAt, { addSuffix: true })}
          </time>
        </li>
      ))}
    </ul>
  );
}
