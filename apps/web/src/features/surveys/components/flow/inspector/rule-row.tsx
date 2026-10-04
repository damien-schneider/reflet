"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import { Trash } from "@phosphor-icons/react";
import {
  type LogicOperator,
  OPERATORS_BY_TYPE,
  operatorTakesValue,
  type RuleValue,
} from "@reflet/survey-core";
import { useEffect, useId, useRef } from "react";
import { useAutosavedText } from "@/features/surveys/components/flow/inspector/autosaved-field";
import {
  defaultRuleValue,
  operatorLabel,
  type RuleValueOption,
  ruleValueOptions,
} from "@/features/surveys/lib/flow/rules";
import type {
  QuestionRule,
  QuestionTarget,
  SurveyQuestion,
} from "@/store/surveys";

export interface TargetOption {
  group: "Endings" | "Later steps";
  key: string;
  label: string;
  target: QuestionTarget;
}

export const targetKey = (target: QuestionTarget): string =>
  target.kind === "question"
    ? `question:${target.questionId}`
    : `ending:${target.endingId}`;

interface RuleRowProps {
  index: number;
  isFocused: boolean;
  issue?: string;
  onChange: (rule: QuestionRule) => void;
  onRemove: () => void;
  question: SurveyQuestion;
  rule: QuestionRule;
  targetOptions: readonly TargetOption[];
}

export function RuleRow({
  index,
  isFocused,
  issue,
  onChange,
  onRemove,
  question,
  rule,
  targetOptions,
}: RuleRowProps) {
  const operatorRef = useRef<HTMLSelectElement>(null);
  const targetId = useId();
  const operators = OPERATORS_BY_TYPE[question.type];
  const valueOptions = ruleValueOptions(question);
  const position = `jump ${index + 1}`;

  useEffect(() => {
    if (isFocused) {
      operatorRef.current?.scrollIntoView({ block: "nearest" });
      operatorRef.current?.focus();
    }
  }, [isFocused]);

  const changeOperator = (operator: LogicOperator) => {
    const { value: _previous, ...withoutValue } = rule;
    const keepsValue =
      operatorTakesValue(operator) && operatorTakesValue(rule.operator);
    const value = keepsValue
      ? rule.value
      : defaultRuleValue(question, operator);
    onChange({
      ...withoutValue,
      operator,
      ...(value === undefined ? {} : { value }),
    });
  };

  const changeTarget = (key: string) => {
    const option = targetOptions.find((candidate) => candidate.key === key);
    if (option) {
      onChange({ ...rule, target: option.target });
    }
  };

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3",
        isFocused && "border-primary/60",
        issue && "border-red-500/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          If the answer
        </span>
        <Button
          aria-label={`Remove ${position}`}
          iconOnly
          onClick={onRemove}
          size="xs"
          variant="ghost"
        >
          <Trash aria-hidden />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NativeSelect
          aria-label={`Condition for ${position}`}
          className={
            operatorTakesValue(rule.operator) ? undefined : "col-span-2"
          }
          onChange={(event) => {
            const operator = operators.find(
              (candidate) => candidate === event.target.value
            );
            if (operator) {
              changeOperator(operator);
            }
          }}
          ref={operatorRef}
          size="sm"
          value={rule.operator}
        >
          {operators.map((operator) => (
            <option key={operator} value={operator}>
              {operatorLabel(question.type, operator)}
            </option>
          ))}
        </NativeSelect>
        {operatorTakesValue(rule.operator) ? (
          <RuleValueField
            label={`Value for ${position}`}
            onChange={(value) => onChange({ ...rule, value })}
            options={valueOptions}
            rule={rule}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label
          className="font-medium text-muted-foreground text-xs"
          htmlFor={targetId}
        >
          Go to
        </label>
        <NativeSelect
          id={targetId}
          onChange={(event) => changeTarget(event.target.value)}
          size="sm"
          value={targetKey(rule.target)}
        >
          <TargetOptionGroups options={targetOptions} />
        </NativeSelect>
      </div>
      {issue ? (
        <p className="text-red-700 text-xs dark:text-red-300">{issue}</p>
      ) : null}
    </li>
  );
}

interface RuleValueFieldProps {
  label: string;
  onChange: (value: RuleValue) => void;
  options: RuleValueOption[] | null;
  rule: QuestionRule;
}

function RuleValueField({
  label,
  onChange,
  options,
  rule,
}: RuleValueFieldProps) {
  const text = useAutosavedText(
    typeof rule.value === "string" ? rule.value : "",
    onChange
  );
  if (options === null) {
    return (
      <Input
        aria-label={label}
        onBlur={text.onBlur}
        onChange={(event) => text.onChange(event.target.value)}
        placeholder="Text to look for"
        size="sm"
        value={text.value}
      />
    );
  }
  const selectedIndex = options.findIndex(
    (option) => option.value === rule.value
  );
  return (
    <NativeSelect
      aria-label={label}
      onChange={(event) => {
        const option = options[Number(event.target.value)];
        if (option) {
          onChange(option.value);
        }
      }}
      size="sm"
      value={selectedIndex === -1 ? "" : String(selectedIndex)}
    >
      {selectedIndex === -1 ? (
        <option disabled value="">
          Pick a value
        </option>
      ) : null}
      {options.map((option, optionIndex) => (
        <option key={option.label} value={String(optionIndex)}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function TargetOptionGroups({
  options,
}: {
  options: readonly TargetOption[];
}) {
  const groups = ["Later steps", "Endings"] as const;
  return groups.map((group) => {
    const inGroup = options.filter((option) => option.group === group);
    return inGroup.length > 0 ? (
      <optgroup key={group} label={group}>
        {inGroup.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </optgroup>
    ) : null;
  });
}
