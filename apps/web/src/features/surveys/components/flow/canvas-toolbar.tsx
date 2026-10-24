"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@ctrl-ui/react/ui/combobox";
import { InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Toolbar, ToolbarButton } from "@ctrl-ui/react/ui/toolbar";
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
      <Toolbar aria-label="Canvas tools" orientation="vertical">
        <ToolbarButton
          aria-label="Fit the flow to the screen"
          iconOnly
          onClick={() =>
            fitView({
              duration: reducesMotion ? 0 : FIT_DURATION_MS,
              maxZoom: 1,
            })
          }
        >
          <CornersOut aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          aria-label="Steps list"
          aria-pressed={isOutlineOpen}
          iconOnly
          onClick={() => setOutlineOpen(!isOutlineOpen)}
        >
          <ListBullets aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          aria-label="Live preview"
          aria-pressed={isPreviewOpen}
          iconOnly
          onClick={() => setPreviewOpen(!isPreviewOpen)}
        >
          <Eye aria-hidden />
        </ToolbarButton>
        <AddStepPopover
          anchor={reachableInsertAnchor(model, selection)}
          trigger={<ToolbarButton aria-label="Add a step" iconOnly />}
        >
          <Plus aria-hidden />
        </AddStepPopover>
      </Toolbar>
      <StepSearch />
    </div>
  );
}

function StepSearch() {
  const { model } = useFlowEditor();
  const selectStep = useSelectFlowStep();
  const [query, setQuery] = useState("");

  return (
    <div className="w-64">
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
        <ComboboxInputGroup>
          <InputGroupAddon>
            <MagnifyingGlass
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </InputGroupAddon>
          <ComboboxInput
            aria-label="Search steps"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Search steps"
          />
        </ComboboxInputGroup>
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
