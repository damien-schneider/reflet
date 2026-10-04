"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Plus } from "@phosphor-icons/react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { AddStepPopover } from "@/features/surveys/components/flow/add-step/add-step-popover";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import {
  insertAnchorFor,
  type StepFlowEdge,
} from "@/features/surveys/components/flow/flow-elements";
import { endingNodeId } from "@/features/surveys/lib/flow/layout";
import { describeRule } from "@/features/surveys/lib/flow/rules";

const NEUTRAL_BRANCH_COLORS = [
  {
    chip: "text-sky-700 ring-sky-500/40 dark:text-sky-300",
    stroke: "var(--color-sky-500)",
  },
  {
    chip: "text-violet-700 ring-violet-500/40 dark:text-violet-300",
    stroke: "var(--color-violet-500)",
  },
  {
    chip: "text-amber-700 ring-amber-500/40 dark:text-amber-300",
    stroke: "var(--color-amber-500)",
  },
  {
    chip: "text-teal-700 ring-teal-500/40 dark:text-teal-300",
    stroke: "var(--color-teal-500)",
  },
  {
    chip: "text-fuchsia-700 ring-fuchsia-500/40 dark:text-fuchsia-300",
    stroke: "var(--color-fuchsia-500)",
  },
] as const;

const DEFAULT_COLOR = {
  chip: "text-muted-foreground ring-border",
  stroke: "color-mix(in oklab, var(--muted-foreground) 70%, transparent)",
};

export function StepEdge({
  data,
  id,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<StepFlowEdge>) {
  const { model } = useFlowEditor();
  const [path, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });
  if (!data) {
    return null;
  }
  const { connection } = data;
  const source = model.questions.find((q) => q._id === connection.source);
  const target = model.questions.find((q) => q._id === connection.target);
  const endsSurvey = model.endings.some(
    (ending) => endingNodeId(ending.id) === connection.target
  );
  const color =
    connection.kind === "rule"
      ? (NEUTRAL_BRANCH_COLORS[
          connection.ruleIndex % NEUTRAL_BRANCH_COLORS.length
        ] ?? DEFAULT_COLOR)
      : DEFAULT_COLOR;

  let label: string | null = null;
  if (connection.kind === "rule" && source) {
    label = describeRule(connection.rule, source);
  } else if (
    connection.kind === "default" &&
    (source?.logic?.length ?? 0) > 0
  ) {
    label = "Otherwise";
  }

  const sourceTitle = source ? `“${source.title}”` : "Start";
  const placement = target
    ? `between ${sourceTitle} and “${target.title}”`
    : `after ${sourceTitle}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color.stroke,
          strokeDasharray: endsSurvey ? "5 5" : undefined,
          strokeWidth: 1.75,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {label ? (
            <span
              className={cn(
                "max-w-40 truncate rounded-full bg-card px-2 py-0.5 font-medium text-[11px] ring-1",
                color.chip
              )}
              title={label}
            >
              {label}
            </span>
          ) : null}
          <AddStepPopover
            anchor={insertAnchorFor(model, connection)}
            trigger={
              <button
                aria-label={`Add a step ${placement}`}
                className={cn(
                  "grid size-5 place-items-center rounded-full border bg-card text-muted-foreground shadow-xs",
                  "transition-colors duration-150 hover:border-foreground/30 hover:text-foreground motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-ring"
                )}
                type="button"
              />
            }
          >
            <Plus aria-hidden className="size-3" weight="bold" />
          </AddStepPopover>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
