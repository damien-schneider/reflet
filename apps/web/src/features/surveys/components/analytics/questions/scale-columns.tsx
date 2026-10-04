import {
  numberFormat,
  percentFormat,
  type QuestionStat,
  shareOf,
} from "@/features/surveys/components/analytics/analytics-summary";

interface ScaleColumnsProps {
  answered: number;
  distribution: NonNullable<QuestionStat["distribution"]>;
  labelledBy: string;
}

export function ScaleColumns({
  answered,
  distribution,
  labelledBy,
}: ScaleColumnsProps) {
  const maxCount = Math.max(0, ...distribution.map((point) => point.count));

  return (
    <ul aria-labelledby={labelledBy} className="flex items-end gap-1.5">
      {distribution.map((point) => (
        <li
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          key={point.label}
        >
          <span
            aria-hidden
            className="text-muted-foreground text-xs tabular-nums"
          >
            {point.count > 0 ? numberFormat.format(point.count) : ""}
          </span>
          <div
            aria-hidden
            className="flex h-24 w-full items-end rounded-md bg-muted"
          >
            <div
              className="w-full rounded-md bg-chart-2"
              style={{ height: `${shareOf(point.count, maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums">{point.label}</span>
          <span className="sr-only">
            {`${numberFormat.format(point.count)} ${point.count === 1 ? "answer" : "answers"}, ${percentFormat.format(shareOf(point.count, answered))}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
