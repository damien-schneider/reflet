"use client";

import { FlagCheckered } from "@phosphor-icons/react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import type { EndingFlowNode } from "@/features/surveys/components/flow/flow-elements";
import {
  NodeCard,
  NodeMenu,
  NodeRow,
  NodeSection,
} from "@/features/surveys/components/flow/nodes/node-card";

export function EndingNode({ data, selected }: NodeProps<EndingFlowNode>) {
  const { model, requestDelete } = useFlowEditor();
  const ending = model.endings.find(
    (candidate) => candidate.id === data.endingId
  );
  if (!ending) {
    return null;
  }
  const isOnlyEnding = model.endings.length === 1;
  const title = ending.title.trim() || "Untitled ending";

  return (
    <div>
      <Handle position={Position.Left} type="target" />
      <NodeCard
        icon={FlagCheckered}
        isSelected={selected}
        menu={
          <NodeMenu
            actions={[
              {
                disabled: isOnlyEnding,
                isDestructive: true,
                label: "Delete ending",
                onSelect: () =>
                  requestDelete({ endingId: ending.id, kind: "ending" }),
              },
            ]}
            stepTitle={title}
          />
        }
        title={title}
      >
        <p className="line-clamp-2 text-pretty text-muted-foreground">
          {ending.description?.trim() || "No message"}
        </p>
        {ending.buttonLabel ? (
          <NodeRow label="Button" value={ending.buttonLabel} />
        ) : null}
        {model.stats ? (
          <NodeSection title="So far">
            <NodeRow
              label="Finished here"
              value={model.stats.byEnding.get(ending.id) ?? 0}
            />
          </NodeSection>
        ) : null}
      </NodeCard>
    </div>
  );
}
