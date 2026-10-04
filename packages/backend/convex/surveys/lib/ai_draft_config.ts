import { NPS_MAX, NPS_MIN, ratingRange } from "@reflet/survey-core";
import type { DraftConfig, GeneratedQuestion } from "./ai_draft_schema";

export const MAX_DRAFT_CHOICES = 8;
const MIN_DRAFT_CHOICES = 2;
const MAX_CHOICE_CHARS = 80;
const MAX_LABEL_CHARS = 40;
const MAX_PLACEHOLDER_CHARS = 120;

type GeneratedConfig = NonNullable<GeneratedQuestion["config"]>;

export const cleanText = (
  value: string | undefined,
  maxLength: number
): string | undefined => {
  const text = value?.trim().slice(0, maxLength).trim();
  return text ? text : undefined;
};

const uniqueChoices = (choices: readonly string[]): string[] => {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const choice of choices) {
    const text = cleanText(choice, MAX_CHOICE_CHARS);
    const key = text?.toLocaleLowerCase();
    if (!(text && key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    kept.push(text);
    if (kept.length === MAX_DRAFT_CHOICES) {
      break;
    }
  }
  return kept;
};

const ratingBounds = (
  config: GeneratedConfig
): Pick<DraftConfig, "maxValue" | "minValue"> => {
  const { max, min } = ratingRange(config);
  const withinScale = [min, max].every(
    (bound) => Number.isInteger(bound) && bound >= NPS_MIN && bound <= NPS_MAX
  );
  return withinScale && min < max ? { maxValue: max, minValue: min } : {};
};

const scaleLabels = (
  config: GeneratedConfig
): Pick<DraftConfig, "maxLabel" | "minLabel"> => {
  const minLabel = cleanText(config.minLabel, MAX_LABEL_CHARS);
  const maxLabel = cleanText(config.maxLabel, MAX_LABEL_CHARS);
  return {
    ...(minLabel ? { minLabel } : {}),
    ...(maxLabel ? { maxLabel } : {}),
  };
};

/** The config a question of this type can use, or null when the question can't be salvaged. */
export const normalizeQuestionConfig = (
  question: GeneratedQuestion
): DraftConfig | undefined | null => {
  const config = question.config ?? {};
  switch (question.type) {
    case "single_choice":
    case "multiple_choice": {
      const choices = uniqueChoices(config.choices ?? []);
      if (choices.length < MIN_DRAFT_CHOICES) {
        return null;
      }
      return config.allowOther ? { allowOther: true, choices } : { choices };
    }
    case "rating":
      return {
        ...ratingBounds(config),
        ...scaleLabels(config),
        ...(config.ratingStyle ? { ratingStyle: config.ratingStyle } : {}),
      };
    case "nps": {
      const labels = scaleLabels(config);
      return Object.keys(labels).length > 0 ? labels : undefined;
    }
    case "text": {
      const placeholder = cleanText(config.placeholder, MAX_PLACEHOLDER_CHARS);
      return placeholder ? { placeholder } : undefined;
    }
    case "statement": {
      const buttonLabel = cleanText(config.buttonLabel, MAX_LABEL_CHARS);
      return buttonLabel ? { buttonLabel } : undefined;
    }
    default:
      return undefined;
  }
};
