import {
  NPS_MAX,
  NPS_MIN,
  ratingRange,
  type SurveyQuestion,
} from "@reflet/survey-core";
import { useState } from "react";

const EMOJI_FACES = ["😞", "🙁", "😐", "🙂", "😄"] as const;
const DEFAULT_NPS_MIN_LABEL = "Not likely";
const DEFAULT_NPS_MAX_LABEL = "Very likely";

interface ScaleFieldProps {
  labelledBy: string;
  onPick: (value: number) => void;
  question: SurveyQuestion;
  value: number | undefined;
}

const valuesBetween = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="28"
      viewBox="0 0 24 24"
      width="28"
    >
      <path d="M12 2.8l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3L2.84 9.46l6.33-.92z" />
    </svg>
  );
}

function ScaleLabels({ max, min }: { max?: string; min?: string }) {
  if (!(min || max)) {
    return null;
  }
  return (
    <div aria-hidden="true" className="rfs-scale-labels">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  );
}

export function RatingField({
  labelledBy,
  onPick,
  question,
  value,
}: ScaleFieldProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { max, min } = ratingRange(question.config);
  const style = question.config?.ratingStyle ?? "number";
  const values = valuesBetween(min, max);
  const lit = hovered ?? value ?? Number.NEGATIVE_INFINITY;

  const faceFor = (option: number) => {
    const step = values.length > 1 ? (option - min) / (max - min) : 1;
    return EMOJI_FACES[Math.round(step * (EMOJI_FACES.length - 1))];
  };

  return (
    <>
      <fieldset
        aria-labelledby={labelledBy}
        className="rfs-scale"
        data-style={style}
      >
        {values.map((option) => (
          <button
            aria-label={`${option} of ${max}`}
            aria-pressed={value === option}
            className="rfs-scale-option"
            data-lit={option <= lit}
            key={option}
            onClick={() => onPick(option)}
            onPointerEnter={() => setHovered(option)}
            onPointerLeave={() => setHovered(null)}
            type="button"
          >
            {style === "number" && option}
            {style === "star" && <StarIcon />}
            {style === "emoji" && faceFor(option)}
          </button>
        ))}
      </fieldset>
      <ScaleLabels
        max={question.config?.maxLabel}
        min={question.config?.minLabel}
      />
    </>
  );
}

export function NpsField({
  labelledBy,
  onPick,
  question,
  value,
}: ScaleFieldProps) {
  return (
    <>
      <fieldset
        aria-labelledby={labelledBy}
        className="rfs-scale"
        data-kind="nps"
      >
        {valuesBetween(NPS_MIN, NPS_MAX).map((option) => (
          <button
            aria-pressed={value === option}
            className="rfs-scale-option"
            key={option}
            onClick={() => onPick(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </fieldset>
      <ScaleLabels
        max={question.config?.maxLabel ?? DEFAULT_NPS_MAX_LABEL}
        min={question.config?.minLabel ?? DEFAULT_NPS_MIN_LABEL}
      />
    </>
  );
}
