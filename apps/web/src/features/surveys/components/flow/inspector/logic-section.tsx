"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  type FlowIssue,
  resolveNextStep,
  type SurveyEnding,
  takesAnswer,
} from "@reflet/survey-core";
import { useId } from "react";
import {
  RuleRow,
  type TargetOption,
  TargetOptionGroups,
  targetKey,
} from "@/features/surveys/components/flow/inspector/rule-row";
import { useUpdateQuestion } from "@/features/surveys/components/flow/use-update-question";
import { newRule } from "@/features/surveys/lib/flow/rules";
import type { QuestionRule, SurveyQuestion } from "@/store/surveys";

const FOLLOWING_STEP_KEY = "following";

interface LogicSectionProps {
  endings: readonly SurveyEnding[];
  focusedRuleId?: string;
  issues?: readonly FlowIssue[];
  question: SurveyQuestion;
  questions: readonly SurveyQuestion[];
  surveyId: Id<"surveys">;
}

/** “If the answer … go to …” jumps plus where the step leads otherwise. Jumps only go forward. */
export function LogicSection({
  endings,
  focusedRuleId,
  issues = [],
  question,
  questions,
  surveyId,
}: LogicSectionProps) {
  const saveQuestion = useUpdateQuestion(surveyId);
  const otherwiseId = useId();
  const rules = question.logic ?? [];
  const acceptsRules = takesAnswer(question.type);

  const targetOptions: TargetOption[] = [
    ...questions
      .filter((candidate) => candidate.order > question.order)
      .map(
        (candidate): TargetOption => ({
          group: "Later steps",
          key: targetKey({ kind: "question", questionId: candidate._id }),
          label: `${candidate.order + 1}. ${candidate.title.trim() || "Untitled step"}`,
          target: { kind: "question", questionId: candidate._id },
        })
      ),
    ...endings.map(
      (ending): TargetOption => ({
        group: "Endings",
        key: targetKey({ endingId: ending.id, kind: "ending" }),
        label: ending.title.trim() || "Untitled ending",
        target: { endingId: ending.id, kind: "ending" },
      })
    ),
  ];

  const following = resolveNextStep(
    questions,
    { ...question, logic: [], next: undefined },
    undefined,
    endings
  );
  const followingLabel =
    following.kind === "question"
      ? `Next step (${following.question.title.trim() || "Untitled step"})`
      : `Next step (${following.ending.title})`;

  const saveRules = (logic: QuestionRule[]) =>
    saveQuestion(question._id, { logic });

  const addRule = () => {
    const [firstOption] = targetOptions;
    if (firstOption) {
      saveRules([...rules, newRule(question, firstOption.target)]);
    }
  };

  const changeOtherwise = (key: string) => {
    const option = targetOptions.find((candidate) => candidate.key === key);
    saveQuestion(question._id, { next: option ? option.target : null });
  };

  return (
    <section
      aria-labelledby={`${otherwiseId}-heading`}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium text-sm" id={`${otherwiseId}-heading`}>
          Logic
        </h3>
        <p className="text-pretty text-muted-foreground text-xs">
          {acceptsRules
            ? "Send people to a later step or an ending based on their answer. The first matching jump wins."
            : "Statements don’t collect answers, so they always continue to the same place."}
        </p>
      </div>
      {acceptsRules && rules.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {rules.map((rule, index) => (
            <RuleRow
              index={index}
              isFocused={rule.id === focusedRuleId}
              issue={issues.find((issue) => issue.ruleId === rule.id)?.message}
              key={rule.id}
              onChange={(changed) =>
                saveRules(
                  rules.map((candidate) =>
                    candidate.id === rule.id ? changed : candidate
                  )
                )
              }
              onRemove={() =>
                saveRules(rules.filter((candidate) => candidate.id !== rule.id))
              }
              question={question}
              rule={rule}
              targetOptions={targetOptions}
            />
          ))}
        </ol>
      ) : null}
      {acceptsRules ? (
        <Button
          className="self-start"
          onClick={addRule}
          size="sm"
          variant="surface"
        >
          <Plus aria-hidden />
          Add jump
        </Button>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor={otherwiseId}>
          {acceptsRules ? "Otherwise go to" : "Then go to"}
        </label>
        <NativeSelect
          id={otherwiseId}
          onChange={(event) => changeOtherwise(event.target.value)}
          size="sm"
          value={question.next ? targetKey(question.next) : FOLLOWING_STEP_KEY}
        >
          <option value={FOLLOWING_STEP_KEY}>{followingLabel}</option>
          <TargetOptionGroups options={targetOptions} />
        </NativeSelect>
      </div>
    </section>
  );
}
