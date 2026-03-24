"use client";

import { cn } from "@/lib/utils";
import type { QuestionConfig, QuestionType } from "@/store/surveys";

interface QuestionInputPreviewProps {
  compact?: boolean;
  config?: QuestionConfig;
  type: QuestionType;
}

export function QuestionInputPreview({
  type,
  config,
  compact = false,
}: QuestionInputPreviewProps) {
  switch (type) {
    case "rating":
      return <RatingPreview compact={compact} config={config} />;
    case "nps":
      return <NpsPreview compact={compact} config={config} />;
    case "text":
      return <TextPreview compact={compact} config={config} />;
    case "single_choice":
      return <SingleChoicePreview compact={compact} config={config} />;
    case "multiple_choice":
      return <MultipleChoicePreview compact={compact} config={config} />;
    case "boolean":
      return <BooleanPreview compact={compact} />;
    default:
      return null;
  }
}

function RatingPreview({
  config,
  compact,
}: {
  compact: boolean;
  config?: QuestionConfig;
}) {
  const min = config?.minValue ?? 1;
  const max = config?.maxValue ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const buttonSize = compact ? "size-7 text-xs" : "size-10 text-sm";

  return (
    <div>
      <div className="flex gap-1.5">
        {values.map((val) => (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg border text-muted-foreground",
              buttonSize
            )}
            key={val}
          >
            {val}
          </div>
        ))}
      </div>
      {!compact && (config?.minLabel || config?.maxLabel) ? (
        <div className="mt-1 flex justify-between text-muted-foreground text-xs">
          <span>{config.minLabel}</span>
          <span>{config.maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function NpsPreview({
  config,
  compact,
}: {
  compact: boolean;
  config?: QuestionConfig;
}) {
  const values = Array.from({ length: 11 }, (_, i) => i);
  const buttonSize = compact ? "size-6 text-[10px]" : "size-8 text-xs";

  return (
    <div>
      <div className="flex gap-1">
        {values.map((val) => (
          <div
            className={cn(
              "flex items-center justify-center rounded border",
              buttonSize,
              val <= 6 && "text-red-400/70",
              val > 6 && val <= 8 && "text-yellow-500/70",
              val > 8 && "text-green-500/70"
            )}
            key={val}
          >
            {val}
          </div>
        ))}
      </div>
      {compact ? null : (
        <div className="mt-1 flex justify-between text-muted-foreground text-xs">
          <span>{config?.minLabel ?? "Not at all likely"}</span>
          <span>{config?.maxLabel ?? "Extremely likely"}</span>
        </div>
      )}
    </div>
  );
}

function TextPreview({
  config,
  compact,
}: {
  compact: boolean;
  config?: QuestionConfig;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 text-muted-foreground",
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
      )}
    >
      {config?.placeholder ?? "Your answer..."}
    </div>
  );
}

function SingleChoicePreview({
  config,
  compact,
}: {
  compact: boolean;
  config?: QuestionConfig;
}) {
  const choices = config?.choices ?? ["Option 1", "Option 2", "Option 3"];
  const displayed = compact ? choices.slice(0, 3) : choices;
  const remaining = compact ? choices.length - 3 : 0;

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {displayed.map((choice) => (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border text-sm",
            compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2.5"
          )}
          key={choice}
        >
          <div className="size-3.5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
          <span className="text-muted-foreground">{choice}</span>
        </div>
      ))}
      {remaining > 0 ? (
        <span className="pl-1 text-muted-foreground text-xs">
          +{remaining} more
        </span>
      ) : null}
    </div>
  );
}

function MultipleChoicePreview({
  config,
  compact,
}: {
  compact: boolean;
  config?: QuestionConfig;
}) {
  const choices = config?.choices ?? ["Option 1", "Option 2", "Option 3"];
  const displayed = compact ? choices.slice(0, 3) : choices;
  const remaining = compact ? choices.length - 3 : 0;

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {displayed.map((choice) => (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border text-sm",
            compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2.5"
          )}
          key={choice}
        >
          <div className="size-3.5 shrink-0 rounded border-2 border-muted-foreground/40" />
          <span className="text-muted-foreground">{choice}</span>
        </div>
      ))}
      {remaining > 0 ? (
        <span className="pl-1 text-muted-foreground text-xs">
          +{remaining} more
        </span>
      ) : null}
    </div>
  );
}

function BooleanPreview({ compact }: { compact: boolean }) {
  return (
    <div className={cn("flex", compact ? "gap-2" : "gap-3")}>
      <div
        className={cn(
          "flex-1 rounded-lg border text-center text-muted-foreground",
          compact ? "py-1.5 text-xs" : "py-3 text-sm"
        )}
      >
        Yes
      </div>
      <div
        className={cn(
          "flex-1 rounded-lg border text-center text-muted-foreground",
          compact ? "py-1.5 text-xs" : "py-3 text-sm"
        )}
      >
        No
      </div>
    </div>
  );
}
