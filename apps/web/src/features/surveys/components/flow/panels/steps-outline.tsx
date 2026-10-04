"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  ArrowDown,
  ArrowUp,
  FlagCheckered,
  type Icon,
  Lightning,
  Plus,
} from "@phosphor-icons/react";
import type { FlowIssue } from "@reflet/survey-core";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { AddStepPopover } from "@/features/surveys/components/flow/add-step/add-step-popover";
import {
  nodeIdOf,
  useFlowEditor,
  useSelectFlowStep,
} from "@/features/surveys/components/flow/flow-context";
import { reachableInsertAnchor } from "@/features/surveys/components/flow/flow-elements";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import { type FlowStepRef, selectedFlowStepAtom } from "@/store/surveys";

/** The accessible, keyboard-first view of the flow: every step in order, with reordering. */
export function StepsOutline() {
  const { actions, model } = useFlowEditor();
  const selectStep = useSelectFlowStep();
  const selection = useAtomValue(selectedFlowStepAtom);
  const lastIndex = model.questions.length - 1;

  const addEnding = async () => {
    const ending = await actions.addEnding();
    if (ending) {
      selectStep(ending, { reveal: true });
    }
  };

  return (
    <nav
      aria-label="Steps"
      className="flex w-64 shrink-0 flex-col border-e bg-background"
    >
      <h2 className="px-4 pt-3 pb-2 font-medium text-muted-foreground text-xs">
        Steps
      </h2>
      <ol className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        <OutlineItem icon={Lightning} label="Start" step={{ kind: "start" }} />
        {model.questions.map((question, index) => (
          <OutlineItem
            actions={
              <>
                <Button
                  aria-label={`Move “${question.title}” earlier`}
                  disabled={index === 0}
                  iconOnly
                  onClick={() => actions.moveQuestion(question._id, -1)}
                  size="xs"
                  variant="ghost"
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  aria-label={`Move “${question.title}” later`}
                  disabled={index === lastIndex}
                  iconOnly
                  onClick={() => actions.moveQuestion(question._id, 1)}
                  size="xs"
                  variant="ghost"
                >
                  <ArrowDown aria-hidden />
                </Button>
              </>
            }
            icon={QUESTION_TYPE_ICONS[question.type]}
            issues={model.issuesByQuestion.get(question._id)}
            key={question._id}
            label={question.title.trim() || "Untitled step"}
            number={index + 1}
            step={{ kind: "question", questionId: question._id }}
          />
        ))}
        {model.endings.map((ending) => (
          <OutlineItem
            icon={FlagCheckered}
            key={ending.id}
            label={ending.title.trim() || "Untitled ending"}
            step={{ endingId: ending.id, kind: "ending" }}
          />
        ))}
      </ol>
      <div className="flex flex-col gap-1 border-t p-2">
        <AddStepPopover
          anchor={reachableInsertAnchor(model, selection)}
          trigger={
            <Button className="justify-start" size="sm" variant="ghost" />
          }
        >
          <Plus aria-hidden />
          Add step
        </AddStepPopover>
        <Button
          className="justify-start"
          onClick={addEnding}
          size="sm"
          variant="ghost"
        >
          <FlagCheckered aria-hidden />
          Add ending
        </Button>
      </div>
    </nav>
  );
}

interface OutlineItemProps {
  actions?: ReactNode;
  icon: Icon;
  issues?: readonly FlowIssue[];
  label: string;
  number?: number;
  step: FlowStepRef;
}

function OutlineItem({
  actions,
  icon: StepIcon,
  issues = [],
  label,
  number,
  step,
}: OutlineItemProps) {
  const selection = useAtomValue(selectedFlowStepAtom);
  const selectStep = useSelectFlowStep();
  const isSelected =
    selection !== null && nodeIdOf(selection) === nodeIdOf(step);
  const hasError = issues.some((issue) => issue.severity === "error");
  const issueSummary = issues.map((issue) => issue.message).join(" ");

  return (
    <li
      className={cn(
        "group flex items-center gap-1 rounded-lg pe-1",
        isSelected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      <button
        aria-current={isSelected ? "step" : undefined}
        className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg ps-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => selectStep(step, { reveal: true })}
        type="button"
      >
        {number === undefined ? null : (
          <span className="w-4 shrink-0 text-end text-muted-foreground text-xs tabular-nums">
            {number}
          </span>
        )}
        <StepIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate">{label}</span>
        {issues.length > 0 ? (
          <span
            className={cn(
              "ms-auto size-2 shrink-0 rounded-full",
              hasError ? "bg-red-500" : "bg-amber-500"
            )}
            title={issueSummary}
          >
            <span className="sr-only">
              {hasError ? "Needs fixing" : "Has a warning"}: {issueSummary}
            </span>
          </span>
        ) : null}
      </button>
      {actions ? (
        <span
          className={cn(
            "flex shrink-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        >
          {actions}
        </span>
      ) : null}
    </li>
  );
}
