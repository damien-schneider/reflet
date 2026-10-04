"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { FlagCheckered, type Icon, Lightning, X } from "@phosphor-icons/react";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import {
  useFlowEditor,
  useSelectFlowStep,
} from "@/features/surveys/components/flow/flow-context";
import { EndingInspector } from "@/features/surveys/components/flow/inspector/ending-inspector";
import { QuestionInspector } from "@/features/surveys/components/flow/inspector/question-inspector";
import { triggerSummary } from "@/features/surveys/components/flow/nodes/start-node";
import { QUESTION_TYPE_LABELS } from "@/features/surveys/lib/constants";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import { selectedFlowStepAtom } from "@/store/surveys";

interface InspectorView {
  body: ReactNode;
  icon: Icon;
  key: string;
  title: string;
}

function useInspectorView(): InspectorView | null {
  const selection = useAtomValue(selectedFlowStepAtom);
  const { model, onEditTrigger } = useFlowEditor();
  if (selection?.kind === "start") {
    return {
      body: (
        <div className="flex flex-col gap-4">
          <p className="text-pretty text-muted-foreground text-sm">
            {triggerSummary(
              model.survey.triggerType,
              model.survey.triggerConfig
            )}
            . Choose when the survey appears, who sees it and how often in
            Settings.
          </p>
          <Button
            className="self-start"
            onClick={onEditTrigger}
            size="sm"
            variant="surface"
          >
            Edit trigger and audience
          </Button>
        </div>
      ),
      icon: Lightning,
      key: "start",
      title: "Start",
    };
  }
  if (selection?.kind === "ending") {
    const ending = model.endings.find(
      (candidate) => candidate.id === selection.endingId
    );
    return ending
      ? {
          body: <EndingInspector ending={ending} />,
          icon: FlagCheckered,
          key: ending.id,
          title: "Ending",
        }
      : null;
  }
  if (selection?.kind === "question") {
    const index = model.questions.findIndex(
      (q) => q._id === selection.questionId
    );
    const question = model.questions[index];
    return question
      ? {
          body: (
            <QuestionInspector
              focusedRuleId={selection.ruleId}
              question={question}
            />
          ),
          icon: QUESTION_TYPE_ICONS[question.type],
          key: question._id,
          title: `Step ${index + 1} · ${QUESTION_TYPE_LABELS[question.type]}`,
        }
      : null;
  }
  return null;
}

export function StepInspector() {
  const view = useInspectorView();
  const selectStep = useSelectFlowStep();
  if (!view) {
    return null;
  }
  const { body, icon: ViewIcon, key, title } = view;

  return (
    <aside
      aria-label={`${title} settings`}
      className="flex w-[22rem] shrink-0 flex-col border-s bg-background"
    >
      <header className="flex items-center gap-2 border-b py-2 ps-4 pe-2">
        <ViewIcon aria-hidden className="size-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate font-medium text-sm">{title}</h2>
        <Button
          aria-label="Close step settings"
          iconOnly
          onClick={() => selectStep(null)}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" key={key}>
        {body}
      </div>
    </aside>
  );
}
