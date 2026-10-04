import {
  ChartBar,
  CheckSquare,
  Quotes,
  RadioButton,
  Star,
  TextAa,
  ToggleLeft,
} from "@phosphor-icons/react";
import type { QuestionType } from "@/store/surveys";

export const QUESTION_TYPE_ICONS = {
  boolean: ToggleLeft,
  multiple_choice: CheckSquare,
  nps: ChartBar,
  rating: Star,
  single_choice: RadioButton,
  statement: Quotes,
  text: TextAa,
} as const satisfies Record<QuestionType, unknown>;
