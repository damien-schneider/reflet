"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { CaretRight } from "@phosphor-icons/react";
import type { QuestionDraft } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import { type QuestionType, takesAnswer } from "@reflet/survey-core";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { DescribeStepsForm } from "@/features/surveys/components/flow/add-step/describe-steps-form";
import { StepGlyph } from "@/features/surveys/components/flow/add-step/step-glyph";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import type { InsertAnchor } from "@/features/surveys/components/flow/use-flow-actions";
import {
  getDefaultConfig,
  getDefaultTitle,
} from "@/features/surveys/lib/constants";
import type { QuestionId } from "@/store/surveys";

const PRIMARY_TYPES: readonly QuestionType[] = [
  "nps",
  "rating",
  "single_choice",
  "multiple_choice",
  "text",
  "boolean",
];
const MORE_TYPES: readonly QuestionType[] = ["statement"];
const GRID_COLUMNS = 3;

const TILE_LABELS: Record<QuestionType, string> = {
  boolean: "Yes / no",
  multiple_choice: "Multiple choice",
  nps: "NPS",
  rating: "Rating",
  single_choice: "Single choice",
  statement: "Statement",
  text: "Text",
};

const ARROW_OFFSETS: Record<string, number> = {
  ArrowDown: GRID_COLUMNS,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -GRID_COLUMNS,
};

const draftForType = (type: QuestionType): QuestionDraft => ({
  config: getDefaultConfig(type),
  required: takesAnswer(type) && type !== "text",
  title: getDefaultTitle(type),
  type,
});

interface AddStepPickerProps {
  anchor: InsertAnchor;
  onInserted: (firstQuestionId: QuestionId) => void;
}

export function AddStepPicker({ anchor, onInserted }: AddStepPickerProps) {
  const { actions } = useFlowEditor();
  const [showsMore, setShowsMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingType, setPendingType] = useState<QuestionType | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const types = showsMore ? [...PRIMARY_TYPES, ...MORE_TYPES] : PRIMARY_TYPES;

  const insertType = async (type: QuestionType) => {
    setPendingType(type);
    const [questionId] = await actions.insertSteps(anchor, [
      draftForType(type),
    ]);
    setPendingType(null);
    if (questionId) {
      onInserted(questionId);
    }
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    const offset = ARROW_OFFSETS[event.key];
    const last = types.length - 1;
    let nextIndex: number | null = null;
    if (offset !== undefined) {
      nextIndex = Math.min(last, Math.max(0, activeIndex + offset));
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = last;
    }
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    setActiveIndex(nextIndex);
    tileRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex w-[22rem] flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base" id={titleId}>
          Add step
        </h2>
        {showsMore ? null : (
          <button
            className="inline-flex items-center gap-0.5 rounded-md text-muted-foreground text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => setShowsMore(true)}
            type="button"
          >
            More
            <CaretRight aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {types.map((type, index) => (
          <button
            className={cn(
              "flex aspect-[5/4] flex-col justify-between rounded-2xl bg-muted/70 p-3 text-left",
              "transition-colors duration-150 hover:bg-muted motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            )}
            disabled={pendingType !== null}
            key={type}
            onClick={() => insertType(type)}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={moveFocus}
            ref={(element) => {
              tileRefs.current[index] = element;
            }}
            tabIndex={index === activeIndex ? 0 : -1}
            type="button"
          >
            <StepGlyph className="size-7" type={type} />
            <span className="font-medium text-sm">
              {pendingType === type ? "Adding…" : TILE_LABELS[type]}
            </span>
          </button>
        ))}
      </div>
      <DescribeStepsForm anchor={anchor} onInserted={onInserted} />
    </div>
  );
}
