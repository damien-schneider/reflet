"use client";

import type { FlowKnobStyle } from "@ctrl-ui/react/knob-contracts/flow-knobs";
import { cn } from "@ctrl-ui/react/lib/cn";
import {
  FlowEdge,
  FlowEdgeLabel,
  FlowEdgeLabelChip,
} from "@ctrl-ui/react/ui/flow";
import { Plus } from "@phosphor-icons/react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";
import { AddStepPopover } from "@/features/surveys/components/flow/add-step/add-step-popover";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import {
  insertAnchorFor,
  type StepFlowEdge,
} from "@/features/surveys/components/flow/flow-elements";
import { endingNodeId } from "@/features/surveys/lib/flow/layout";
import { describeRule } from "@/features/surveys/lib/flow/rules";

const BRANCH_PALETTE_SIZE = 5;

const branchKnobs = (ruleIndex: number): FlowKnobStyle => {
  const chart = `--chart-${(ruleIndex % BRANCH_PALETTE_SIZE) + 1}`;
  return {
    "--cui-flow-edge-label-border-color": `oklch(from var(${chart}) l c h / 0.4)`,
    "--cui-flow-edge-label-foreground": `var(${chart}-text)`,
    "--cui-flow-edge-stroke": `var(${chart})`,
  };
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
  const knobs =
    connection.kind === "rule" ? branchKnobs(connection.ruleIndex) : undefined;

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
      <FlowEdge dashed={endsSurvey} id={id} path={path} style={knobs} />
      <FlowEdgeLabel style={knobs} x={labelX} y={labelY}>
        {label ? (
          <FlowEdgeLabelChip title={label}>{label}</FlowEdgeLabelChip>
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
      </FlowEdgeLabel>
    </>
  );
}
