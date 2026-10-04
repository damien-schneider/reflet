"use client";

import {
  Flow,
  FlowBackground,
  FlowControls,
  FlowPanel,
} from "@ctrl-ui/react/ui/flow";
import {
  type Connection,
  type EdgeTypes,
  type FitViewOptions,
  type NodeChange,
  type NodeTypes,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { useAtom, useAtomValue } from "jotai";
import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useState } from "react";
import { CanvasToolbar } from "@/features/surveys/components/flow/canvas-toolbar";
import {
  nodeIdOf,
  useFlowEditor,
  useSelectFlowStep,
} from "@/features/surveys/components/flow/flow-context";
import {
  buildFlowEdges,
  buildFlowNodes,
  type StepFlowEdge,
  type SurveyFlowNode,
  stepRefForNode,
} from "@/features/surveys/components/flow/flow-elements";
import { EndingNode } from "@/features/surveys/components/flow/nodes/ending-node";
import { QuestionNode } from "@/features/surveys/components/flow/nodes/question-node";
import { StartNode } from "@/features/surveys/components/flow/nodes/start-node";
import { StepEdge } from "@/features/surveys/components/flow/nodes/step-edge";
import { flowRevealRequestAtom, selectedFlowStepAtom } from "@/store/surveys";

const NODE_TYPES: NodeTypes = {
  ending: EndingNode,
  question: QuestionNode,
  start: StartNode,
};

const EDGE_TYPES: EdgeTypes = { step: StepEdge };

const REVEAL_DURATION_MS = 300;
const REVEAL_PADDING = 0.8;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const FIT_VIEW_OPTIONS: FitViewOptions = { maxZoom: 1, padding: 0.15 };

type MeasuredSizes = Record<string, { height: number; width: number }>;

const isTypingTarget = (target: EventTarget) =>
  target instanceof HTMLElement &&
  target.closest("input, textarea, select, [contenteditable='true']") !== null;

const afterInspectorResizesCanvas = (callback: () => void) => {
  let secondFrame = 0;
  const firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(callback);
  });
  return () => {
    cancelAnimationFrame(firstFrame);
    cancelAnimationFrame(secondFrame);
  };
};

export function FlowCanvas() {
  const { actions, model, requestDelete } = useFlowEditor();
  const selection = useAtomValue(selectedFlowStepAtom);
  const [revealRequest, setRevealRequest] = useAtom(flowRevealRequestAtom);
  const selectStep = useSelectFlowStep();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const reducesMotion = useReducedMotion();
  const [measuredSizes, setMeasuredSizes] = useState<MeasuredSizes>({});

  const nodes = buildFlowNodes(
    model,
    selection ? nodeIdOf(selection) : null
  ).map(
    (node): SurveyFlowNode => ({ ...node, measured: measuredSizes[node.id] })
  );
  const edges: StepFlowEdge[] = buildFlowEdges(model);

  useEffect(() => {
    if (!(revealRequest && nodesInitialized)) {
      return;
    }
    return afterInspectorResizesCanvas(() => {
      fitView({
        duration: reducesMotion ? 0 : REVEAL_DURATION_MS,
        maxZoom: 1,
        nodes: [{ id: revealRequest }],
        padding: REVEAL_PADDING,
      });
      setRevealRequest(null);
    });
  }, [
    fitView,
    nodesInitialized,
    reducesMotion,
    revealRequest,
    setRevealRequest,
  ]);

  const handleNodesChange = (changes: NodeChange<SurveyFlowNode>[]) => {
    const resized: MeasuredSizes = {};
    for (const change of changes) {
      if (change.type === "dimensions" && change.dimensions) {
        resized[change.id] = change.dimensions;
      }
      if (change.type === "select" && change.selected) {
        selectStep(stepRefForNode(model, change.id));
      }
    }
    if (Object.keys(resized).length > 0) {
      setMeasuredSizes((sizes) => ({ ...sizes, ...resized }));
    }
  };

  const handleConnect = async ({ source, target }: Connection) => {
    const connected = await actions.connect(source, target);
    if (connected) {
      selectStep(connected);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const pressedDelete = event.key === "Delete" || event.key === "Backspace";
    const deletableStep = selection?.kind === "start" ? null : selection;
    if (pressedDelete && deletableStep && !isTypingTarget(event.target)) {
      event.preventDefault();
      requestDelete(deletableStep);
    }
  };

  return (
    <Flow<SurveyFlowNode, StepFlowEdge>
      deleteKeyCode={null}
      edges={edges}
      edgeTypes={EDGE_TYPES}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      maxZoom={MAX_ZOOM}
      minZoom={MIN_ZOOM}
      nodes={nodes}
      nodesDraggable={false}
      nodeTypes={NODE_TYPES}
      onConnect={handleConnect}
      onEdgeClick={(_, edge) => {
        const { connection } = edge.data ?? {};
        const source = model.questions.find(
          (q) => q._id === connection?.source
        );
        if (source && connection?.kind === "rule") {
          selectStep({
            kind: "question",
            questionId: source._id,
            ruleId: connection.rule.id,
          });
        }
      }}
      onKeyDown={handleKeyDown}
      onNodesChange={handleNodesChange}
      onPaneClick={() => selectStep(null)}
    >
      <FlowBackground />
      <FlowControls fitViewOptions={FIT_VIEW_OPTIONS} position="bottom-left" />
      <FlowPanel position="top-left">
        <CanvasToolbar />
      </FlowPanel>
    </Flow>
  );
}
