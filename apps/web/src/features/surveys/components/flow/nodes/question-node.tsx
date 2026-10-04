"use client";

import { FlowHandle } from "@ctrl-ui/react/ui/flow";
import { textMaxChars } from "@reflet/survey-core";
import { type NodeProps, Position } from "@xyflow/react";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import type { QuestionFlowNode } from "@/features/surveys/components/flow/flow-elements";
import { dropOffPercent } from "@/features/surveys/components/flow/flow-model";
import {
  IssueBadge,
  NodeCard,
  NodeMenu,
  NodeRow,
  NodeSection,
} from "@/features/surveys/components/flow/nodes/node-card";
import { QUESTION_TYPE_LABELS } from "@/features/surveys/lib/constants";
import { scaleRange } from "@/features/surveys/lib/flow/rules";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import type { SurveyQuestion } from "@/store/surveys";

const PREVIEWED_CHOICES = 2;
const RATING_STYLE_LABELS = {
  emoji: "emoji",
  number: "numbers",
  star: "stars",
} as const;

const typeDetail = (
  question: SurveyQuestion
): { label: string; value: string } => {
  const { config } = question;
  switch (question.type) {
    case "nps":
    case "rating": {
      const { max, min } = scaleRange(question);
      const style = config?.ratingStyle
        ? ` · ${RATING_STYLE_LABELS[config.ratingStyle]}`
        : "";
      return { label: "Scale", value: `${min}–${max}${style}` };
    }
    case "single_choice":
    case "multiple_choice": {
      const choices = config?.choices ?? [];
      const hidden = choices.length - PREVIEWED_CHOICES;
      const preview = choices.slice(0, PREVIEWED_CHOICES).join(", ");
      return {
        label: `${choices.length} options`,
        value: hidden > 0 ? `${preview} +${hidden}` : preview,
      };
    }
    case "text":
      return {
        label: "Answer",
        value: `Up to ${textMaxChars(config)} characters`,
      };
    case "boolean":
      return { label: "Answer", value: "Yes or no" };
    default:
      return { label: "Button", value: config?.buttonLabel || "Continue" };
  }
};

export function QuestionNode({ data, selected }: NodeProps<QuestionFlowNode>) {
  const { actions, model, requestDelete } = useFlowEditor();
  const index = model.questions.findIndex((q) => q._id === data.questionId);
  const question = model.questions[index];
  if (!question) {
    return null;
  }
  const title = question.title.trim() || "Untitled step";
  const detail = typeDetail(question);
  const ruleCount = question.logic?.length ?? 0;
  const stats = model.stats?.byQuestion.get(question._id);

  return (
    <div>
      <FlowHandle position={Position.Left} type="target" />
      <NodeCard
        badge={
          <IssueBadge issues={model.issuesByQuestion.get(question._id) ?? []} />
        }
        icon={QUESTION_TYPE_ICONS[question.type]}
        isSelected={selected}
        menu={
          <NodeMenu
            actions={[
              {
                disabled: index === 0,
                label: "Move earlier",
                onSelect: () => actions.moveQuestion(question._id, -1),
              },
              {
                disabled: index === model.questions.length - 1,
                label: "Move later",
                onSelect: () => actions.moveQuestion(question._id, 1),
              },
              {
                isDestructive: true,
                label: "Delete step",
                onSelect: () =>
                  requestDelete({ kind: "question", questionId: question._id }),
              },
            ]}
            stepTitle={title}
          />
        }
        title={title}
      >
        <NodeRow label="Type" value={QUESTION_TYPE_LABELS[question.type]} />
        <NodeRow label={detail.label} value={detail.value} />
        {question.required || ruleCount > 0 ? (
          <div className="flex flex-wrap gap-1">
            {question.required ? <Chip>Required</Chip> : null}
            {ruleCount > 0 ? (
              <Chip>{ruleCount === 1 ? "1 jump" : `${ruleCount} jumps`}</Chip>
            ) : null}
          </div>
        ) : null}
        {stats ? (
          <NodeSection title="So far">
            <NodeRow label="Reached" value={stats.reached} />
            <NodeRow label="Answered" value={stats.answered} />
            <NodeRow label="Dropped off" value={`${dropOffPercent(stats)}%`} />
          </NodeSection>
        ) : null}
      </NodeCard>
      <FlowHandle position={Position.Right} type="source" />
    </div>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-background px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground ring-1 ring-border">
      {children}
    </span>
  );
}
