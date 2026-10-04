"use client";

import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import {
  type QuestionConfig,
  RATING_STYLES,
  type RatingStyle,
  ratingRange,
  textMaxChars,
} from "@reflet/survey-core";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { AutosavedField } from "@/features/surveys/components/flow/inspector/autosaved-field";
import { ChoicesEditor } from "@/features/surveys/components/flow/inspector/choices-editor";
import type { QuestionPatch } from "@/features/surveys/components/flow/use-update-question";
import type { SurveyQuestion } from "@/store/surveys";

const RATING_MIN_VALUES = [0, 1];
const RATING_MAX_VALUES = [3, 4, 5, 6, 7, 8, 9, 10];
/** Emoji faces only exist for 3- and 5-point scales. */
const EMOJI_SCALE_SIZES = new Set([3, 5]);
const RATING_STYLE_LABELS: Record<RatingStyle, string> = {
  emoji: "Emoji faces",
  number: "Numbers",
  star: "Stars",
};

interface QuestionTypeFieldsProps {
  onSave: (patch: QuestionPatch) => void;
  question: SurveyQuestion;
}

export function QuestionTypeFields({
  onSave,
  question,
}: QuestionTypeFieldsProps) {
  const { config } = question;
  const saveConfig = (changes: QuestionConfig) =>
    onSave({ config: { ...config, ...changes } });
  const scaleLabels = (
    <div className="grid grid-cols-2 gap-3">
      <AutosavedField
        label="Low label"
        onSave={(minLabel) => saveConfig({ minLabel })}
        saved={config?.minLabel ?? ""}
      />
      <AutosavedField
        label="High label"
        onSave={(maxLabel) => saveConfig({ maxLabel })}
        saved={config?.maxLabel ?? ""}
      />
    </div>
  );

  switch (question.type) {
    case "rating":
      return (
        <>
          <RatingScaleFields config={config} onSave={saveConfig} />
          {scaleLabels}
        </>
      );
    case "nps":
      return scaleLabels;
    case "single_choice":
    case "multiple_choice":
      return (
        <ChoicesEditor
          allowOther={config?.allowOther ?? false}
          choices={config?.choices ?? []}
          onAllowOtherChange={(allowOther) => saveConfig({ allowOther })}
          onChoicesChange={(choices, renamed) =>
            onSave({
              config: { ...config, choices },
              ...(renamed && question.logic
                ? {
                    logic: question.logic.map((rule) =>
                      rule.value === renamed.from
                        ? { ...rule, value: renamed.to }
                        : rule
                    ),
                  }
                : {}),
            })
          }
        />
      );
    case "text":
      return (
        <>
          <AutosavedField
            label="Placeholder"
            onSave={(placeholder) => saveConfig({ placeholder })}
            saved={config?.placeholder ?? ""}
          />
          <AutosavedField
            label="Character limit"
            onSave={(text) => {
              const maxLength = Number.parseInt(text, 10);
              if (Number.isInteger(maxLength) && maxLength > 0) {
                saveConfig({ maxLength });
              }
            }}
            saved={String(textMaxChars(config))}
          />
        </>
      );
    case "statement":
      return (
        <>
          <AutosavedField
            label="Button label"
            onSave={(buttonLabel) => saveConfig({ buttonLabel })}
            saved={config?.buttonLabel ?? ""}
          />
          <AutosavedField
            label="Button link"
            onSave={(buttonUrl) =>
              saveConfig({ buttonUrl: buttonUrl.trim() || undefined })
            }
            optional
            placeholder="https://"
            saved={config?.buttonUrl ?? ""}
          />
        </>
      );
    default:
      return null;
  }
}

function RatingScaleFields({
  config,
  onSave,
}: {
  config: QuestionConfig | undefined;
  onSave: (changes: QuestionConfig) => void;
}) {
  const id = useId();
  const { max, min } = ratingRange(config);
  const allowsEmoji = EMOJI_SCALE_SIZES.has(max - min + 1);
  const style = config?.ratingStyle ?? "number";

  const saveRange = (range: { maxValue: number; minValue: number }) => {
    const keepsEmoji = EMOJI_SCALE_SIZES.has(
      range.maxValue - range.minValue + 1
    );
    onSave({
      ...range,
      ...(style === "emoji" && !keepsEmoji ? { ratingStyle: "number" } : {}),
    });
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-min`}>From</Label>
        <NativeSelect
          id={`${id}-min`}
          onChange={(event) =>
            saveRange({ maxValue: max, minValue: Number(event.target.value) })
          }
          size="sm"
          value={String(min)}
        >
          {RATING_MIN_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-max`}>To</Label>
        <NativeSelect
          id={`${id}-max`}
          onChange={(event) =>
            saveRange({ maxValue: Number(event.target.value), minValue: min })
          }
          size="sm"
          value={String(max)}
        >
          {RATING_MAX_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-style`}>Style</Label>
        <NativeSelect
          id={`${id}-style`}
          onChange={(event) => {
            const ratingStyle = RATING_STYLES.find(
              (candidate) => candidate === event.target.value
            );
            if (ratingStyle) {
              onSave({ ratingStyle });
            }
          }}
          size="sm"
          value={style}
        >
          {RATING_STYLES.map((ratingStyle) => (
            <option
              disabled={ratingStyle === "emoji" && !allowsEmoji}
              key={ratingStyle}
              value={ratingStyle}
            >
              {RATING_STYLE_LABELS[ratingStyle]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
