"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { ReactFlowProvider } from "@xyflow/react";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { FlowCanvas } from "@/features/surveys/components/flow/flow-canvas";
import {
  FlowEditorContext,
  type FlowEditorValue,
  useClearFlowSelectionOnUnmount,
  useSelectFlowStep,
} from "@/features/surveys/components/flow/flow-context";
import {
  buildFlowModel,
  type FlowModel,
  type FlowSurvey,
} from "@/features/surveys/components/flow/flow-model";
import { PreviewPanel } from "@/features/surveys/components/flow/panels/preview-panel";
import { StepInspector } from "@/features/surveys/components/flow/panels/step-inspector";
import { StepsOutline } from "@/features/surveys/components/flow/panels/steps-outline";
import { useFlowActions } from "@/features/surveys/components/flow/use-flow-actions";
import {
  type FlowStepRef,
  flowOutlineOpenAtom,
  flowPreviewOpenAtom,
} from "@/store/surveys";

type DeletableStep = Exclude<FlowStepRef, { kind: "start" }>;

interface PendingDelete {
  answers: number;
  step: DeletableStep;
  title: string;
}

const describeDeletion = (
  model: FlowModel,
  step: DeletableStep
): PendingDelete | null => {
  if (step.kind === "question") {
    const question = model.questions.find((q) => q._id === step.questionId);
    return question
      ? {
          answers: model.stats?.byQuestion.get(question._id)?.answered ?? 0,
          step,
          title: question.title.trim() || "Untitled step",
        }
      : null;
  }
  const ending = model.endings.find(
    (candidate) => candidate.id === step.endingId
  );
  return ending && model.endings.length > 1
    ? {
        answers: model.stats?.byEnding.get(ending.id) ?? 0,
        step,
        title: ending.title.trim() || "Untitled ending",
      }
    : null;
};

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const deletionWarning = ({ answers, step }: PendingDelete): string =>
  step.kind === "ending"
    ? `${plural(answers, "response")} finished here. Jumps to this ending will be removed; those responses keep their history.`
    : `Its ${plural(answers, "recorded answer")} will be deleted, and jumps to it will be removed. This can’t be undone.`;

interface SurveyFlowEditorProps {
  onEditTrigger: () => void;
  stepsOutlineContainer: HTMLElement | null;
  survey: FlowSurvey;
}

function placeStepsOutline(container: HTMLElement | null) {
  return container ? (
    createPortal(<StepsOutline className="flex-1 border-t" />, container)
  ) : (
    <StepsOutline className="w-64 shrink-0 border-e bg-background" />
  );
}

/** The Flow tab: steps outline, canvas, live preview and the selected step's inspector. */
export function SurveyFlowEditor({
  onEditTrigger,
  stepsOutlineContainer,
  survey,
}: SurveyFlowEditorProps) {
  const analytics = useQuery(
    api.surveys.analytics.getAnalytics,
    survey.responseCount > 0 ? { surveyId: survey._id } : "skip"
  );
  const model = buildFlowModel(survey, analytics);
  const actions = useFlowActions(model);
  const selectStep = useSelectFlowStep();
  useClearFlowSelectionOnUnmount();
  const isOutlineOpen = useAtomValue(flowOutlineOpenAtom);
  const isPreviewOpen = useAtomValue(flowPreviewOpenAtom);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  const deleteStep = async (step: DeletableStep) => {
    const deleted =
      step.kind === "question"
        ? await actions.removeQuestion(step.questionId)
        : await actions.saveEndings(
            model.endings.filter((ending) => ending.id !== step.endingId)
          );
    if (deleted) {
      selectStep(null);
    }
  };

  const editor: FlowEditorValue = {
    actions,
    model,
    onEditTrigger,
    requestDelete: (step) => {
      if (step.kind === "start") {
        return;
      }
      const deletion = describeDeletion(model, step);
      if (!deletion) {
        return;
      }
      if (deletion.answers > 0) {
        setPendingDelete(deletion);
      } else {
        deleteStep(step);
      }
    },
  };

  return (
    <FlowEditorContext value={editor}>
      <ReactFlowProvider>
        <div className="flex min-h-0 flex-1 border-t">
          {isOutlineOpen ? placeStepsOutline(stepsOutlineContainer) : null}
          <div className="relative min-w-0 flex-1">
            <FlowCanvas />
            {isPreviewOpen ? <PreviewPanel /> : null}
          </div>
          <StepInspector />
        </div>
      </ReactFlowProvider>
      <DestructiveConfirmDialog
        confirmLabel={
          pendingDelete?.step.kind === "ending"
            ? "Delete ending"
            : "Delete step"
        }
        description={pendingDelete ? deletionWarning(pendingDelete) : null}
        onConfirm={() => {
          if (pendingDelete) {
            deleteStep(pendingDelete.step);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        title={`Delete “${pendingDelete?.title ?? ""}”?`}
      />
    </FlowEditorContext>
  );
}
