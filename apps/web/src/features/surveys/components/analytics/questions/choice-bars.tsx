import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import { CaretRight } from "@phosphor-icons/react";
import {
  numberFormat,
  percentFormat,
  type QuestionStat,
  shareOf,
} from "@/features/surveys/components/analytics/analytics-summary";

interface ChoiceBarsProps {
  answered: number;
  distribution: NonNullable<QuestionStat["distribution"]>;
  labelledBy: string;
  otherAnswers: readonly string[];
}

export function ChoiceBars({
  answered,
  distribution,
  labelledBy,
  otherAnswers,
}: ChoiceBarsProps) {
  return (
    <div className="flex flex-col gap-4">
      <ul aria-labelledby={labelledBy} className="flex flex-col gap-3">
        {distribution.map((choice) => {
          const share = shareOf(choice.count, answered);
          return (
            <li className="flex flex-col gap-1.5" key={choice.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">{choice.label}</span>
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  <span className="font-medium text-foreground">
                    {numberFormat.format(choice.count)}
                  </span>{" "}
                  {percentFormat.format(share)}
                </span>
              </div>
              <div
                aria-hidden
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-chart-2"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {otherAnswers.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground">
            <CaretRight
              aria-hidden
              className="size-3.5 transition-transform duration-(--duration-base) ease-(--ease-standard) group-data-panel-open:rotate-90 motion-reduce:transition-none"
            />
            Other answers ({numberFormat.format(otherAnswers.length)})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 flex flex-col divide-y rounded-lg border text-sm">
              {otherAnswers.map((answer, index) => (
                <li
                  className="break-words px-3 py-2"
                  // biome-ignore lint/suspicious/noArrayIndexKey: free-text answers repeat and have no id
                  key={`${index}-${answer}`}
                >
                  {answer}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
