"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@ctrl-ui/react/ui/combobox";
import {
  CornersOut,
  Eye,
  ListBullets,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { useReactFlow } from "@xyflow/react";
import { useAtom, useAtomValue } from "jotai";
import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { AddStepPopover } from "@/features/surveys/components/flow/add-step/add-step-popover";
import {
  useFlowEditor,
  useSelectFlowStep,
} from "@/features/surveys/components/flow/flow-context";
import { reachableInsertAnchor } from "@/features/surveys/components/flow/flow-elements";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import {
  flowOutlineOpenAtom,
  flowPreviewOpenAtom,
  type SurveyQuestion,
  selectedFlowStepAtom,
} from "@/store/surveys";

const FIT_DURATION_MS = 300;
const MAX_SEARCH_RESULTS = 8;

export function CanvasToolbar() {
  const { fitView } = useReactFlow();
  const reducesMotion = useReducedMotion();
  const [isOutlineOpen, setOutlineOpen] = useAtom(flowOutlineOpenAtom);
  const [isPreviewOpen, setPreviewOpen] = useAtom(flowPreviewOpenAtom);
  const { model } = useFlowEditor();
  const selection = useAtomValue(selectedFlowStepAtom);

  return (
    <div className="flex items-start gap-2">
      <div
        aria-label="Canvas tools"
        aria-orientation="vertical"
        className="flex flex-col gap-0.5 rounded-xl border bg-card p-1 shadow-xs"
        role="toolbar"
      >
        <Button
          aria-label="Fit the flow to the screen"
          iconOnly
          onClick={() =>
            fitView({
              duration: reducesMotion ? 0 : FIT_DURATION_MS,
              maxZoom: 1,
            })
          }
          size="sm"
          variant="ghost"
        >
          <CornersOut aria-hidden />
        </Button>
        <Button
          active={isOutlineOpen}
          aria-label="Steps list"
          aria-pressed={isOutlineOpen}
          iconOnly
          onClick={() => setOutlineOpen(!isOutlineOpen)}
          size="sm"
          variant="ghost"
        >
          <ListBullets aria-hidden />
        </Button>
        <Button
          active={isPreviewOpen}
          aria-label="Live preview"
          aria-pressed={isPreviewOpen}
          iconOnly
          onClick={() => setPreviewOpen(!isPreviewOpen)}
          size="sm"
          variant="ghost"
        >
          <Eye aria-hidden />
        </Button>
        <AddStepPopover
          anchor={reachableInsertAnchor(model, selection)}
          trigger={
            <Button
              aria-label="Add a step"
              iconOnly
              size="sm"
              variant="ghost"
            />
          }
        >
          <Plus aria-hidden />
        </AddStepPopover>
      </div>
      <StepSearch />
    </div>
  );
}

function StepSearch() {
  const { model } = useFlowEditor();
  const selectStep = useSelectFlowStep();
  const [query, setQuery] = useState("");

  return (
    <div className="relative w-64">
      <MagnifyingGlass
        aria-hidden
        className="pointer-events-none absolute start-2.5 top-1/2 z-1 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Combobox
        inputValue={query}
        items={model.questions}
        itemToStringLabel={(question: SurveyQuestion) => question.title}
        limit={MAX_SEARCH_RESULTS}
        onInputValueChange={setQuery}
        onValueChange={(question) => {
          if (!question) {
            return;
          }
          selectStep(
            { kind: "question", questionId: question._id },
            { reveal: true }
          );
          setQuery("");
        }}
        value={null}
      >
        <ComboboxInput
          aria-label="Search steps"
          className="ps-8"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="Search steps"
        />
        <ComboboxContent>
          <ComboboxEmpty>No matching step</ComboboxEmpty>
          <ComboboxList>
            {(question: SurveyQuestion) => {
              const TypeIcon = QUESTION_TYPE_ICONS[question.type];
              return (
                <ComboboxItem key={question._id} value={question}>
                  <TypeIcon
                    aria-hidden
                    className="me-2 size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{question.title}</span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
