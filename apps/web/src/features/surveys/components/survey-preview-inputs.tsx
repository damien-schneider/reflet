"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { Check } from "@phosphor-icons/react";
import type { SurveyQuestion } from "@/store/surveys";

export interface QuestionInputProps {
  answer: unknown;
  config?: SurveyQuestion["config"];
  onAnswer: (value: unknown) => void;
}

const NPS_DETRACTOR_MAX = 6;
const NPS_PASSIVE_MAX = 8;

const choiceClassName =
  "flex items-center gap-3 rounded-lg border p-3 text-left text-sm aria-pressed:border-primary aria-pressed:bg-primary/5 [&:not([aria-pressed=true])]:hover:border-foreground/30";

export function RatingInput({ config, answer, onAnswer }: QuestionInputProps) {
  const min = config?.minValue ?? 1;
  const max = config?.maxValue ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((val) => (
          <button
            aria-pressed={answer === val}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg border text-sm tabular-nums",
              answer === val
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-foreground/30"
            )}
            key={val}
            onClick={() => onAnswer(val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <ScaleLabels max={config?.maxLabel} min={config?.minLabel} />
    </div>
  );
}

export function NpsInput({ config, answer, onAnswer }: QuestionInputProps) {
  const values = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        {values.map((val) => (
          <button
            aria-pressed={answer === val}
            className={cn(
              "flex h-9 items-center justify-center rounded border text-sm tabular-nums",
              answer === val &&
                "border-primary bg-primary text-primary-foreground",
              answer !== val &&
                val <= NPS_DETRACTOR_MAX &&
                "hover:bg-destructive-subtle",
              answer !== val &&
                val > NPS_DETRACTOR_MAX &&
                val <= NPS_PASSIVE_MAX &&
                "hover:bg-warning-subtle",
              answer !== val &&
                val > NPS_PASSIVE_MAX &&
                "hover:bg-success-subtle"
            )}
            key={val}
            onClick={() => onAnswer(val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <ScaleLabels
        max={config?.maxLabel ?? "Extremely likely"}
        min={config?.minLabel ?? "Not at all likely"}
      />
    </div>
  );
}

function ScaleLabels({ min, max }: { max?: string; min?: string }) {
  if (!(min || max)) {
    return null;
  }
  return (
    <div className="mt-1.5 flex justify-between gap-4 text-muted-foreground text-xs">
      <span>{min}</span>
      <span className="text-right">{max}</span>
    </div>
  );
}

export function TextInput({ config, answer, onAnswer }: QuestionInputProps) {
  return (
    <Textarea
      aria-label="Your answer"
      maxLength={config?.maxLength}
      onChange={(e) => onAnswer(e.target.value)}
      placeholder={config?.placeholder ?? "Your answer…"}
      rows={3}
      value={typeof answer === "string" ? answer : ""}
    />
  );
}

export function SingleChoiceInput({
  config,
  answer,
  onAnswer,
}: QuestionInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {(config?.choices ?? []).map((choice) => {
        const isSelected = answer === choice;
        return (
          <button
            aria-pressed={isSelected}
            className={choiceClassName}
            key={choice}
            onClick={() => onAnswer(choice)}
            type="button"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                isSelected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              )}
            >
              {isSelected ? (
                <span className="size-2 rounded-full bg-primary-foreground" />
              ) : null}
            </span>
            {choice}
          </button>
        );
      })}
    </div>
  );
}

export function MultipleChoiceInput({
  config,
  answer,
  onAnswer,
}: QuestionInputProps) {
  const selected = Array.isArray(answer)
    ? answer.filter((item): item is string => typeof item === "string")
    : [];
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-2">
      {(config?.choices ?? []).map((choice) => {
        const isSelected = selectedSet.has(choice);
        return (
          <button
            aria-pressed={isSelected}
            className={choiceClassName}
            key={choice}
            onClick={() =>
              onAnswer(
                isSelected
                  ? selected.filter((s) => s !== choice)
                  : [...selected, choice]
              )
            }
            type="button"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground"
              )}
            >
              {isSelected ? <Check className="size-3" weight="bold" /> : null}
            </span>
            {choice}
          </button>
        );
      })}
    </div>
  );
}

export function BooleanInput({ answer, onAnswer }: QuestionInputProps) {
  return (
    <div className="flex gap-3">
      {[true, false].map((value) => (
        <button
          aria-pressed={answer === value}
          className="flex-1 rounded-lg border p-4 text-center aria-pressed:border-primary aria-pressed:bg-primary/5 [&:not([aria-pressed=true])]:hover:border-foreground/30"
          key={String(value)}
          onClick={() => onAnswer(value)}
          type="button"
        >
          {value ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}
