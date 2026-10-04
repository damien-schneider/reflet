"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Trash } from "@phosphor-icons/react";
import { QUESTION_TYPES, takesAnswer } from "@reflet/survey-core";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import { AutosavedField } from "@/features/surveys/components/flow/inspector/autosaved-field";
import { LogicSection } from "@/features/surveys/components/flow/inspector/logic-section";
import { QuestionTypeFields } from "@/features/surveys/components/flow/inspector/question-type-fields";
import {
  type QuestionPatch,
  useUpdateQuestion,
} from "@/features/surveys/components/flow/use-update-question";
import {
  getDefaultConfig,
  QUESTION_TYPE_LABELS,
} from "@/features/surveys/lib/constants";
import type { SurveyQuestion } from "@/store/surveys";

interface QuestionInspectorProps {
  focusedRuleId?: string;
  question: SurveyQuestion;
}

export function QuestionInspector({
  focusedRuleId,
  question,
}: QuestionInspectorProps) {
  const { model, requestDelete } = useFlowEditor();
  const updateQuestion = useUpdateQuestion(model.survey._id);
  const id = useId();
  const issues = model.issuesByQuestion.get(question._id) ?? [];
  const stepIssues = issues.filter((issue) => issue.ruleId === undefined);
  const isStatement = !takesAnswer(question.type);
  const save = (patch: QuestionPatch) => updateQuestion(question._id, patch);

  return (
    <div className="flex flex-col gap-5">
      {stepIssues.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-xl bg-amber-500/10 p-3 text-amber-800 text-xs dark:text-amber-200">
          {stepIssues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      <AutosavedField
        label={isStatement ? "Message" : "Question"}
        multiline
        onSave={(title) => save({ title })}
        saved={question.title}
      />
      <AutosavedField
        label="Description"
        multiline
        onSave={(description) => save({ description })}
        optional
        saved={question.description ?? ""}
      />
      <div className="flex items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${id}-type`}>Type</Label>
          <NativeSelect
            id={`${id}-type`}
            onChange={(event) => {
              const type = QUESTION_TYPES.find(
                (candidate) => candidate === event.target.value
              );
              if (type) {
                save({
                  config: getDefaultConfig(type, question.config?.choices),
                  type,
                });
              }
            }}
            size="sm"
            value={question.type}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </div>
        {isStatement ? null : (
          <div className="flex h-8 items-center gap-2">
            <Switch
              checked={question.required}
              id={`${id}-required`}
              onCheckedChange={(required) => save({ required })}
            />
            <Label htmlFor={`${id}-required`}>Required</Label>
          </div>
        )}
      </div>
      <QuestionTypeFields onSave={save} question={question} />
      <hr className="border-border" />
      <LogicSection
        endings={model.endings}
        focusedRuleId={focusedRuleId}
        issues={issues}
        question={question}
        questions={model.questions}
        surveyId={model.survey._id}
      />
      <hr className="border-border" />
      <Button
        className="self-start"
        onClick={() =>
          requestDelete({ kind: "question", questionId: question._id })
        }
        size="sm"
        tone="danger"
        variant="ghost"
      >
        <Trash aria-hidden />
        Delete step
      </Button>
    </div>
  );
}
