import type { Edge, Node } from "@xyflow/react";
import { nodeIdOf } from "@/features/surveys/components/flow/flow-context";
import type { FlowModel } from "@/features/surveys/components/flow/flow-model";
import type { InsertAnchor } from "@/features/surveys/components/flow/use-flow-actions";
import type { FlowConnection } from "@/features/surveys/lib/flow/layout";
import type { FlowStepRef, QuestionId } from "@/store/surveys";

export type StartFlowNode = Node<{ kind: "start" }, "start">;
export type QuestionFlowNode = Node<{ questionId: QuestionId }, "question">;
export type EndingFlowNode = Node<{ endingId: string }, "ending">;
export type SurveyFlowNode = StartFlowNode | QuestionFlowNode | EndingFlowNode;
export type StepFlowEdge = Edge<{ connection: FlowConnection }, "step">;

export const buildFlowNodes = (
  model: FlowModel,
  selectedNodeId: string | null
): SurveyFlowNode[] =>
  model.layout.flatMap((layoutNode): SurveyFlowNode[] => {
    const shared = {
      draggable: false,
      id: layoutNode.id,
      position: { x: layoutNode.x, y: layoutNode.y },
      selected: layoutNode.id === selectedNodeId,
    };
    if (layoutNode.kind === "start") {
      return [{ ...shared, data: { kind: "start" }, type: "start" }];
    }
    if (layoutNode.kind === "ending") {
      return [
        { ...shared, data: { endingId: layoutNode.endingId }, type: "ending" },
      ];
    }
    const question = model.questions.find(
      (q) => q._id === layoutNode.questionId
    );
    return question
      ? [{ ...shared, data: { questionId: question._id }, type: "question" }]
      : [];
  });

export const buildFlowEdges = (model: FlowModel): StepFlowEdge[] =>
  model.connections.map((connection) => ({
    data: { connection },
    id: connection.id,
    source: connection.source,
    target: connection.target,
    type: "step",
  }));

/** Where a step added on this connection goes, and which jump must lead to it. */
export const insertAnchorFor = (
  model: Pick<FlowModel, "questions">,
  connection: FlowConnection
): InsertAnchor => {
  if (connection.kind === "start") {
    return { after: null };
  }
  const source = model.questions.find((q) => q._id === connection.source);
  if (!source) {
    return { after: undefined };
  }
  if (connection.kind === "rule") {
    return {
      after: source._id,
      splits: { questionId: source._id, ruleId: connection.rule.id },
    };
  }
  return connection.isExplicit
    ? { after: source._id, splits: { questionId: source._id } }
    : { after: source._id };
};

export const reachableInsertAnchor = (
  model: Pick<FlowModel, "connections" | "questions">,
  selection: FlowStepRef | null
): InsertAnchor => {
  const sourceNodeId =
    selection?.kind === "start" || selection?.kind === "question"
      ? nodeIdOf(selection)
      : model.questions.at(-1)?._id;
  const defaultPath = model.connections.find(
    (connection) =>
      connection.source === sourceNodeId &&
      (connection.kind === "default" || connection.kind === "start")
  );
  return defaultPath
    ? insertAnchorFor(model, defaultPath)
    : { after: undefined };
};

export const stepRefForNode = (
  model: FlowModel,
  nodeId: string
): FlowStepRef | null => {
  const layoutNode = model.layout.find((node) => node.id === nodeId);
  if (!layoutNode) {
    return null;
  }
  if (layoutNode.kind === "start") {
    return { kind: "start" };
  }
  if (layoutNode.kind === "ending") {
    return { endingId: layoutNode.endingId, kind: "ending" };
  }
  const question = model.questions.find((q) => q._id === layoutNode.questionId);
  return question ? { kind: "question", questionId: question._id } : null;
};
