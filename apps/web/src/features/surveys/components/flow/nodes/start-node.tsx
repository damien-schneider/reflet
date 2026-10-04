"use client";

import { Lightning } from "@phosphor-icons/react";
import type { TriggerConfig, TriggerType } from "@reflet/survey-core";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import type { StartFlowNode } from "@/features/surveys/components/flow/flow-elements";
import {
  NodeCard,
  NodeMenu,
  NodeRow,
  NodeSection,
} from "@/features/surveys/components/flow/nodes/node-card";
import { TRIGGER_LABELS } from "@/features/surveys/lib/constants";

const MS_PER_SECOND = 1000;
const FULL_AUDIENCE_PERCENT = 100;

/** The trigger in a few words, e.g. “Page visit · /pricing”. */
export const triggerSummary = (
  triggerType: TriggerType,
  triggerConfig: TriggerConfig | undefined
): string => {
  const label = TRIGGER_LABELS[triggerType];
  if (triggerType === "page_visit" && triggerConfig?.pageUrl) {
    return `${label} · ${triggerConfig.pageUrl}`;
  }
  if (triggerType === "time_delay" && triggerConfig?.delayMs !== undefined) {
    return `${label} · ${Math.round(triggerConfig.delayMs / MS_PER_SECOND)} s`;
  }
  if (triggerType === "event" && triggerConfig?.eventName) {
    return `${label} · ${triggerConfig.eventName}`;
  }
  return label;
};

export function StartNode({ selected }: NodeProps<StartFlowNode>) {
  const { model, onEditTrigger } = useFlowEditor();
  const { triggerConfig, triggerType } = model.survey;
  const sampleRate = triggerConfig?.sampleRate ?? FULL_AUDIENCE_PERCENT;

  return (
    <div className="relative">
      <span className="absolute -top-7 left-0 rounded-md bg-foreground px-2 py-0.5 font-medium text-background text-xs">
        Start
      </span>
      <NodeCard
        icon={Lightning}
        isSelected={selected}
        menu={
          <NodeMenu
            actions={[{ label: "Edit trigger", onSelect: onEditTrigger }]}
            stepTitle="Start"
          />
        }
        title={triggerSummary(triggerType, triggerConfig)}
      >
        <NodeRow label="Trigger" value={TRIGGER_LABELS[triggerType]} />
        <NodeRow
          label="Audience"
          value={
            sampleRate >= FULL_AUDIENCE_PERCENT
              ? "Everyone"
              : `${sampleRate}% of visitors`
          }
        />
        {model.stats ? (
          <NodeSection title="So far">
            <NodeRow label="Started" value={model.stats.started} />
          </NodeSection>
        ) : null}
      </NodeCard>
      <Handle isConnectable={false} position={Position.Right} type="source" />
    </div>
  );
}
