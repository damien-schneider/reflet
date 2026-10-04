import { cn } from "@ctrl-ui/react/lib/cn";
import {
  numberFormat,
  percentFormat,
  type QuestionStat,
  shareOf,
} from "@/features/surveys/components/analytics/analytics-summary";

const COLOR_BY_ANSWER: Record<string, string> = {
  No: "bg-muted-foreground/40",
  Yes: "bg-chart-1",
};

interface YesNoSplitProps {
  answered: number;
  distribution: NonNullable<QuestionStat["distribution"]>;
}

export function YesNoSplit({ answered, distribution }: YesNoSplitProps) {
  return (
    <div className="flex flex-col gap-3">
      {answered > 0 ? (
        <div
          aria-hidden
          className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
        >
          {distribution
            .filter((answer) => answer.count > 0)
            .map((answer) => (
              <div
                className={cn("h-full", COLOR_BY_ANSWER[answer.label])}
                key={answer.label}
                style={{ flexGrow: answer.count }}
              />
            ))}
        </div>
      ) : null}
      <dl className="flex gap-8 text-sm">
        {distribution.map((answer) => (
          <div className="flex flex-col gap-0.5" key={answer.label}>
            <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  COLOR_BY_ANSWER[answer.label]
                )}
              />
              {answer.label}
            </dt>
            <dd className="font-medium tabular-nums">
              {numberFormat.format(answer.count)}{" "}
              <span className="font-normal text-muted-foreground">
                {percentFormat.format(shareOf(answer.count, answered))}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
