"use client";

import { useSetAtom } from "jotai";
import { createContext, use } from "react";
import type { FlowModel } from "@/features/surveys/components/flow/flow-model";
import type { FlowActions } from "@/features/surveys/components/flow/use-flow-actions";
import {
  endingNodeId,
  START_NODE_ID,
} from "@/features/surveys/lib/flow/layout";
import {
  type FlowStepRef,
  flowRevealRequestAtom,
  selectedFlowStepAtom,
} from "@/store/surveys";

export interface FlowEditorValue {
  actions: FlowActions;
  model: FlowModel;
  onEditTrigger: () => void;
  requestDelete: (step: FlowStepRef) => void;
}

export const FlowEditorContext = createContext<FlowEditorValue | null>(null);

export function useFlowEditor(): FlowEditorValue {
  const value = use(FlowEditorContext);
  if (!value) {
    throw new Error("useFlowEditor must be used inside SurveyFlowEditor.");
  }
  return value;
}

export const nodeIdOf = (step: FlowStepRef): string => {
  if (step.kind === "start") {
    return START_NODE_ID;
  }
  return step.kind === "question"
    ? step.questionId
    : endingNodeId(step.endingId);
};

/** Selects a step for the inspector; `reveal` also pans the canvas to it. */
export function useSelectFlowStep() {
  const setSelected = useSetAtom(selectedFlowStepAtom);
  const setRevealRequest = useSetAtom(flowRevealRequestAtom);
  return (step: FlowStepRef | null, { reveal = false } = {}) => {
    setSelected(step);
    if (step && reveal) {
      setRevealRequest(nodeIdOf(step));
    }
  };
}
