"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
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
import { type KeyboardEvent, useId, useState } from "react";
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
  type QuestionId,
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
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? model.questions
        .filter((question) =>
          question.title.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, MAX_SEARCH_RESULTS)
    : [];
  const isOpen = matches.length > 0;
  const activeMatch = matches[Math.min(activeIndex, matches.length - 1)];

  const pick = (questionId: QuestionId) => {
    selectStep({ kind: "question", questionId }, { reveal: true });
    setQuery("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (index) =>
          (index + offset + matches.length) % Math.max(1, matches.length)
      );
    } else if (event.key === "Enter" && activeMatch) {
      event.preventDefault();
      pick(activeMatch._id);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="relative w-64">
      <div className="flex h-9 items-center gap-2 rounded-xl border bg-card px-2.5 shadow-xs focus-within:border-ring">
        <MagnifyingGlass
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          aria-activedescendant={
            activeMatch ? `${listId}-${activeMatch._id}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen}
          aria-label="Search steps"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search steps"
          role="combobox"
          type="search"
          value={query}
        />
      </div>
      {isOpen ? (
        <div
          className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col gap-0.5 rounded-xl border bg-popover p-1 shadow-md"
          id={listId}
          role="listbox"
        >
          {matches.map((question) => {
            const TypeIcon = QUESTION_TYPE_ICONS[question.type];
            const isActive = question._id === activeMatch?._id;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: options are driven by the combobox input's arrow keys and Enter
              <div
                aria-selected={isActive}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  isActive && "bg-muted"
                )}
                id={`${listId}-${question._id}`}
                key={question._id}
                onClick={() => pick(question._id)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                tabIndex={-1}
              >
                <TypeIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{question.title}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
